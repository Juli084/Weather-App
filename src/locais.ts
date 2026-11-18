import { useSyncExternalStore } from 'react';
import type { Lugar } from './clima.ts';

/*
 * Cidades favoritas e buscas recentes, guardadas no navegador e conferidas ao ler:
 * coordenadas precisam ser números dentro do globo.
 */

interface Locais {
  favoritos: Lugar[];
  recentes: Lugar[];
}

const CHAVE = 'tempo-agora:locais:v1';
const VAZIO: Locais = { favoritos: [], recentes: [] };
const ouvintes = new Set<() => void>();
let cache: Locais | null = null;

function lugarValido(item: unknown): item is Lugar {
  if (typeof item !== 'object' || item === null) return false;
  const l = item as Record<string, unknown>;
  return (
    Number.isInteger(l.id) &&
    typeof l.nome === 'string' &&
    typeof l.regiao === 'string' &&
    typeof l.latitude === 'number' &&
    typeof l.longitude === 'number' &&
    Math.abs(l.latitude) <= 90 &&
    Math.abs(l.longitude) <= 180
  );
}

export function lerLocais(texto: string | null): Locais {
  try {
    const bruto = (texto ? JSON.parse(texto) : {}) as Record<string, unknown>;
    const lista = (valor: unknown) => (Array.isArray(valor) ? valor.filter(lugarValido).slice(0, 8) : []);
    return { favoritos: lista(bruto.favoritos), recentes: lista(bruto.recentes) };
  } catch {
    return VAZIO;
  }
}

function carregar(): Locais {
  if (cache) return cache;
  try {
    cache = lerLocais(localStorage.getItem(CHAVE));
  } catch {
    cache = VAZIO;
  }
  return cache;
}

function salvar(locais: Locais) {
  cache = locais;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(locais));
  } catch {
    // Sem armazenamento, vale só nesta aba.
  }
  ouvintes.forEach((ouvir) => ouvir());
}

export function registrarRecente(lugar: Lugar) {
  const atual = carregar();
  salvar({ ...atual, recentes: [lugar, ...atual.recentes.filter((l) => l.id !== lugar.id)].slice(0, 5) });
}

export function alternarFavorito(lugar: Lugar) {
  const atual = carregar();
  const ja = atual.favoritos.some((l) => l.id === lugar.id);
  salvar({ ...atual, favoritos: ja ? atual.favoritos.filter((l) => l.id !== lugar.id) : [...atual.favoritos, lugar].slice(0, 8) });
}

export function useLocais(): Locais {
  return useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    carregar,
    () => VAZIO,
  );
}
