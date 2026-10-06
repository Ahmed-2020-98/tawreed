import { allowedActions, canTransition, deriveOrderStatus, nextStatus } from './supplier-order.machine.js';

describe('supplier order machine', () => {
  it('lets suppliers accept/reject pending orders only', () => {
    expect(nextStatus('PENDING', 'accept', 'SUPPLIER')).toBe('ACCEPTED');
    expect(nextStatus('PENDING', 'reject', 'SUPPLIER')).toBe('REJECTED');
    expect(canTransition('ACCEPTED', 'accept', 'SUPPLIER')).toBe(false);
    expect(canTransition('PENDING', 'accept', 'BUYER')).toBe(false);
  });
  it('restricts buyer cancellation to before preparation', () => {
    expect(canTransition('ACCEPTED', 'cancel', 'BUYER')).toBe(true);
    expect(canTransition('PREPARING', 'cancel', 'BUYER')).toBe(false);
    expect(canTransition('PREPARING', 'cancel', 'STAFF')).toBe(true);
    expect(canTransition('OUT_FOR_DELIVERY', 'cancel', 'STAFF')).toBe(false);
  });
  it('lists allowed actions per actor', () => {
    expect(allowedActions('ACCEPTED', 'SUPPLIER')).toEqual(['start_preparing', 'mark_ready']);
    expect(allowedActions('PENDING', 'BUYER')).toEqual(['cancel']);
  });
  it('derives the aggregate order status', () => {
    expect(deriveOrderStatus(['AWAITING_PAYMENT', 'AWAITING_PAYMENT'])).toBe('PENDING_PAYMENT');
    expect(deriveOrderStatus(['PENDING', 'PENDING'])).toBe('PLACED');
    expect(deriveOrderStatus(['PENDING', 'ACCEPTED'])).toBe('PROCESSING');
    expect(deriveOrderStatus(['DELIVERED', 'OUT_FOR_DELIVERY'])).toBe('PARTIALLY_DELIVERED');
    expect(deriveOrderStatus(['DELIVERED', 'REJECTED'])).toBe('DELIVERED');
    expect(deriveOrderStatus(['COMPLETED', 'CANCELLED'])).toBe('COMPLETED');
    expect(deriveOrderStatus(['REJECTED', 'CANCELLED'])).toBe('CANCELLED');
  });
});
