'use client';

import { Badge, Button, Checkbox, cn, Skeleton } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Check, ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConfirmAction, useAction } from '@/components/kit/dialogs';
import { SearchFilter, TabFilter, Toolbar } from '@/components/kit/filters';
import { DateText, EnumLabel, Facts, Ltr, PageHeader, Section, StatusBadge } from '@/components/kit/misc';
import { type Column, DataTable, Pager } from '@/components/kit/table';
import { useApi } from '@/lib/hooks/use-api';
import { useList, useUrlState } from '@/lib/hooks/use-list';

interface KybRow {
  kind: 'BUYER' | 'SUPPLIER';
  id: string;
  name: string;
  businessType?: string;
  city: string | null;
  crNumber: string | null;
  verificationStatus: string;
  documentsCount: number;
  updatedAt: string;
}

const KYB_DOC_TYPES = ['COMMERCIAL_REGISTRATION', 'VAT_CERTIFICATE', 'NATIONAL_ADDRESS', 'IBAN_LETTER', 'AUTHORIZATION_LETTER', 'FOOD_SAFETY_LICENSE', 'OTHER'] as const;

export function KybQueue() {
  const t = useTranslations('kyb');
  const te = useTranslations('enums');
  const { get } = useUrlState();
  const kind = get('kind') ?? 'BUYER';
  const { rows, meta, isLoading } = useList<KybRow>('/admin/kyb', { kind: 'BUYER' });
  const columns: Column<KybRow>[] = [
    {
      key: 'name',
      header: t('entity'),
      cell: (r) => (
        <div>
          <p className="font-bold text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-500">
            {r.businessType && <EnumLabel kind="BusinessType" value={r.businessType} />}
            {r.city && ` · ${r.city}`}
          </p>
        </div>
      ),
    },
    { key: 'cr', header: t('cr'), cell: (r) => (r.crNumber ? <Ltr>{r.crNumber}</Ltr> : '—'), hideBelow: 'md' },
    { key: 'docs', header: t('documents'), cell: (r) => <span className="num font-semibold">{r.documentsCount}</span>, align: 'center' },
    { key: 'status', header: t('status'), cell: (r) => <StatusBadge kind="VerificationStatus" value={r.verificationStatus} size="sm" /> },
    { key: 'updated', header: t('submitted'), cell: (r) => <DateText value={r.updatedAt} time />, hideBelow: 'sm' },
  ];
  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <TabFilter param="kind" fallback="BUYER" options={[{ value: 'BUYER', label: t('buyers') }, { value: 'SUPPLIER', label: t('suppliers') }]} />
      <Toolbar>
        <SearchFilter />
        <div className="flex gap-1 rounded-lg bg-white p-0.5 ring-1 ring-gray-200">
          {['', 'UNDER_REVIEW', 'NEEDS_INFO', 'PENDING', 'REJECTED', 'VERIFIED'].map((s) => (
            <StatusChip key={s || 'all'} value={s} label={s ? te(`VerificationStatus.${s}` as never) : t('awaiting')} />
          ))}
        </div>
      </Toolbar>
      <DataTable columns={columns} rows={rows} loading={isLoading} rowKey={(r) => `${r.kind}-${r.id}`} href={(r) => `/kyb/${r.kind}/${r.id}`} empty={{ icon: <ShieldCheck />, title: t('empty'), description: kind === 'BUYER' ? t('emptyHint') : undefined }} />
      <Pager meta={meta} />
    </>
  );
}

function StatusChip({ value, label }: { value: string; label: string }) {
  const { get, set } = useUrlState();
  const active = (get('status') ?? '') === value;
  return (
    <button type="button" onClick={() => set({ status: value || undefined })} className={cn('rounded-md px-2.5 py-1.5 text-xs font-bold transition', active ? 'bg-navy-900 text-white' : 'text-gray-500 hover:bg-gray-100')}>
      {label}
    </button>
  );
}

interface KybDoc {
  id: string;
  type: string;
  status: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  expiresAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
interface KybOverview {
  verificationStatus: string;
  documents: KybDoc[];
  requiredTypes: string[];
  missingTypes: string[];
  history: { id: string; fromStatus: string; toStatus: string; note: string | null; requestedDocTypes: string[]; createdAt: string }[];
}

export function KybReview({ kind, id }: { kind: string; id: string }) {
  const t = useTranslations('kyb');
  const te = useTranslations('enums');
  const api = useApi();
  const { run } = useAction();
  const [requested, setRequested] = useState<string[]>([]);
  const isBuyer = kind === 'BUYER';
  const { data, isLoading } = useQuery({ queryKey: ['admin-kyb', kind, id], queryFn: () => api.get<KybOverview>(`/admin/kyb/${kind}/${id}`) });
  const { data: entity } = useQuery({
    queryKey: ['admin-kyb-entity', kind, id],
    queryFn: async () => {
      if (isBuyer) {
        const d = await api.get<{ company: { name: string; legalName: string | null; crNumber: string | null; vatNumber: string | null; phone: string | null; businessType: string } }>(`/admin/buyers/${id}`);
        return { name: d.company.name, legalName: d.company.legalName, crNumber: d.company.crNumber, vatNumber: d.company.vatNumber, phone: d.company.phone, businessType: d.company.businessType };
      }
      const s = await api.get<{ nameAr: string; legalName: string | null; crNumber: string | null; vatNumber: string | null; contactPhone: string | null }>(`/admin/suppliers/${id}`);
      return { name: s.nameAr, legalName: s.legalName, crNumber: s.crNumber, vatNumber: s.vatNumber, phone: s.contactPhone, businessType: null };
    },
  });
  if (isLoading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const decide = (decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO') => (note: string) =>
    run(() => api.post(`/admin/kyb/${kind}/${id}/decision`, { decision, note: note || undefined, requestedDocTypes: decision === 'NEEDS_INFO' ? requested : [] }), t(`decided.${decision}`));
  const pendingDocs = data.documents.filter((d) => d.status === 'PENDING').length;
  return (
    <>
      <PageHeader
        back={{ href: `/kyb${isBuyer ? '' : '?kind=SUPPLIER'}`, label: t('title') }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {entity?.name ?? '…'}
            <StatusBadge kind="VerificationStatus" value={data.verificationStatus} />
          </span>
        }
        subtitle={isBuyer ? t('buyerFile') : t('supplierFile')}
        actions={
          <>
            <ConfirmAction label={t('needsInfo')} variant="outline" title={t('needsInfoTitle')} description={t('needsInfoHint')} reason="required" onConfirm={decide('NEEDS_INFO')}>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800">{t('requestDocs')}</p>
                <div className="grid gap-2">
                  {KYB_DOC_TYPES.map((d) => (
                    <label key={d} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <Checkbox checked={requested.includes(d)} onCheckedChange={(c) => setRequested((r) => (c ? [...r, d] : r.filter((x) => x !== d)))} />
                      {te(`KybDocType.${d}` as never)}
                    </label>
                  ))}
                </div>
              </div>
            </ConfirmAction>
            <ConfirmAction label={t('reject')} variant="danger-soft" icon={<X />} title={t('rejectTitle')} reason="required" onConfirm={decide('REJECTED')} />
            <ConfirmAction label={t('approve')} icon={<Check />} title={t('approveTitle')} description={pendingDocs ? t('approvePendingHint', { count: pendingDocs }) : t('approveHint')} reason="optional" onConfirm={decide('VERIFIED')} />
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {data.missingTypes.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t('missing')}: {data.missingTypes.map((m) => te(`KybDocType.${m}` as never)).join('، ')}
            </div>
          )}
          {data.documents.length ? (
            data.documents.map((d) => <DocumentCard key={d.id} doc={d} required={data.requiredTypes.includes(d.type)} />)
          ) : (
            <Section>
              <p className="py-6 text-center text-sm text-gray-500">{t('noDocs')}</p>
            </Section>
          )}
        </div>
        <div className="space-y-6">
          <Section title={t('entityInfo')}>
            <Facts
              cols={1}
              items={[
                [t('legalName'), entity?.legalName],
                [t('cr'), entity?.crNumber && <Ltr>{entity.crNumber}</Ltr>],
                [t('vat'), entity?.vatNumber && <Ltr>{entity.vatNumber}</Ltr>],
                [t('phone'), entity?.phone && <Ltr>{entity.phone}</Ltr>],
                ...(entity?.businessType ? ([[t('type'), <EnumLabel key="b" kind="BusinessType" value={entity.businessType} />]] as [string, React.ReactNode][]) : []),
              ]}
            />
          </Section>
          <Section title={t('required')}>
            <ul className="space-y-2 text-sm">
              {data.requiredTypes.map((r) => {
                const doc = data.documents.find((d) => d.type === r);
                return (
                  <li key={r} className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">{te(`KybDocType.${r}` as never)}</span>
                    {doc ? <StatusBadge kind="DocReviewStatus" value={doc.status} size="sm" /> : <Badge tone="red" size="sm">{t('notUploaded')}</Badge>}
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title={t('history')}>
            {data.history.length ? (
              <ol className="relative space-y-4 border-s border-gray-200 ps-4">
                {data.history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -start-[1.3rem] top-1 size-2.5 rounded-full bg-navy-700 ring-4 ring-white" />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <StatusBadge kind="VerificationStatus" value={h.toStatus} size="sm" />
                      <DateText value={h.createdAt} time />
                    </div>
                    {h.note && <p className="mt-1 text-sm text-gray-600">{h.note}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-500">{t('noHistory')}</p>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

function DocumentCard({ doc, required }: { doc: KybDoc; required: boolean }) {
  const t = useTranslations('kyb');
  const api = useApi();
  const { run, busy } = useAction();
  const isImage = doc.mimeType.startsWith('image/');
  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-2">
          <EnumLabel kind="KybDocType" value={doc.type} />
          {required && <Badge size="sm">{t('requiredBadge')}</Badge>}
          <StatusBadge kind="DocReviewStatus" value={doc.status} size="sm" />
        </span>
      }
      action={
        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <ExternalLink className="size-4" />
          {t('open')}
        </a>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {isImage ? (
            <img src={doc.fileUrl} alt={doc.fileName} className="max-h-[28rem] w-full object-contain" />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-500">
              <FileText className="size-10" />
              <span className="text-sm font-semibold">{doc.fileName}</span>
            </div>
          )}
        </a>
        <div className="space-y-4">
          <Facts cols={1} items={[[t('fileName'), <span key="f" className="break-all">{doc.fileName}</span>], [t('uploaded'), <DateText key="u" value={doc.createdAt} time />], [t('expires'), doc.expiresAt && <DateText key="e" value={doc.expiresAt} />]]} />
          {doc.reviewNote && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{doc.reviewNote}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant={doc.status === 'ACCEPTED' ? 'soft' : 'outline'} className="flex-1" disabled={busy || doc.status === 'ACCEPTED'} onClick={() => run(() => api.patch(`/admin/kyb/documents/${doc.id}`, { status: 'ACCEPTED' }), t('docAccepted'))}>
              <Check />
              {t('accept')}
            </Button>
            <ConfirmAction
              label={t('rejectDoc')}
              variant="danger-soft"
              size="sm"
              icon={<X />}
              disabled={doc.status === 'REJECTED'}
              title={t('rejectDocTitle')}
              reason="required"
              onConfirm={(note) => run(() => api.patch(`/admin/kyb/documents/${doc.id}`, { status: 'REJECTED', note }), t('docRejected'))}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
