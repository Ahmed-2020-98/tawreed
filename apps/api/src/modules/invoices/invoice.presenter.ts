import type { InvoiceSummaryDto } from '@tawreed/contracts';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { money } from '../pricing/domain/money.js';

export const invoiceSummaryInclude = {
  supplier: { select: { id: true, nameAr: true, nameEn: true } },
  company: { select: { id: true, name: true } },
  order: { select: { id: true, number: true } },
  supplierOrder: { select: { number: true } },
} satisfies Prisma.InvoiceInclude;
export type InvoiceSummaryRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceSummaryInclude }>;

export function invoiceSummary(i: InvoiceSummaryRow, now: Date = new Date()): InvoiceSummaryDto {
  const open = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status);
  const overdue = open && !!i.dueDate && i.dueDate < now;
  const daysOverdue = overdue && i.dueDate ? Math.floor((now.getTime() - i.dueDate.getTime()) / 86_400_000) : 0;
  return {
    id: i.id,
    number: i.number,
    supplier: { id: i.supplier.id, name: loc(i.supplier.nameAr, i.supplier.nameEn) },
    company: { id: i.company.id, name: i.company.name },
    orderId: i.order.id,
    orderNumber: i.order.number,
    supplierOrderNumber: i.supplierOrder.number,
    issueDate: i.issueDate.toISOString(),
    dueDate: i.dueDate?.toISOString().slice(0, 10) ?? null,
    paymentMethod: i.paymentMethod,
    total: money(i.total),
    vatTotal: money(i.vatTotal),
    amountPaid: money(i.amountPaid),
    balanceDue: money(i.balanceDue),
    status: overdue && i.status !== 'OVERDUE' ? 'OVERDUE' : i.status,
    isOverdue: overdue,
    daysOverdue,
  };
}
