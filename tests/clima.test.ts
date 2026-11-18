import { describe, expect, it } from 'vitest';
import { categoriaDoAr, categoriaDoUv, icone, montarPrevisao, resumoDasProximasHoras, type Hora } from '../src/clima.ts';
import { lerLocais } from '../src/locais.ts';

const hora = (h: number, temperatura: number, chanceDeChuva = 0): Hora => ({
  hora: `2026-11-18T${String(h).padStart(2, '0')}:00`,
  temperatura,
  chanceDeChuva,
  codigo: 2,
  dia: true,
});

describe('resumo das próximas horas', () => {
  it('avisa a primeira hora com chance de chuva de 50% ou mais', () => {
    const horas = [hora(14, 27), hora(15, 28, 30), hora(16, 26, 70), hora(17, 24, 90)];
    expect(resumoDasProximasHoras(horas)).toBe(
      'Chance de chuva a partir das 16h (70%). Leve guarda-chuva. Temperatura entre 24° e 28° nas próximas 12 horas.',
    );
  });

  it('diz que não chove quando nenhuma hora chega a 50%', () => {
    expect(resumoDasProximasHoras([hora(8, 20, 10), hora(9, 22, 40)])).toBe(
      'Sem chuva prevista nas próximas 12 horas. Temperatura entre 20° e 22°.',
    );
  });

  it('olha só as 12 primeiras horas', () => {
    const horas = [...Array.from({ length: 12 }, (_, i) => hora(i, 20)), hora(12, 20, 100)];
    expect(resumoDasProximasHoras(horas)).toBe('Sem chuva prevista nas próximas 12 horas. Temperatura 20°.');
  });
});

describe('categorias', () => {
  it('segue a escala US AQI', () => {
    expect([0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301].map((i) => categoriaDoAr(i).nivel)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });

  it('segue as faixas de UV da OMS', () => {
    expect([0, 2.9, 3, 5.9, 6, 7.9, 8, 10.9, 11].map((uv) => categoriaDoUv(uv).nome)).toEqual([
      'Baixo',
      'Baixo',
      'Moderado',
      'Moderado',
      'Alto',
      'Alto',
      'Muito alto',
      'Muito alto',
      'Extremo',
    ]);
  });

  it('escolhe ícone de dia e de noite para céu limpo', () => {
    expect(icone(0, true)).toBe('sol');
    expect(icone(0, false)).toBe('lua');
    expect(icone(81)).toBe('chuva');
    expect(icone(95)).toBe('trovoada');
  });
});

describe('montagem da previsão', () => {
  it('começa as 24 horas na hora atual e arredonda os valores', () => {
    const horas = Array.from({ length: 48 }, (_, i) => `2026-11-${18 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`);
    const previsao = montarPrevisao(
      {
        current: { time: '2026-11-18T14:15', temperature_2m: 27.6, apparent_temperature: 29.4, relative_humidity_2m: 61.2, weather_code: 2, wind_speed_10m: 12.4, is_day: 1 },
        hourly: {
          time: horas,
          temperature_2m: horas.map((_, i) => 20 + i * 0.1),
          precipitation_probability: horas.map((_, i) => (i === 15 ? null : i)),
          weather_code: horas.map(() => 3),
          is_day: horas.map((_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
        },
        daily: {
          time: ['2026-11-18'],
          weather_code: [80],
          temperature_2m_max: [29.5],
          temperature_2m_min: [18.4],
          precipitation_probability_max: [null],
          uv_index_max: [9.37],
          sunrise: ['2026-11-18T05:12'],
          sunset: ['2026-11-18T18:41'],
        },
      },
      null,
    );
    expect(previsao.agora).toEqual({ temperatura: 28, sensacao: 29, umidade: 61, vento: 12, codigo: 2, dia: true, hora: '2026-11-18T14:15' });
    expect(previsao.horas).toHaveLength(24);
    expect(previsao.horas[0]?.hora).toBe('2026-11-18T14:00');
    expect(previsao.horas[1]?.chanceDeChuva).toBe(0);
    expect(previsao.dias[0]).toEqual({ data: '2026-11-18', minima: 18, maxima: 30, chanceDeChuva: 0, codigo: 80, uv: 9.4, nascer: '05:12', por: '18:41' });
  });
});

describe('cidades guardadas', () => {
  it('descarta lugar com coordenada impossível ou campo errado', () => {
    const salvo = JSON.stringify({
      favoritos: [
        { id: 1, nome: 'Sorocaba', regiao: 'São Paulo, Brasil', latitude: -23.5, longitude: -47.46 },
        { id: 2, nome: 'Lugar', regiao: '', latitude: 120, longitude: 0 },
        { id: '3', nome: 'Texto', regiao: '', latitude: 0, longitude: 0 },
      ],
      recentes: 'não é lista',
    });
    expect(lerLocais(salvo)).toEqual({
      favoritos: [{ id: 1, nome: 'Sorocaba', regiao: 'São Paulo, Brasil', latitude: -23.5, longitude: -47.46 }],
      recentes: [],
    });
    expect(lerLocais('lixo')).toEqual({ favoritos: [], recentes: [] });
  });
});
