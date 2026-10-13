export type PickerTrip = {
  id: number;
  tripCode: string;
  destination: string;
  startsOn?: string | null;
  endsOn?: string | null;
  travelerName?: string | null;
  clientName?: string | null;
  status?: string | null;
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().trim();
}

// Busca dinâmica: todos os termos digitados precisam aparecer no código, destino,
// viajante, cliente ou status da viagem (sem diferenciar maiúsculas/acentos).
export function filterTrips<T extends PickerTrip>(trips: T[], query: string): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return trips;
  return trips.filter((trip) => {
    const haystack = normalize([trip.tripCode, trip.destination, trip.travelerName, trip.clientName, trip.status].filter(Boolean).join(' '));
    return terms.every((term) => haystack.includes(term));
  });
}

// Código digitado por inteiro (ex.: TR-2026-2574) seleciona a viagem direto.
export function exactTripMatch<T extends PickerTrip>(trips: T[], query: string): T | undefined {
  const code = normalize(query);
  if (!code) return undefined;
  return trips.find((trip) => normalize(trip.tripCode) === code);
}
