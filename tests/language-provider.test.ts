import { describe, expect, it } from 'vitest';
import { translateText } from '../lib/language-provider';

describe('language provider', () => {
  it('translates shared form labels from Portuguese to Spanish', () => {
    expect(translateText('Cliente', 'es-ES')).toBe('Cliente');
    expect(translateText('Tipos de gasto', 'es-ES')).toBe('Tipos de gasto');
    expect(translateText('Encerrar sessão', 'es-ES')).toBe('Cerrar sesión');
    expect(translateText('Aparência', 'es-ES')).toBe('Apariencia');
    expect(translateText('Viagem vinculada', 'es-ES')).toBe('Viaje vinculado');
    expect(translateText('Nenhuma cidade cadastrada', 'es-ES')).toBe('Ninguna ciudad registrada');
    expect(translateText('Selecionar data', 'es-ES')).toBe('Seleccionar fecha');
    expect(translateText('Informe viagem, cidade, data, quantidade e valor válidos.', 'es-ES')).toBe('Indique viaje, ciudad, fecha, cantidad y valores válidos.');
  });

  it('translates dashboard labels and empty states to Spanish', () => {
    expect(translateText('Nenhuma viagem persistida', 'es-ES')).toBe('Ningún viaje persistido');
    expect(translateText('Veículos cadastrados', 'es-ES')).toBe('Vehículos registrados');
    expect(translateText('Resumo operacional', 'es-ES')).toBe('Resumen operativo');
    expect(translateText('Disponibilidade da frota', 'es-ES')).toBe('Disponibilidad de la flota');
    expect(translateText('Acesso rápido', 'es-ES')).toBe('Acceso rápido');
  });

  it('returns Portuguese text in the default language', () => {
    expect(translateText('Encerrar sessão', 'pt-BR')).toBe('Encerrar sessão');
  });

  it('keeps dynamic catalog values unchanged when no translation exists', () => {
    expect(translateText('Cliente real cadastrado', 'es-ES')).toBe('Cliente real cadastrado');
  });
});
