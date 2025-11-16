import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export const EmailVerificationPrompt: React.FC = () => {
  const { t } = useTranslation();
  const { user, requestEmailVerification, confirmEmailVerification } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSentCode, setHasSentCode] = useState(false);

  if (!user || user.emailVerified) {
    return null;
  }

  const handleSendCode = async () => {
    try {
      setIsSending(true);
      setError(null);
      const message = await requestEmailVerification();
      toast.success(t('common.success'), message || t('auth.emailVerification.sendSuccess'));
      setHasSentCode(true);
    } catch (sendErr) {
      const message = sendErr instanceof Error ? sendErr.message : t('auth.emailVerification.sendFailed');
      toast.error(t('common.failed'), message);
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmCode = async () => {
    const sanitizedCode = code.trim();
    if (sanitizedCode.length < 6) {
      setError(t('auth.emailVerification.codeRequired'));
      return;
    }

    try {
      setIsConfirming(true);
      setError(null);
      const message = await confirmEmailVerification(sanitizedCode);
      toast.success(t('common.success'), message || t('auth.emailVerification.verifySuccess'));
      setCode('');
    } catch (confirmErr) {
      const message = confirmErr instanceof Error ? confirmErr.message : t('auth.emailVerification.verifyFailed');
      setError(message);
      toast.error(t('common.failed'), message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl bg-white rounded-2xl shadow p-8">
      <div className="">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-center text-2xl font-semibold text-gray-900 mb-2">
          {t('auth.emailVerificationPrompt.title')}
        </h1>
        <p className="text-gray-600">
          {t('auth.emailVerificationPrompt.description', { email: user.email })}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={handleSendCode}
          disabled={isSending}
          className="w-full inline-flex items-center justify-center rounded-lg bg-tiris-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-tiris-primary-700 disabled:opacity-60"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.emailVerificationPrompt.sending')}
            </>
          ) : (
            hasSentCode ? t('auth.emailVerificationPrompt.resend') : t('auth.emailVerificationPrompt.send')
          )}
        </button>

        {hasSentCode && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('auth.emailVerificationPrompt.codeLabel')}
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(value);
                    }}
                    placeholder={t('auth.emailVerificationPrompt.placeholder')}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-tiris-primary-500 focus:outline-none focus:ring-2 focus:ring-tiris-primary-100"
                    disabled={isConfirming}
                  />
                  <Shield className="pointer-events-none absolute inset-y-0 right-3 my-auto h-4 w-4 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={handleConfirmCode}
                  disabled={isConfirming}
                  className="inline-flex items-center justify-center rounded-lg bg-tiris-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-tiris-primary-700 disabled:opacity-60"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.emailVerificationPrompt.verifying')}
                    </>
                  ) : (
                    t('auth.emailVerificationPrompt.submit')
                  )}
                </button>
              </div>
            </label>
            <p className="mt-2 text-sm text-gray-500">
              {t('auth.emailVerificationPrompt.helper')}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPrompt;
