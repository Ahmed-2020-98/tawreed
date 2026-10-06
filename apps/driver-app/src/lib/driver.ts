import type { DriverSummaryDto, ShipmentDetailDto } from '@tawreed/contracts';
import { api, useRealtime } from '@tawreed/mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useDriverSummary() {
  return useQuery({ queryKey: ['driver', 'summary'], queryFn: () => api.get<DriverSummaryDto>('/driver/summary'), refetchInterval: 30_000 });
}

export function useDriverShipments(status: 'ACTIVE' | 'DONE') {
  return useQuery({ queryKey: ['driver', 'shipments', status], queryFn: () => api.page<ShipmentDetailDto>('/driver/shipments', { query: { status, pageSize: 30 } }) });
}

/** Refreshes driver data when the API pushes assignment / status events. */
export function useDriverLive() {
  const qc = useQueryClient();
  useRealtime({
    'shipment.updated': () => void qc.invalidateQueries({ queryKey: ['driver'] }),
    'shipment.assigned': () => void qc.invalidateQueries({ queryKey: ['driver'] }),
    poll: () => void qc.invalidateQueries({ queryKey: ['driver'] }),
  });
}
