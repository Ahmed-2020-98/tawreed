'use client';

import { Button, type ButtonProps, Dialog, DialogContent, Field, Textarea, toast } from '@tawreed/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toastError } from '@/lib/hooks/use-api';

/** Runs an API mutation, then toasts and refreshes every cached query (lists, counters, details). */
export function useAction() {
  const qc = useQueryClient();
  const t = useTranslations('common');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success ?? t('saved'));
      await qc.invalidateQueries();
      return true;
    } catch (e) {
      toastError(e, t('error'));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

/**
 * Button that opens a confirmation dialog. With `reason`, a note field is shown (required when `reason === 'required'`).
 * `onConfirm` receives the note; return false to keep the dialog open.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  reason,
  reasonLabel,
  onConfirm,
  variant = 'primary',
  size = 'sm',
  children,
  icon,
  disabled,
}: {
  label: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  reason?: 'required' | 'optional';
  reasonLabel?: React.ReactNode;
  onConfirm: (note: string) => Promise<boolean | void>;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  children?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const invalid = reason === 'required' && note.trim().length < 3;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setNote('');
      }}
    >
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)} disabled={disabled}>
        {icon}
        {label}
      </Button>
      <DialogContent title={title} description={description} size="sm">
        <div className="space-y-4">
          {children}
          {reason && (
            <Field label={reasonLabel ?? t('note')} required={reason === 'required'}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} />
            </Field>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant={variant === 'outline' || variant === 'ghost' ? 'primary' : variant}
              size="sm"
              loading={busy}
              disabled={invalid}
              onClick={async () => {
                setBusy(true);
                const ok = await onConfirm(note.trim());
                setBusy(false);
                if (ok !== false) {
                  setOpen(false);
                  setNote('');
                }
              }}
            >
              {confirmLabel ?? t('confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
