// Open-Meteo: dados abertos (CC BY 4.0), sem chave de API.
const GEOCODIFICACAO = 'https://geocoding-api.open-meteo.com/v1/search';
const PREVISAO = 'https://api.open-meteo.com/v1/forecast';

// Códigos de tempo da OMM (WMO), usados pela Open-Meteo.
const CONDICOES = {
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

export class CidadeNaoEncontrada extends Error {}

async function obterJson(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url.hostname} respondeu ${resposta.status}`);
  return resposta.json();
}

export async function buscarClima(cidade) {
  const nome = cidade.trim();

  const geo = new URL(GEOCODIFICACAO);
  geo.search = new URLSearchParams({ name: nome, count: '1', language: 'pt', format: 'json' });
  const { results } = await obterJson(geo);
  if (!results?.length) throw new CidadeNaoEncontrada(nome);
  const lugar = results[0];

  const previsao = new URL(PREVISAO);
  previsao.search = new URLSearchParams({
    latitude: String(lugar.latitude),
    longitude: String(lugar.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const { current } = await obterJson(previsao);

  return {
    cidade: lugar.name,
    regiao: [lugar.admin1, lugar.country].filter(Boolean).join(', '),
    temperatura: Math.round(current.temperature_2m),
    sensacao: Math.round(current.apparent_temperature),
    umidade: Math.round(current.relative_humidity_2m),
    vento: Math.round(current.wind_speed_10m),
    condicao: CONDICOES[current.weather_code] ?? 'Condição não informada',
  };
}
