import { defineConfig, devices } from '@playwright/test';

// As respostas da Open-Meteo são simuladas nos testes (page.route), sem depender da rede.
const canal = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4179', locale: 'pt-BR', trace: 'retain-on-failure' },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'], ...canal } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...canal } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4179 --strictPort',
    url: 'http://localhost:4179',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
