/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Cabeçalhos da Vercel também no `vite preview`, para os testes rodarem sob a mesma CSP. */
function cabecalhosDeProducao(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const geral = config.headers.find((regra) => regra.source === '/(.*)');
  return Object.fromEntries((geral?.headers ?? []).map(({ key, value }) => [key, value]));
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: { headers: cabecalhosDeProducao() },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
