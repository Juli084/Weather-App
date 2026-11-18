import { expect, test, type Page } from '@playwright/test';

const LUGARES = [
  { id: 3447399, name: 'Sorocaba', admin1: 'São Paulo', country: 'Brasil', latitude: -23.5, longitude: -47.46 },
  { id: 3448000, name: 'Santa Rita', admin1: 'Paraíba', country: 'Brasil', latitude: -7.11, longitude: -34.98 },
];

function previsao() {
  const horas = Array.from({ length: 48 }, (_, i) => `2026-11-${18 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`);
  return {
    current: { time: '2026-11-18T14:00', temperature_2m: 27.4, apparent_temperature: 29, relative_humidity_2m: 60, weather_code: 2, wind_speed_10m: 11, is_day: 1 },
    hourly: {
      time: horas,
      temperature_2m: horas.map((_, i) => 22 + (i % 7)),
      precipitation_probability: horas.map((_, i) => (i === 17 ? 80 : 10)),
      weather_code: horas.map((_, i) => (i === 17 ? 81 : 2)),
      is_day: horas.map((_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
    },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => `2026-11-${18 + i}`),
      weather_code: [2, 81, 3, 0, 61, 1, 95],
      temperature_2m_max: [29, 26, 25, 30, 24, 28, 27],
      temperature_2m_min: [18, 17, 16, 19, 15, 18, 17],
      precipitation_probability_max: [80, 90, 20, 0, 60, 10, 70],
      uv_index_max: [9.3, 5, 4, 10, 3, 8, 6],
      sunrise: Array.from({ length: 7 }, (_, i) => `2026-11-${18 + i}T05:12`),
      sunset: Array.from({ length: 7 }, (_, i) => `2026-11-${18 + i}T18:41`),
    },
  };
}

async function simular(page: Page, { semAr = false } = {}) {
  const consultas: URL[] = [];
  await page.route('https://geocoding-api.open-meteo.com/**', (rota) => {
    const url = new URL(rota.request().url());
    consultas.push(url);
    const nome = (url.searchParams.get('name') ?? '').toLowerCase();
    return rota.fulfill({ json: nome === 'xyzxyz' ? {} : { results: LUGARES.filter((l) => l.name.toLowerCase().startsWith(nome.slice(0, 3))) } });
  });
  await page.route('https://api.open-meteo.com/**', (rota) => {
    consultas.push(new URL(rota.request().url()));
    return rota.fulfill({ json: previsao() });
  });
  await page.route('https://air-quality-api.open-meteo.com/**', (rota) => {
    consultas.push(new URL(rota.request().url()));
    return semAr ? rota.fulfill({ status: 500, body: '' }) : rota.fulfill({ json: { current: { us_aqi: 72, pm2_5: 18.4, pm10: 30 } } });
  });
  return consultas;
}

test('busca a cidade pela sugestão e mostra a previsão completa', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(mensagem.text());
  });
  const consultas = await simular(page);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Cidade' }).fill('Soro');
  await page.getByRole('option', { name: /Sorocaba/ }).click();

  await expect(page.getByRole('heading', { name: 'Sorocaba' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Agora' }).getByText('27°', { exact: true })).toBeVisible();
  await expect(page.getByText('Chance de chuva a partir das 17h (80%). Leve guarda-chuva.', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: /Temperatura nas próximas 24 horas/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Próximos 7 dias' }).getByRole('listitem')).toHaveCount(7);
  await expect(page.getByRole('region', { name: 'Qualidade do ar' })).toContainText('72 Moderada');
  await expect(page.getByRole('region', { name: 'Índice UV hoje' })).toContainText('Muito alto');
  await expect(page.getByText('Nascer do sol:')).toBeAttached();

  const previsaoPedida = consultas.find((u) => u.hostname === 'api.open-meteo.com')!;
  expect(previsaoPedida.searchParams.get('latitude')).toBe('-23.5');
  expect(previsaoPedida.searchParams.get('forecast_days')).toBe('7');
  expect(erros).toEqual([]);
});

test('guarda favoritas e recentes, e mostra a previsão mesmo sem qualidade do ar', async ({ page }) => {
  await simular(page, { semAr: true });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Cidade' }).fill('Sorocaba');
  await page.getByRole('combobox', { name: 'Cidade' }).press('Enter');
  await page.getByRole('button', { name: 'Guardar Sorocaba nas favoritas' }).click();
  await expect(page.getByRole('region', { name: 'Qualidade do ar' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Próximos 7 dias' })).toBeVisible();

  await page.reload();
  await page.getByRole('navigation', { name: 'Cidades salvas e recentes' }).getByRole('button', { name: 'Sorocaba' }).click();
  await expect(page.getByRole('button', { name: 'Tirar Sorocaba das favoritas' })).toBeVisible();
});

test('avisa quando a cidade não existe', async ({ page }) => {
  await simular(page);
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Cidade' }).fill('xyzxyz');
  await page.getByRole('combobox', { name: 'Cidade' }).press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Não encontrei "xyzxyz". Confira o nome da cidade.');
});

test('usa a localização do aparelho sem guardar as coordenadas', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -23.55, longitude: -46.63 });
  const consultas = await simular(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Usar minha localização' }).click();
  await expect(page.getByRole('heading', { name: 'Sua localização' })).toBeVisible();
  expect(consultas.find((u) => u.hostname === 'api.open-meteo.com')?.searchParams.get('latitude')).toBe('-23.55');
  const guardado = await page.evaluate(() => localStorage.getItem('tempo-agora:locais:v1'));
  expect(guardado ?? '').not.toContain('-23.55');
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
