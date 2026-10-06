'use client';

import { Button } from '@tawreed/ui';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common');
  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="size-8" />
        </span>
        <h1 className="mt-4 text-2xl font-black text-navy-900">{t('errorTitle')}</h1>
        <p className="mt-2 text-gray-600">{t('errorBody')}</p>
        <Button className="mt-6" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </main>
  );
}
