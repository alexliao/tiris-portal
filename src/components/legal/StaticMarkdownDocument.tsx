import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

interface StaticMarkdownDocumentProps {
  /** Path without locale prefix or file extension, e.g. `legal/terms` */
  slug: string;
  /** Optional locale fallback when localized asset is missing */
  fallbackLocale?: string;
  className?: string;
}

interface LoadedMarkdown {
  content: string;
  localeUsed: string;
}

export const StaticMarkdownDocument: React.FC<StaticMarkdownDocumentProps> = ({
  slug,
  fallbackLocale = 'en',
  className = '',
}) => {
  const { i18n, t } = useTranslation();
  const [documentData, setDocumentData] = useState<LoadedMarkdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedLocale = useMemo(() => {
    const locale = i18n.resolvedLanguage || i18n.language || fallbackLocale;
    return locale.split('-')[0];
  }, [i18n.language, i18n.resolvedLanguage, fallbackLocale]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setDocumentData(null);

    const loadDocument = async () => {
      try {
        const tryLocale = async (locale: string): Promise<LoadedMarkdown | null> => {
          const url = `/${locale}/${slug}.md`;
          const response = await fetch(url, { signal: controller.signal });

          if (response.ok) {
            const content = await response.text();
            return { content, localeUsed: locale };
          }

          return null;
        };

        const localized = await tryLocale(normalizedLocale);
        if (localized) {
          setDocumentData(localized);
          setIsLoading(false);
          return;
        }

        if (normalizedLocale !== fallbackLocale) {
          const fallbackDoc = await tryLocale(fallbackLocale);
          if (fallbackDoc) {
            setDocumentData(fallbackDoc);
            setIsLoading(false);
            return;
          }
        }

        throw new Error('document_not_found');
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to load markdown document', err);
        setError(t('common.error', 'Error'));
        setIsLoading(false);
      }
    };

    loadDocument();
    return () => controller.abort();
  }, [normalizedLocale, slug, fallbackLocale, t]);

  if (isLoading) {
    return (
      <div className={`text-center text-gray-500 font-['Nunito'] ${className}`}>
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className={`text-center text-red-600 font-['Nunito'] ${className}`}>
        {t('common.error', 'Error')}
      </div>
    );
  }

  type CodeProps = React.ComponentPropsWithoutRef<'code'> & { inline?: boolean };

  const components: Components = {
    h1: ({ ...props }) => (
      <h1 className="text-3xl font-['Bebas_Neue'] text-[#080404] mb-3" {...props} />
    ),
    h2: ({ ...props }) => (
      <h2 className="text-xl font-['Bebas_Neue'] text-[#080404] mt-8 mb-3" {...props} />
    ),
    h3: ({ ...props }) => (
      <h3 className="text-lg font-['Bebas_Neue'] text-[#080404] mt-6 mb-2" {...props} />
    ),
    p: ({ ...props }) => (
      <p className="text-base leading-relaxed text-gray-700 font-['Nunito'] mb-4" {...props} />
    ),
    ul: ({ ...props }) => (
      <ul className="list-disc pl-6 space-y-2 text-gray-700 font-['Nunito'] mb-4" {...props} />
    ),
    ol: ({ ...props }) => (
      <ol className="list-decimal pl-6 space-y-2 text-gray-700 font-['Nunito'] mb-4" {...props} />
    ),
    li: ({ ...props }) => (
      <li className="leading-relaxed" {...props} />
    ),
    a: ({ ...props }) => (
      <a
        className="text-[#1B4D3E] underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    strong: ({ ...props }) => (
      <strong className="font-semibold text-[#080404]" {...props} />
    ),
    em: ({ ...props }) => (
      <em className="italic" {...props} />
    ),
    code: ({ inline, className = '', children, ...props }: CodeProps) => {
      const isInline = inline ?? !className?.includes('language-');

      if (isInline) {
        return (
          <code
            className={`inline bg-gray-200 text-[#080404] px-1 py-[2px] rounded font-['Nunito'] text-sm ${className}`}
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <pre className="bg-gray-100 rounded p-4 overflow-x-auto mb-4">
          <code className={`font-mono text-sm ${className}`} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    blockquote: ({ ...props }) => (
      <blockquote
        className="border-l-4 border-gray-300 pl-4 italic text-gray-600 font-['Nunito'] mb-4"
        {...props}
      />
    ),
  };

  return (
    <article className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {documentData.content}
      </ReactMarkdown>
    </article>
  );
};

export default StaticMarkdownDocument;
