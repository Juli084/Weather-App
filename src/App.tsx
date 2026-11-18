import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  LocateFixed,
  Moon,
  Search,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  buscarLugares,
  buscarPrevisao,
  categoriaDoAr,
  categoriaDoUv,
  condicao,
  icone,
  resumoDasProximasHoras,
  type Hora,
  type Icone,
  type Lugar,
  type Previsao,
} from './clima.ts';
import { alternarFavorito, registrarRecente, useLocais } from './locais.ts';

const ICONES: Record<Icone, LucideIcon> = {
  sol: Sun,
  lua: Moon,
  'sol-nuvem': CloudSun,
  nuvem: Cloud,
  neblina: CloudFog,
  garoa: CloudDrizzle,
  chuva: CloudRain,
  neve: CloudSnow,
  trovoada: CloudLightning,
};

function IconeDoTempo({ codigo, dia = true, tamanho = 24 }: { codigo: number; dia?: boolean; tamanho?: number }) {
  const Componente = ICONES[icone(codigo, dia)];
  const cor = icone(codigo, dia) === 'sol' ? 'text-sol' : icone(codigo, dia) === 'chuva' || icone(codigo, dia) === 'garoa' ? 'text-chuva' : 'text-texto';
  return <Componente size={tamanho} className={cor} aria-hidden="true" />;
}

const DIA_DA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });

function nomeDoDia(data: string, indice: number): string {
  if (indice === 0) return 'Hoje';
  return DIA_DA_SEMANA.format(new Date(`${data}T12:00:00Z`)).replace('.', '');
}

/** Temperatura das próximas 24 horas como linha, com a chance de chuva em barras embaixo. */
function GraficoDeHoras({ horas }: { horas: Hora[] }) {
  if (horas.length < 2) return null;
  const largura = 24 * 44;
  const altura = 120;
  const temperaturas = horas.map((h) => h.temperatura);
  const minima = Math.min(...temperaturas) - 1;
  const maxima = Math.max(...temperaturas) + 1;
  const x = (i: number) => 22 + i * 44;
  const y = (t: number) => 34 + (1 - (t - minima) / (maxima - minima || 1)) * 50;
  return (
    <div className="sem-barra overflow-x-auto">
      <svg
        viewBox={`0 0 ${largura} ${altura + 52}`}
        width={largura}
        height={altura + 52}
        role="img"
        aria-label={`Temperatura nas próximas 24 horas, de ${Math.min(...temperaturas)}° a ${Math.max(...temperaturas)}°`}
      >
        <polyline
          points={horas.map((h, i) => `${x(i)},${y(h.temperatura)}`).join(' ')}
          fill="none"
          stroke="var(--color-sol)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {horas.map((h, i) => (
          <g key={h.hora}>
            <circle cx={x(i)} cy={y(h.temperatura)} r="3" fill="var(--color-sol)" />
            <text x={x(i)} y={y(h.temperatura) - 10} textAnchor="middle" fontSize="13" fill="var(--color-texto)" fontWeight="600">
              {h.temperatura}°
            </text>
            <rect x={x(i) - 9} y={altura + 4 - (h.chanceDeChuva / 100) * 28} width="18" height={(h.chanceDeChuva / 100) * 28} rx="3" fill="var(--color-chuva)" opacity="0.85" />
            <text x={x(i)} y={altura + 20} textAnchor="middle" fontSize="11" fill="var(--color-chuva)">
              {h.chanceDeChuva >= 20 ? `${h.chanceDeChuva}%` : ''}
            </text>
            <text x={x(i)} y={altura + 40} textAnchor="middle" fontSize="12" fill="var(--color-suave)">
              {i === 0 ? 'Agora' : `${Number(h.hora.slice(11, 13))}h`}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function Cartao({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`rounded-3xl border border-borda bg-vidro p-4 backdrop-blur ${className}`}>
      <h2 id={id} className="text-xs font-semibold tracking-wide text-suave uppercase">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Painel({ lugar, previsao }: { lugar: Lugar; previsao: Previsao }) {
  const { favoritos } = useLocais();
  const favorito = favoritos.some((l) => l.id === lugar.id);
  const hoje = previsao.dias[0];
  const ar = previsao.ar ? categoriaDoAr(previsao.ar.indice) : null;
  const uv = hoje ? categoriaDoUv(hoje.uv) : null;
  const extremos = previsao.dias.length
    ? { min: Math.min(...previsao.dias.map((d) => d.minima)), max: Math.max(...previsao.dias.map((d) => d.maxima)) }
    : null;

  return (
    <div className="space-y-4">
      <section aria-label="Agora" className="pt-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-semibold">{lugar.nome}</h2>
          {lugar.id > 0 ? (
            <button
              type="button"
              onClick={() => alternarFavorito(lugar)}
              aria-pressed={favorito}
              aria-label={favorito ? `Tirar ${lugar.nome} das favoritas` : `Guardar ${lugar.nome} nas favoritas`}
              className="grid size-9 place-items-center rounded-full hover:bg-vidro"
            >
              <Star size={20} className="text-sol" fill={favorito ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="text-sm text-suave">{lugar.regiao}</p>
        <p className="mt-2 text-7xl font-light tracking-tight">{previsao.agora.temperatura}°</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-lg">
          <IconeDoTempo codigo={previsao.agora.codigo} dia={previsao.agora.dia} />
          {condicao(previsao.agora.codigo)}
        </p>
        {hoje ? (
          <p className="mt-1 text-suave">
            Máx. {hoje.maxima}° · Mín. {hoje.minima}°
          </p>
        ) : null}
        <p className="mx-auto mt-4 max-w-md rounded-2xl bg-vidro px-4 py-3 text-sm">{resumoDasProximasHoras(previsao.horas)}</p>
      </section>

      <Cartao titulo="Próximas 24 horas">
        <GraficoDeHoras horas={previsao.horas} />
      </Cartao>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Cartao titulo="Próximos 7 dias">
          <ul className="divide-y divide-borda">
            {previsao.dias.map((dia, i) => (
              <li key={dia.data} className="grid grid-cols-[3.5rem_2rem_3rem_1fr] items-center gap-2 py-2.5 text-sm">
                <span className="font-medium capitalize">{nomeDoDia(dia.data, i)}</span>
                <IconeDoTempo codigo={dia.codigo} tamanho={22} />
                <span className="text-xs text-chuva">{dia.chanceDeChuva >= 20 ? `${dia.chanceDeChuva}%` : ''}</span>
                <span className="flex items-center gap-2">
                  <span className="w-8 text-right text-suave">{dia.minima}°</span>
                  {extremos ? (
                    <span className="relative h-1.5 flex-1 rounded-full bg-vidro" aria-hidden="true">
                      <span
                        className="absolute h-full rounded-full bg-gradient-to-r from-chuva to-sol"
                        style={{
                          left: `${((dia.minima - extremos.min) / (extremos.max - extremos.min || 1)) * 100}%`,
                          right: `${100 - ((dia.maxima - extremos.min) / (extremos.max - extremos.min || 1)) * 100}%`,
                        }}
                      />
                    </span>
                  ) : null}
                  <span className="w-8">{dia.maxima}°</span>
                </span>
              </li>
            ))}
          </ul>
        </Cartao>

        <div className="grid grid-cols-2 gap-4">
          <Cartao titulo="Sensação">
            <p className="flex items-center gap-2 text-3xl font-light">
              <Thermometer size={22} className="text-suave" aria-hidden="true" />
              {previsao.agora.sensacao}°
            </p>
          </Cartao>
          <Cartao titulo="Umidade">
            <p className="flex items-center gap-2 text-3xl font-light">
              <Droplets size={22} className="text-chuva" aria-hidden="true" />
              {previsao.agora.umidade}%
            </p>
          </Cartao>
          <Cartao titulo="Vento">
            <p className="flex items-center gap-2 text-3xl font-light">
              <Wind size={22} className="text-suave" aria-hidden="true" />
              {previsao.agora.vento}
              <span className="text-base text-suave">km/h</span>
            </p>
          </Cartao>
          {hoje && uv ? (
            <Cartao titulo="Índice UV hoje">
              <p className="text-3xl font-light">
                {hoje.uv.toLocaleString('pt-BR')} <span className="text-base">{uv.nome}</span>
              </p>
              <p className="mt-1 text-xs text-suave">{uv.conselho}</p>
            </Cartao>
          ) : null}
          {hoje ? (
            <Cartao titulo="Sol" className="col-span-2">
              <p className="flex items-center justify-around text-lg">
                <span className="flex items-center gap-2">
                  <Sunrise size={22} className="text-sol" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Nascer do sol: </span>
                    {hoje.nascer}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Sunset size={22} className="text-sol" aria-hidden="true" />
                  <span>
                    <span className="sr-only">Pôr do sol: </span>
                    {hoje.por}
                  </span>
                </span>
              </p>
            </Cartao>
          ) : null}
          {previsao.ar && ar ? (
            <Cartao titulo="Qualidade do ar" className="col-span-2">
              <p className="text-3xl font-light">
                {previsao.ar.indice} <span className="text-base">{ar.nome}</span>
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-300 via-50% to-fuchsia-500" aria-hidden="true">
                <span
                  className="relative -top-0.5 block size-2.5 rounded-full border-2 border-ceu bg-texto"
                  style={{ left: `calc(${Math.min(100, (previsao.ar.indice / 300) * 100)}% - 5px)` }}
                />
              </div>
              <p className="mt-2 text-xs text-suave">
                {ar.conselho} Partículas finas (PM2,5): {previsao.ar.pm25} µg/m³. Índice US AQI.
              </p>
            </Cartao>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Estado =
  | { tipo: 'inicio' }
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'ok'; lugar: Lugar; previsao: Previsao };

export function App() {
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<Lugar[] | null>(null);
  // A lista só abre enquanto a pessoa digita; escolher uma cidade fecha até a próxima tecla.
  const [digitando, setDigitando] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicio' });
  const { favoritos, recentes } = useLocais();
  const pedido = useRef(0);
  const idDaLista = useId();

  // Sugestões enquanto digita, para escolher entre cidades de mesmo nome.
  useEffect(() => {
    const nome = termo.trim();
    if (nome.length < 3) return;
    let cancelado = false;
    const espera = setTimeout(() => {
      buscarLugares(nome)
        .then((lugares) => {
          if (!cancelado) setSugestoes(lugares);
        })
        .catch(() => {
          if (!cancelado) setSugestoes([]);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [termo]);

  async function abrir(lugar: Lugar, lembrar = true) {
    const numero = ++pedido.current;
    setDigitando(false);
    setSugestoes(null);
    setEstado({ tipo: 'carregando' });
    try {
      const previsao = await buscarPrevisao(lugar);
      // Se duas consultas se cruzarem, vale a última.
      if (numero !== pedido.current) return;
      setEstado({ tipo: 'ok', lugar, previsao });
      if (lembrar) registrarRecente(lugar);
    } catch {
      if (numero === pedido.current) setEstado({ tipo: 'erro', mensagem: 'Não foi possível carregar a previsão. Confira a conexão.' });
    }
  }

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    const nome = termo.trim();
    if (!nome) return;
    if (sugestoes?.[0]) return abrir(sugestoes[0]);
    setEstado({ tipo: 'carregando' });
    try {
      const lugares = await buscarLugares(nome);
      if (lugares[0]) await abrir(lugares[0]);
      else setEstado({ tipo: 'erro', mensagem: `Não encontrei "${nome}". Confira o nome da cidade.` });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Não foi possível buscar a cidade. Confira a conexão.' });
    }
  }

  function usarLocalizacao() {
    if (!('geolocation' in navigator)) {
      setEstado({ tipo: 'erro', mensagem: 'Este navegador não informa a localização.' });
      return;
    }
    setEstado({ tipo: 'carregando' });
    navigator.geolocation.getCurrentPosition(
      // A localização exata não é guardada: entra só na consulta da previsão.
      (posicao) =>
        abrir(
          { id: -1, nome: 'Sua localização', regiao: 'Posição informada pelo navegador', latitude: posicao.coords.latitude, longitude: posicao.coords.longitude },
          false,
        ),
      () => setEstado({ tipo: 'erro', mensagem: 'Sem permissão para usar a localização. Busque pelo nome da cidade.' }),
      { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
    );
  }

  const atalhos = [...favoritos, ...recentes.filter((r) => !favoritos.some((f) => f.id === r.id))].slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-lg font-bold">Tempo agora</h1>
        <form onSubmit={buscar} role="search" className="relative w-full sm:w-96">
          <label htmlFor="cidade" className="sr-only">
            Cidade
          </label>
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-suave" />
          <input
            id="cidade"
            role="combobox"
            aria-expanded={Boolean(digitando && sugestoes?.length && termo.trim().length >= 3)}
            aria-controls={idDaLista}
            aria-autocomplete="list"
            autoComplete="off"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setDigitando(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDigitando(false);
            }}
            placeholder="Buscar cidade"
            className="h-11 w-full rounded-full border border-borda bg-vidro pr-12 pl-9 placeholder:text-suave focus:border-sol focus:outline-none"
          />
          <button
            type="button"
            onClick={usarLocalizacao}
            aria-label="Usar minha localização"
            className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-suave hover:text-texto"
          >
            <LocateFixed size={18} aria-hidden="true" />
          </button>
          {digitando && sugestoes?.length && termo.trim().length >= 3 ? (
            <ul id={idDaLista} role="listbox" aria-label="Cidades encontradas" className="absolute top-12 right-0 left-0 z-10 overflow-hidden rounded-2xl border border-borda bg-ceu shadow-2xl">
              {sugestoes.map((lugar) => (
                <li key={lugar.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => abrir(lugar)} className="block w-full px-4 py-2.5 text-left hover:bg-vidro">
                    <span className="font-medium">{lugar.nome}</span>
                    <span className="block text-xs text-suave">{lugar.regiao}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      </header>

      {atalhos.length ? (
        <nav aria-label="Cidades salvas e recentes" className="sem-barra mt-3 flex gap-2 overflow-x-auto">
          {atalhos.map((lugar) => (
            <button key={lugar.id} type="button" onClick={() => abrir(lugar)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-borda px-3 py-1.5 text-sm hover:bg-vidro">
              {favoritos.some((f) => f.id === lugar.id) ? <Star size={13} className="text-sol" fill="currentColor" aria-hidden="true" /> : null}
              {lugar.nome}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="mt-6" aria-live="polite">
        {estado.tipo === 'inicio' ? (
          <div className="rounded-3xl border border-borda bg-vidro px-6 py-12 text-center">
            <CloudSun size={48} className="mx-auto text-sol" aria-hidden="true" />
            <p className="mt-4 text-lg">Busque uma cidade ou use sua localização.</p>
            <p className="mt-1 text-sm text-suave">Previsão por hora e para 7 dias, qualidade do ar e índice UV.</p>
          </div>
        ) : null}
        {estado.tipo === 'carregando' ? <p className="py-16 text-center text-suave">Carregando a previsão...</p> : null}
        {estado.tipo === 'erro' ? (
          <p role="alert" className="rounded-3xl border border-borda bg-vidro px-6 py-8 text-center">
            {estado.mensagem}
          </p>
        ) : null}
        {estado.tipo === 'ok' ? <Painel lugar={estado.lugar} previsao={estado.previsao} /> : null}
      </main>

      <footer className="mt-10 text-xs text-suave">
        Dados de tempo e qualidade do ar da{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">
          Open-Meteo
        </a>
        , sob licença{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">
          CC BY 4.0
        </a>
        .
      </footer>
    </div>
  );
}
