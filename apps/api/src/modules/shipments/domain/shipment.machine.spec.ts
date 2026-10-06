import { shipmentActions, shipmentNext } from './shipment.machine.js';

describe('shipment machine', () => {
  it('follows the driver journey', () => {
    expect(shipmentNext('ASSIGNED', 'accept', 'DRIVER')).toBe('ACCEPTED');
    expect(shipmentNext('ACCEPTED', 'pickup', 'DRIVER')).toBe('PICKED_UP');
    expect(shipmentNext('PICKED_UP', 'start', 'DRIVER')).toBe('IN_TRANSIT');
    expect(shipmentNext('IN_TRANSIT', 'arrive', 'DRIVER')).toBe('ARRIVED');
    expect(shipmentNext('ARRIVED', 'deliver', 'DRIVER')).toBe('DELIVERED');
  });
  it('blocks wrong actors and states', () => {
    expect(shipmentNext('ASSIGNED', 'accept', 'SUPPLIER')).toBeNull();
    expect(shipmentNext('DELIVERED', 'fail', 'DRIVER')).toBeNull();
    expect(shipmentActions('ARRIVED', 'DRIVER')).toEqual(['deliver', 'fail']);
  });
});
