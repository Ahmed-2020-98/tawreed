'use client';

import { X } from 'lucide-react';
import { Dialog as D, DropdownMenu as M, Popover as P, Tooltip as T } from 'radix-ui';
import type * as React from 'react';
import { cn } from '../lib/cn';

/* ------------------------------------------------------------------ dialog */
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const overlay = 'fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0';

export function DialogContent({ className, children, title, description, hideClose, size = 'md', ...props }: Omit<React.ComponentProps<typeof D.Content>, 'title'> & { title?: React.ReactNode; description?: React.ReactNode; hideClose?: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          'fixed start-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-xl ltr:-translate-x-1/2 rtl:translate-x-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          w,
          className,
        )}
        {...props}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              {title ? <D.Title className="text-lg font-bold text-gray-900">{title}</D.Title> : <D.Title className="sr-only">Dialog</D.Title>}
              {description ? <D.Description className="mt-1 text-sm text-gray-500">{description}</D.Description> : <D.Description className="sr-only" />}
            </div>
            {!hideClose && (
              <D.Close className="-me-2 grid size-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="size-5" />
              </D.Close>
            )}
          </div>
        )}
        <div className="px-6 pb-6 pt-4">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

/* ------------------------------------------------------------------- sheet */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;

export function SheetContent({ className, children, title, side = 'end', ...props }: Omit<React.ComponentProps<typeof D.Content>, 'title'> & { title?: React.ReactNode; side?: 'start' | 'end' | 'bottom' }) {
  const pos = {
    end: 'inset-y-0 end-0 h-full w-[min(26rem,100vw)] data-[state=open]:ltr:slide-in-from-right data-[state=open]:rtl:slide-in-from-left',
    start: 'inset-y-0 start-0 h-full w-[min(22rem,100vw)] data-[state=open]:ltr:slide-in-from-left data-[state=open]:rtl:slide-in-from-right',
    bottom: 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl data-[state=open]:slide-in-from-bottom',
  }[side];
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content className={cn('fixed z-50 flex flex-col bg-white shadow-xl data-[state=open]:animate-in data-[state=open]:duration-300', pos, className)} {...props}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <D.Title className="text-lg font-bold text-gray-900">{title}</D.Title>
          <D.Description className="sr-only" />
          <D.Close className="grid size-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

/* ----------------------------------------------------------- dropdown menu */
export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;

const menuSurface = 'z-50 min-w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95';

export function DropdownMenuContent({ className, sideOffset = 6, align = 'end', ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content sideOffset={sideOffset} align={align} className={cn(menuSurface, className)} {...props} />
    </M.Portal>
  );
}

export function DropdownMenuItem({ className, danger, ...props }: React.ComponentProps<typeof M.Item> & { danger?: boolean }) {
  return (
    <M.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-700 outline-none data-[highlighted]:bg-gray-100 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-gray-400',
        danger && 'text-red-600 data-[highlighted]:bg-red-50 [&_svg]:text-red-500',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn('px-2.5 py-1.5 text-xs font-semibold text-gray-500', className)} {...props} />;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <M.Separator className={cn('-mx-1.5 my-1.5 h-px bg-gray-100', className)} />;
}

/* ----------------------------------------------------------------- popover */
export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;

export function PopoverContent({ className, sideOffset = 6, align = 'start', ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content sideOffset={sideOffset} align={align} className={cn(menuSurface, 'p-3', className)} {...props} />
    </P.Portal>
  );
}

/* ----------------------------------------------------------------- tooltip */
export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Provider delayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className="z-50 max-w-64 rounded-lg bg-navy-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
            {content}
            <T.Arrow className="fill-navy-950" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
