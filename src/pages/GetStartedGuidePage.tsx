import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Link2, PlayCircle, Rocket, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getExchangeBindings, getTradings } from '../utils/api';

type GuideTaskId =
  | 'reviewPerformance'
  | 'signIn'
  | 'runBacktest'
  | 'startPaperTrade'
  | 'linkExchange'
  | 'launchLiveTrade';

interface GuideTask {
  id: GuideTaskId;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  requiresAuth?: boolean;
  accentFrom: string;
  accentTo: string;
  icon: React.ElementType;
}

const INFO_KEY = 'get_started_progress';
const METRICS_COOKIE_KEY = 'tiris_metrics_reviewed';

const readMetricsCookie = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry === `${METRICS_COOKIE_KEY}=1`);
};

const writeMetricsCookie = (value: boolean) => {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${METRICS_COOKIE_KEY}=${value ? '1' : '0'}; path=/; max-age=${value ? maxAge : 0}; SameSite=Lax`;
};

export const GetStartedGuidePage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, updateUserInfo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [reviewComplete, setReviewComplete] = useState(false);
  const [hasBacktest, setHasBacktest] = useState(false);
  const [hasPaper, setHasPaper] = useState(false);
  const [hasExchange, setHasExchange] = useState(false);
  const [hasReal, setHasReal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const hasFetchedChecklist = useRef(false);

  const tasks: GuideTask[] = useMemo(
    () => [
      {
        id: 'reviewPerformance',
        title: t('guidePage.tasks.reviewPerformance.title'),
        description: t('guidePage.tasks.reviewPerformance.description'),
        actionLabel: t('guidePage.tasks.reviewPerformance.action'),
        href: '/performance',
        accentFrom: 'from-sky-500/80',
        accentTo: 'to-cyan-400/30',
        icon: BarChart3,
      },
      {
        id: 'signIn',
        title: t('guidePage.tasks.signIn.title'),
        description: t('guidePage.tasks.signIn.description'),
        actionLabel: t('guidePage.tasks.signIn.action'),
        href: '/signin?redirect=/guide',
        accentFrom: 'from-emerald-500/80',
        accentTo: 'to-teal-400/30',
        icon: ShieldCheck,
      },
      {
        id: 'runBacktest',
        title: t('guidePage.tasks.runBacktest.title'),
        description: t('guidePage.tasks.runBacktest.description'),
        actionLabel: t('guidePage.tasks.runBacktest.action'),
        href: '/backtest-trading/create',
        requiresAuth: true,
        accentFrom: 'from-indigo-500/80',
        accentTo: 'to-blue-500/20',
        icon: Activity,
      },
      {
        id: 'startPaperTrade',
        title: t('guidePage.tasks.startPaperTrade.title'),
        description: t('guidePage.tasks.startPaperTrade.description'),
        actionLabel: t('guidePage.tasks.startPaperTrade.action'),
        href: '/paper-trading/create',
        requiresAuth: true,
        accentFrom: 'from-amber-500/80',
        accentTo: 'to-orange-400/25',
        icon: PlayCircle,
      },
      {
        id: 'linkExchange',
        title: t('guidePage.tasks.linkExchange.title'),
        description: t('guidePage.tasks.linkExchange.description'),
        actionLabel: t('guidePage.tasks.linkExchange.action'),
        href: '/exchanges/create',
        requiresAuth: true,
        accentFrom: 'from-rose-500/80',
        accentTo: 'to-pink-400/25',
        icon: Link2,
      },
      {
        id: 'launchLiveTrade',
        title: t('guidePage.tasks.launchLiveTrade.title'),
        description: t('guidePage.tasks.launchLiveTrade.description'),
        actionLabel: t('guidePage.tasks.launchLiveTrade.action'),
        href: '/real-trading/create',
        requiresAuth: true,
        accentFrom: 'from-lime-500/80',
        accentTo: 'to-emerald-300/25',
        icon: Rocket,
      },
    ],
    [t]
  );

  // Seed review status from cookie and stored info
  useEffect(() => {
    const cookieReviewed = readMetricsCookie();
    const stored = Boolean((user?.info?.[INFO_KEY] as { reviewPerformance?: boolean } | undefined)?.reviewPerformance);
    setReviewComplete(cookieReviewed || stored);
  }, [user?.info]);

  // Migrate review completion to user info after sign-in
  useEffect(() => {
    if (!isAuthenticated || authLoading || !reviewComplete) return;
    const stored = Boolean((user?.info?.[INFO_KEY] as { reviewPerformance?: boolean } | undefined)?.reviewPerformance);
    if (stored) return;

    const sync = async () => {
      try {
        setIsSaving(true);
        await updateUserInfo({ [INFO_KEY]: { reviewPerformance: true } });
      } catch (error) {
        const message = error instanceof Error ? error.message : t('guidePage.errors.saveUnknown');
        toast.error(t('guidePage.errors.saveFailedTitle'), message);
      } finally {
        setIsSaving(false);
      }
    };

    void sync();
  }, [authLoading, isAuthenticated, reviewComplete, updateUserInfo, toast, user?.info]);

  // Fetch counts for backtest/paper/real and exchange bindings
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setHasBacktest(false);
      setHasPaper(false);
      setHasExchange(false);
      setHasReal(false);
      hasFetchedChecklist.current = false;
      return;
    }

    if (hasFetchedChecklist.current) return;
    hasFetchedChecklist.current = true;

    const load = async () => {
      try {
        setIsLoadingData(true);
        const [tradings, exchanges] = await Promise.all([getTradings(), getExchangeBindings()]);
        const normalizeType = (value: string) => value.toLowerCase();
        setHasBacktest(tradings.some((t) => normalizeType(t.type) === 'backtest'));
        setHasPaper(tradings.some((t) => normalizeType(t.type) === 'paper'));
        setHasReal(tradings.some((t) => normalizeType(t.type) === 'real'));
        setHasExchange(exchanges.length > 0);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('guidePage.errors.loadUnknown');
        toast.error(t('guidePage.errors.loadFailedTitle'), message);
        hasFetchedChecklist.current = false;
      } finally {
        setIsLoadingData(false);
      }
    };

    void load();
  }, [authLoading, isAuthenticated, toast, t]);

  const progress: Record<GuideTaskId, boolean> = useMemo(
    () => ({
      reviewPerformance: reviewComplete,
      signIn: isAuthenticated,
      runBacktest: hasBacktest,
      startPaperTrade: hasPaper,
      linkExchange: hasExchange,
      launchLiveTrade: hasReal,
    }),
    [hasBacktest, hasExchange, hasPaper, hasReal, isAuthenticated, reviewComplete]
  );

  const completedCount = useMemo(
    () => (Object.keys(progress) as GuideTaskId[]).filter((key) => progress[key]).length,
    [progress]
  );
  const completionPercent = Math.round((completedCount / tasks.length) * 100);
  const firstIncompleteId = tasks.find((task) => !progress[task.id])?.id;
  const canShowAction = useMemo(() => {
    if (authLoading) return false;
    if (isAuthenticated) return !isLoadingData;
    return true;
  }, [authLoading, isAuthenticated, isLoadingData]);

  const handleAction = async (task: GuideTask) => {
    if (task.id === 'reviewPerformance') {
      setReviewComplete(true);
      writeMetricsCookie(true);
      if (isAuthenticated) {
        try {
          setIsSaving(true);
          await updateUserInfo({ [INFO_KEY]: { reviewPerformance: true } });
        } catch (error) {
          const message = error instanceof Error ? error.message : t('guidePage.errors.saveUnknown');
          toast.error(t('guidePage.errors.saveFailedTitle'), message);
        } finally {
          setIsSaving(false);
        }
      }
      navigate(task.href);
      return;
    }

    if (task.id === 'signIn') {
      navigate('/signin?redirect=/guide');
      return;
    }

    if (task.requiresAuth && !isAuthenticated) {
      const params = new URLSearchParams();
      params.set('redirect', task.href);
      navigate(`/signin?${params.toString()}`);
      return;
    }

    navigate(task.href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navigation />

      <main className="pt-28 pb-12">

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight font-['Bebas_Neue'] tracking-wide">
                {t('guidePage.title')}
              </h1>
              <p className="text-base sm:text-lg text-slate-100 max-w-3xl leading-relaxed font-['Nunito']">
                {t('guidePage.subtitle')}
              </p>
            </div>
            <div className="w-full max-w-full sm:max-w-md lg:max-w-sm">
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 sm:p-5 shadow-lg">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{t('guidePage.progressLabel')}</span>
                  <span className="flex items-center gap-2 text-emerald-200 font-semibold">
                    <Sparkles className="h-4 w-4" />
                    {t('guidePage.progressStatus', { completed: completedCount, total: tasks.length })}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-300 transition-all duration-500"
                    style={{ width: `${Math.min(completionPercent, 100)}%` }}
                  />
                </div>
                {isSaving && (
                  <div className="mt-2 text-xs text-slate-300">{t('guidePage.saving')}</div>
                )}
              </div>
            </div>
          </div>

          <section className="space-y-4">
            {tasks.map((task, index) => {
              const completed = progress[task.id];
              const showAction = canShowAction && task.id === firstIncompleteId;
              const palette = completed
                ? {
                    cardBase: 'bg-slate-800/60 border-white/10',
                    textTone: 'text-slate-500',
                    descriptionClass: "text-sm max-w-3xl font-['Nunito'] text-slate-500/60",
                    showGradient: false,
                  }
                : {
                    cardBase: 'bg-white/5 border-white/10',
                    textTone: 'text-white',
                    descriptionClass: "text-sm max-w-3xl font-['Nunito'] text-white/60",
                    showGradient: true,
                  };
              const titleClass = "text-lg font-semibold font-['Nunito'] leading-snug";

              return (
                <div
                  key={task.id}
                  className={`relative overflow-hidden rounded-2xl shadow-lg shadow-black/20 ${palette.cardBase}`}
                >
                  {palette.showGradient && (
                    <div
                      className={`absolute inset-0 opacity-60 bg-gradient-to-r ${task.accentFrom} ${task.accentTo}`}
                      aria-hidden="true"
                    />
                  )}
                  <div className={`relative p-5 sm:p-6 lg:p-7 flex flex-col gap-4 ${palette.textTone}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/40 text-sm font-semibold border border-white/15">
                            {index + 1}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className={titleClass}>
                            {task.title}
                          </p>
                          <p className={palette.descriptionClass}>
                            {task.description}
                          </p>
                        </div>
                      </div>
              {showAction && (
                <div className="flex sm:items-end">
                  <button
                    onClick={() => handleAction(task)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm shadow-lg bg-white text-slate-900 hover:-translate-y-[1px] hover:shadow-emerald-500/20 transition-transform w-full sm:w-auto justify-center whitespace-nowrap"
                          >
                            {isLoadingData && task.requiresAuth ? t('guidePage.loading') : task.actionLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GetStartedGuidePage;
