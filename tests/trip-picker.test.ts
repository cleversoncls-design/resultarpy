import { describe, expect, it } from 'vitest';
import { exactTripMatch, filterTrips } from '../lib/trip-picker';

const trips = [
  { id: 1, tripCode: 'TR-2026-8349', destination: 'Asunción', travelerName: 'Juan Pérez', clientName: 'Cliente A', status: 'Aprovada' },
  { id: 2, tripCode: 'TR-2026-2574', destination: 'Nueva Esperanza', travelerName: 'Lizza Caceres', clientName: 'Grupo Apane S.A.', status: 'Finalizada' },
  { id: 3, tripCode: 'TR-2026-3720', destination: 'San Lorenzo', travelerName: 'Lizza Caceres', clientName: 'Cliente B', status: 'Em prestação' },
];

describe('filterTrips', () => {
  it('sem texto devolve todas', () => expect(filterTrips(trips, '  ')).toHaveLength(3));
  it('busca por código parcial', () => expect(filterTrips(trips, '2574').map((t) => t.id)).toEqual([2]));
  it('ignora acentos e maiúsculas', () => expect(filterTrips(trips, 'asuncion').map((t) => t.id)).toEqual([1]));
  it('vários termos precisam coincidir', () => expect(filterTrips(trips, 'lizza lorenzo').map((t) => t.id)).toEqual([3]));
  it('busca por viajante e cliente', () => {
    expect(filterTrips(trips, 'lizza')).toHaveLength(2);
    expect(filterTrips(trips, 'apane').map((t) => t.id)).toEqual([2]);
  });
  it('sem resultado devolve lista vazia', () => expect(filterTrips(trips, 'zzz')).toEqual([]));
});

describe('exactTripMatch', () => {
  it('encontra pelo código completo, sem diferenciar maiúsculas', () => expect(exactTripMatch(trips, 'tr-2026-2574')?.id).toBe(2));
  it('código parcial não seleciona', () => expect(exactTripMatch(trips, 'TR-2026-25')).toBeUndefined());
});
