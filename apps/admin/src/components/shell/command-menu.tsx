'use client';

import { Dialog, Kbd } from '@tawreed/ui';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import { Building2, FileText, Package, Receipt, Search, Store, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as D } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useCan } from '@/components/providers';
import { useRouter } from '@/i18n/navigation';
import { useApi } from '@/lib/hooks/use-api';
import { useFormat } from '@/lib/hooks/use-format';
import { NAV, READY } from './nav';

interface SearchResult {
  orders: { id: string; number: string; status: string; grandTotal: string }[];
  companies: { id: string; name: string; verificationStatus: string }[];
  suppliers: { id: string; nameAr: string; status: string }[];
  products: { id: string; nameAr: string; slug: string }[];
  invoices: { id: string; number: string; total: string; status: string }[];
  users: { id: string; name: string; phone: string | null; type: string }[];
}

const item = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-900 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gray-400';
const group = '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-gray-400';

/** ⌘K palette: jump to any page, or search orders, companies, suppliers, products, invoices and users. */
export function CommandMenu() {
  const t = useTranslations('shell');
  const tn = useTranslations('nav');
  const api = useApi();
  const can = useCan();
  const f = useFormat();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);
  const { data, isFetching } = useQuery({ queryKey: ['admin-search', debounced], queryFn: () => api.get<SearchResult>('/admin/search', { query: { q: debounced } }), enabled: open && debounced.length >= 2 });
  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };
  const pages = NAV.flatMap((s) => s.items).filter((i) => can(i.perm) && READY.has(i.href));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition hover:border-gray-300 hover:bg-white">
        <Search className="size-4" />
        <span className="flex-1 text-start">{t('search')}</span>
        <span className="hidden gap-1 sm:flex" dir="ltr">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-[2px]" />
          <D.Content className="fixed start-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ltr:-translate-x-1/2 rtl:translate-x-1/2">
            <D.Title className="sr-only">{t('search')}</D.Title>
            <D.Description className="sr-only" />
            <Command shouldFilter={debounced.length < 2} loop>
              <div className="flex items-center gap-3 border-b border-gray-100 px-4">
                <Search className="size-5 text-gray-400" />
                <Command.Input value={q} onValueChange={setQ} placeholder={t('searchPlaceholder')} className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-gray-400" />
                {isFetching && <span className="size-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />}
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-gray-500">{t('noResults')}</Command.Empty>
                {debounced.length < 2 ? (
                  <Command.Group heading={t('pages')} className={group}>
                    {pages.map((p) => (
                      <Command.Item key={p.key} value={`${tn(p.key)} ${p.key}`} onSelect={() => go(p.href)} className={item}>
                        <p.icon />
                        {tn(p.key)}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : (
                  data && (
                    <>
                      {!!data.orders.length && (
                        <Command.Group heading={tn('orders')} className={group}>
                          {data.orders.map((o) => (
                            <Command.Item key={o.id} value={`order-${o.id}`} onSelect={() => go(`/orders/${o.id}`)} className={item}>
                              <Package />
                              <span className="num flex-1 font-bold" dir="ltr">{o.number}</span>
                              <span className="num text-xs text-gray-500">{f.money(o.grandTotal)}</span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      {!!data.companies.length && (
                        <Command.Group heading={tn('buyers')} className={group}>
                          {data.companies.map((c) => (
                            <Command.Item key={c.id} value={`company-${c.id}`} onSelect={() => go(`/buyers/${c.id}`)} className={item}>
                              <Building2 />
                              {c.name}
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      {!!data.suppliers.length && (
                        <Command.Group heading={tn('suppliers')} className={group}>
                          {data.suppliers.map((s) => (
                            <Command.Item key={s.id} value={`supplier-${s.id}`} onSelect={() => go(`/suppliers/${s.id}`)} className={item}>
                              <Store />
                              {s.nameAr}
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      {!!data.products.length && (
                        <Command.Group heading={tn('products')} className={group}>
                          {data.products.map((p) => (
                            <Command.Item key={p.id} value={`product-${p.id}`} onSelect={() => go(`/products?q=${encodeURIComponent(p.nameAr)}`)} className={item}>
                              <FileText />
                              {p.nameAr}
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      {!!data.invoices.length && (
                        <Command.Group heading={tn('invoices')} className={group}>
                          {data.invoices.map((i) => (
                            <Command.Item key={i.id} value={`invoice-${i.id}`} onSelect={() => go(`/invoices?q=${encodeURIComponent(i.number)}`)} className={item}>
                              <Receipt />
                              <span className="num flex-1 font-bold" dir="ltr">{i.number}</span>
                              <span className="num text-xs text-gray-500">{f.money(i.total)}</span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      {!!data.users.length && (
                        <Command.Group heading={t('users')} className={group}>
                          {data.users.map((u) => (
                            <Command.Item key={u.id} value={`user-${u.id}`} onSelect={() => go(u.type === 'STAFF' ? '/staff' : `/buyers?q=${encodeURIComponent(u.phone ?? u.name)}`)} className={item}>
                              <User />
                              <span className="flex-1">{u.name}</span>
                              {u.phone && <span className="num text-xs text-gray-500" dir="ltr">{u.phone}</span>}
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                    </>
                  )
                )}
              </Command.List>
            </Command>
          </D.Content>
        </D.Portal>
      </Dialog>
    </>
  );
}
