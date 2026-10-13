import { describe, expect, it } from 'vitest';
import { summarizeTrips } from '../lib/trip-header';

describe('summarizeTrips', () => {
  it('sem viagens não gera cabeçalho', () => {
    expect(summarizeTrips([])).toBeNull();
  });

  it('uma viagem: dados dela com datas DD/MM/AAAA', () => {
    expect(summarizeTrips([{ startsOn: '2026-10-07', endsOn: '2026-10-09', travelerName: 'Lizza', companionName: null, vehiclePlate: 'AANA087' }])).toEqual({ travelers: 'Lizza', companions: '', startsOn: '07/10/2026', endsOn: '09/10/2026', vehicles: 'AANA087' });
  });

  it('várias viagens: junta nomes e placas sem repetir e usa o período completo', () => {
    const summary = summarizeTrips([
      { startsOn: '2026-10-07', endsOn: '2026-10-09', travelerName: 'Lizza', vehiclePlate: 'AANA087' },
      { startsOn: '2026-10-02', endsOn: '2026-10-05', travelerName: 'Lizza', vehiclePlate: 'BBB123' },
      { startsOn: '2026-10-12', endsOn: '2026-10-15', travelerName: 'Juan', vehiclePlate: 'AANA087' },
    ]);
    expect(summary).toMatchObject({ travelers: 'Lizza, Juan', startsOn: '02/10/2026', endsOn: '15/10/2026', vehicles: 'AANA087, BBB123' });
  });
});
