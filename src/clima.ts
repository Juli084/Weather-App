// Open-Meteo: dados abertos (CC BY 4.0), sem chave de API. Três serviços: geocodificação,
// previsão e qualidade do ar.
const GEOCODIFICACAO = 'https://geocoding-api.open-meteo.com/v1/search';
const PREVISAO = 'https://api.open-meteo.com/v1/forecast';
const QUALIDADE_DO_AR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export interface Lugar {
  id: number;
  nome: string;
  regiao: string;
  latitude: number;
  longitude: number;
}

export interface Hora {
  hora: string;
  temperatura: number;
  chanceDeChuva: number;
  codigo: number;
  dia: boolean;
}

export interface Dia {
  data: string;
  minima: number;
  maxima: number;
  chanceDeChuva: number;
  codigo: number;
  uv: number;
  nascer: string;
  por: string;
}

export interface Previsao {
  agora: {
    temperatura: number;
    sensacao: number;
    umidade: number;
    vento: number;
    codigo: number;
    dia: boolean;
    hora: string;
  };
  horas: Hora[];
  dias: Dia[];
  ar: { indice: number; pm25: number; pm10: number } | null;
}

// Códigos de tempo da OMM (WMO), usados pela Open-Meteo.
export const CONDICOES: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Predomínio de sol',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Neblina',
  48: 'Neblina com geada',
  51: 'Garoa fraca',
  53: 'Garoa',
  55: 'Garoa forte',
  56: 'Garoa congelante fraca',
  57: 'Garoa congelante forte',
  61: 'Chuva fraca',
  63: 'Chuva',
  65: 'Chuva forte',
  66: 'Chuva congelante fraca',
  67: 'Chuva congelante forte',
  71: 'Neve fraca',
  73: 'Neve',
  75: 'Neve forte',
  77: 'Grãos de neve',
  80: 'Pancadas de chuva fracas',
  81: 'Pancadas de chuva',
  82: 'Pancadas de chuva fortes',
  85: 'Pancadas de neve fracas',
  86: 'Pancadas de neve fortes',
  95: 'Trovoada',
  96: 'Trovoada com granizo fraco',
  99: 'Trovoada com granizo forte',
};

export function condicao(codigo: number): string {
  return CONDICOES[codigo] ?? 'Condição não informada';
}

export type Icone = 'sol' | 'lua' | 'sol-nuvem' | 'nuvem' | 'neblina' | 'garoa' | 'chuva' | 'neve' | 'trovoada';

export function icone(codigo: number, dia = true): Icone {
  if (codigo === 0 || codigo === 1) return dia ? 'sol' : 'lua';
  if (codigo === 2) return 'sol-nuvem';
  if (codigo === 3) return 'nuvem';
  if (codigo === 45 || codigo === 48) return 'neblina';
  if (codigo >= 51 && codigo <= 57) return 'garoa';
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'chuva';
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'neve';
  if (codigo >= 95) return 'trovoada';
  return 'nuvem';
}

/** Escala do índice US AQI (EPA), a que a Open-Meteo entrega. */
export function categoriaDoAr(indice: number): { nome: string; conselho: string; nivel: 0 | 1 | 2 | 3 | 4 | 5 } {
  if (indice <= 50) return { nome: 'Boa', conselho: 'Bom para atividades ao ar livre.', nivel: 0 };
  if (indice <= 100) return { nome: 'Moderada', conselho: 'Pessoas muito sensíveis podem sentir algum desconforto.', nivel: 1 };
  if (indice <= 150) return { nome: 'Ruim para grupos sensíveis', conselho: 'Crianças, idosos e quem tem asma devem reduzir esforço ao ar livre.', nivel: 2 };
  if (indice <= 200) return { nome: 'Ruim', conselho: 'Reduza atividades longas ou intensas ao ar livre.', nivel: 3 };
  if (indice <= 300) return { nome: 'Muito ruim', conselho: 'Evite esforço ao ar livre.', nivel: 4 };
  return { nome: 'Perigosa', conselho: 'Fique em ambiente fechado sempre que possível.', nivel: 5 };
}

/** Faixas do índice UV da Organização Mundial da Saúde. */
export function categoriaDoUv(uv: number): { nome: string; conselho: string } {
  if (uv < 3) return { nome: 'Baixo', conselho: 'Não precisa de proteção especial.' };
  if (uv < 6) return { nome: 'Moderado', conselho: 'Use protetor solar e procure sombra perto do meio-dia.' };
  if (uv < 8) return { nome: 'Alto', conselho: 'Protetor, chapéu e óculos; evite o sol entre 10h e 16h.' };
  if (uv < 11) return { nome: 'Muito alto', conselho: 'Evite o sol entre 10h e 16h.' };
  return { nome: 'Extremo', conselho: 'Evite ficar no sol.' };
}

/**
 * Uma frase sobre as próximas 12 horas, para quem só quer saber se leva guarda-chuva.
 * Considera chuva a partir de 50% de chance numa hora.
 */
export function resumoDasProximasHoras(horas: readonly Hora[]): string {
  const proximas = horas.slice(0, 12);
  if (proximas.length === 0) return '';
  const chuvosa = proximas.find((h) => h.chanceDeChuva >= 50);
  const temperaturas = proximas.map((h) => h.temperatura);
  const minima = Math.min(...temperaturas);
  const maxima = Math.max(...temperaturas);
  const faixa = minima === maxima ? `${maxima}°` : `entre ${minima}° e ${maxima}°`;
  if (chuvosa) {
    const horario = chuvosa.hora.slice(11, 13);
    return `Chance de chuva a partir das ${Number(horario)}h (${chuvosa.chanceDeChuva}%). Leve guarda-chuva. Temperatura ${faixa} nas próximas 12 horas.`;
  }
  return `Sem chuva prevista nas próximas 12 horas. Temperatura ${faixa}.`;
}

async function obterJson<T>(url: URL): Promise<T> {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url.hostname} respondeu ${resposta.status}`);
  return resposta.json() as Promise<T>;
}

export async function buscarLugares(nome: string): Promise<Lugar[]> {
  const url = new URL(GEOCODIFICACAO);
  url.search = new URLSearchParams({ name: nome.trim(), count: '6', language: 'pt', format: 'json' }).toString();
  const { results } = await obterJson<{
    results?: { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number }[];
  }>(url);
  return (results ?? []).map((r) => ({
    id: r.id,
    nome: r.name,
    regiao: [r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

interface RespostaDaPrevisao {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[]; is_day: number[] };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    uv_index_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}

/** Junta a resposta da previsão, a partir da hora atual, num formato fácil de mostrar. */
export function montarPrevisao(dados: RespostaDaPrevisao, ar: Previsao['ar']): Previsao {
  const atual = dados.current;
  const horaAtual = atual.time.slice(0, 13);
  const inicio = Math.max(0, dados.hourly.time.findIndex((t) => t.slice(0, 13) === horaAtual));
  const horas = dados.hourly.time.slice(inicio, inicio + 24).map((hora, i) => ({
    hora,
    temperatura: Math.round(dados.hourly.temperature_2m[inicio + i] ?? 0),
    chanceDeChuva: dados.hourly.precipitation_probability[inicio + i] ?? 0,
    codigo: dados.hourly.weather_code[inicio + i] ?? 0,
    dia: dados.hourly.is_day[inicio + i] === 1,
  }));
  const dias = dados.daily.time.map((data, i) => ({
    data,
    minima: Math.round(dados.daily.temperature_2m_min[i] ?? 0),
    maxima: Math.round(dados.daily.temperature_2m_max[i] ?? 0),
    chanceDeChuva: dados.daily.precipitation_probability_max[i] ?? 0,
    codigo: dados.daily.weather_code[i] ?? 0,
    uv: Math.round((dados.daily.uv_index_max[i] ?? 0) * 10) / 10,
    nascer: (dados.daily.sunrise[i] ?? '').slice(11, 16),
    por: (dados.daily.sunset[i] ?? '').slice(11, 16),
  }));
  return {
    agora: {
      temperatura: Math.round(atual.temperature_2m),
      sensacao: Math.round(atual.apparent_temperature),
      umidade: Math.round(atual.relative_humidity_2m),
      vento: Math.round(atual.wind_speed_10m),
      codigo: atual.weather_code,
      dia: atual.is_day === 1,
      hora: atual.time,
    },
    horas,
    dias,
    ar,
  };
}

export async function buscarPrevisao(lugar: Pick<Lugar, 'latitude' | 'longitude'>): Promise<Previsao> {
  const coordenadas = { latitude: String(lugar.latitude), longitude: String(lugar.longitude), timezone: 'auto' };
  const previsao = new URL(PREVISAO);
  previsao.search = new URLSearchParams({
    ...coordenadas,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    forecast_days: '7',
  }).toString();
  const ar = new URL(QUALIDADE_DO_AR);
  ar.search = new URLSearchParams({ ...coordenadas, current: 'us_aqi,pm2_5,pm10' }).toString();

  // A qualidade do ar é um extra: se falhar, a previsão aparece sem ela.
  const [dados, qualidade] = await Promise.all([
    obterJson<RespostaDaPrevisao>(previsao),
    obterJson<{ current?: { us_aqi?: number; pm2_5?: number; pm10?: number } }>(ar).catch(() => null),
  ]);
  const atualDoAr = qualidade?.current;
  return montarPrevisao(
    dados,
    atualDoAr && typeof atualDoAr.us_aqi === 'number'
      ? { indice: Math.round(atualDoAr.us_aqi), pm25: Math.round(atualDoAr.pm2_5 ?? 0), pm10: Math.round(atualDoAr.pm10 ?? 0) }
      : null,
  );
}
