export type NextTripCandidate = { id: number; status: string; startsOn: string; endsOn: string };

// Viagens encerradas não são "atividade": não pedem mais nenhuma ação.
export const CLOSED_TRIP_STATUSES = ['Cancelada', 'Rejeitada', 'Finalizada'];

/**
 * Escolhe a viagem para o destaque "Próxima atividade" da tela inicial:
 * 1) a viagem em andamento (hoje entre saída e retorno);
 * 2) senão, a próxima a começar;
 * 3) senão, a mais recente que ainda não foi encerrada (ex.: aguardando prestação de contas).
 * Viagens canceladas, rejeitadas ou finalizadas nunca aparecem; sem candidata, devolve undefined.
 */
export function pickNextTrip<T extends NextTripCandidate>(trips: T[], today: string): T | undefined {
  const open = trips.filter((trip) => !CLOSED_TRIP_STATUSES.includes(trip.status));
  const ongoing = open.filter((trip) => trip.startsOn <= today && trip.endsOn >= today).sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  if (ongoing.length > 0) return ongoing[0];
  const upcoming = open.filter((trip) => trip.startsOn > today).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (upcoming.length > 0) return upcoming[0];
  return open.filter((trip) => trip.endsOn < today).sort((a, b) => b.endsOn.localeCompare(a.endsOn))[0];
}
