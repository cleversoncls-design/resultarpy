import type { FleetStatus } from '@/lib/demo-data';

export type ReservationForStatus = {
  vehicleId?: string | number | null;
  status: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  returnKm?: number | null;
};

const dayOf = (value: string | Date | null | undefined) => (value ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : '');

// O cadastro do veículo guarda só o estado "físico" (disponível, em
// manutenção...). Reservas não alteram esse campo, então a tela da frota
// deriva o estado exibido: um veículo "Disponível" com reserva ativa hoje
// aparece como "Reservado", e como "Em viagem" quando a reserva já saiu e
// ainda não voltou. Qualquer outro estado (manutenção, avaria...) prevalece.
export function effectiveVehicleStatus(vehicleId: string | number, baseStatus: FleetStatus, reservations: ReservationForStatus[], todayIso: string): FleetStatus {
  if (baseStatus !== 'Disponível') return baseStatus;
  const mine = reservations.filter((reservation) => reservation.vehicleId != null && String(reservation.vehicleId) === String(vehicleId));
  const inWindow = (reservation: ReservationForStatus) => {
    const start = dayOf(reservation.startDate);
    const end = dayOf(reservation.endDate);
    return (!start || start <= todayIso) && (!end || todayIso <= end);
  };
  if (mine.some((reservation) => reservation.status === 'Em viagem' && (reservation.returnKm == null) && (!dayOf(reservation.startDate) || dayOf(reservation.startDate) <= todayIso))) return 'Em viagem';
  if (mine.some((reservation) => (reservation.status === 'Reservado' || reservation.status === 'Reservada') && inWindow(reservation))) return 'Reservado';
  return 'Disponível';
}

export function localTodayIso(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
