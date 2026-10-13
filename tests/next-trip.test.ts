import { describe, expect, it } from 'vitest';
import { pickNextTrip } from '../lib/next-trip';

const trip = (id: number, status: string, startsOn: string, endsOn: string) => ({ id, status, startsOn, endsOn });

describe('pickNextTrip', () => {
  const today = '2026-10-13';

  it('ignores cancelled, rejected and finished trips', () => {
    expect(pickNextTrip([trip(1, 'Cancelada', '2026-10-14', '2026-10-15'), trip(2, 'Rejeitada', '2026-10-14', '2026-10-15'), trip(3, 'Finalizada', '2026-10-01', '2026-10-02')], today)).toBeUndefined();
  });

  it('prefers the ongoing trip, then the next upcoming one, then the latest past open trip', () => {
    const trips = [trip(1, 'Aprovada', '2026-10-20', '2026-10-22'), trip(2, 'Aprovada', '2026-10-15', '2026-10-16'), trip(3, 'Liberada para viagem', '2026-10-12', '2026-10-14'), trip(4, 'Em prestação', '2026-10-01', '2026-10-03')];
    expect(pickNextTrip(trips, today)?.id).toBe(3);
    expect(pickNextTrip(trips.filter((item) => item.id !== 3), today)?.id).toBe(2);
    expect(pickNextTrip(trips.filter((item) => item.id === 4), today)?.id).toBe(4);
  });
});
