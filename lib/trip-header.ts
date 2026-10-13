import { formatDateDisplay } from './date-utils';

export type HeaderTrip = {
  startsOn: string;
  endsOn: string;
  travelerName?: string | null;
  companionName?: string | null;
  vehiclePlate?: string | null;
};

export type TripHeaderSummary = {
  travelers: string;
  companions: string;
  startsOn: string;
  endsOn: string;
  vehicles: string;
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).join(', ');
}

// Resume o cabeçalho dos relatórios para uma ou várias viagens: com uma só
// viagem são os dados dela; com várias, juntam-se viajantes e veículos
// diferentes e as datas viram o período (primeira saída → último retorno).
export function summarizeTrips(trips: HeaderTrip[]): TripHeaderSummary | null {
  if (trips.length === 0) return null;
  const starts = trips.map((trip) => trip.startsOn).filter(Boolean).sort();
  const ends = trips.map((trip) => trip.endsOn).filter(Boolean).sort();
  const start = starts[0] ?? '';
  const end = ends[ends.length - 1] ?? '';
  return {
    travelers: unique(trips.map((trip) => trip.travelerName)),
    companions: unique(trips.map((trip) => trip.companionName)),
    startsOn: formatDateDisplay(start) || start,
    endsOn: formatDateDisplay(end) || end,
    vehicles: unique(trips.map((trip) => trip.vehiclePlate)),
  };
}
