import { useId, useRef, useState } from 'react';
import { buscarClima, CidadeNaoEncontrada } from './services/clima';
import Card from './components/Card';

export default function App() {
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState({ tipo: 'inicio' });
  const ultimaBusca = useRef(0);
  const idCampo = useId();

  async function pesquisar(event) {
    event.preventDefault();
    if (!cidade.trim()) return;

    // Se o usuário pesquisar de novo antes da resposta, vale só a última.
    const busca = ++ultimaBusca.current;
    setEstado({ tipo: 'carregando' });

    try {
      const dados = await buscarClima(cidade);
      if (busca === ultimaBusca.current) setEstado({ tipo: 'ok', dados });
    } catch (erro) {
      if (busca !== ultimaBusca.current) return;
      const mensagem =
        erro instanceof CidadeNaoEncontrada
          ? `Não encontrei "${erro.message}". Confira o nome da cidade.`
          : 'Não foi possível consultar o clima agora. Tente de novo em instantes.';
      setEstado({ tipo: 'erro', mensagem });
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen items-center sm:justify-center p-4 pb-28 sm:pb-4">
      <h1 className="sr-only">Temperatura agora</h1>

      <form onSubmit={pesquisar} className="fixed bottom-0 left-0 w-full flex p-4 sm:static justify-center">
        <label htmlFor={idCampo} className="sr-only">
          Cidade
        </label>
        <input
          id={idCampo}
          type="text"
          placeholder="Cidade"
          autoComplete="address-level2"
          className="p-3 rounded-lg outline-none w-full sm:max-w-[300px] flex-1 bg-white"
          value={cidade}
          onChange={(event) => setCidade(event.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 p-3 rounded-lg ml-3 text-white font-bold disabled:opacity-60"
          disabled={estado.tipo === 'carregando'}
        >
          Pesquisar
        </button>
      </form>

      {estado.tipo === 'inicio' && (
        <p className="mt-10 text-slate-700 font-medium">Pesquise uma cidade para ver a temperatura agora.</p>
      )}
      {estado.tipo === 'carregando' && (
        <p role="status" className="mt-10 text-slate-700 font-medium">
          Consultando...
        </p>
      )}
      {estado.tipo === 'erro' && (
        <p role="alert" className="mt-10 bg-white px-4 py-3 rounded-lg text-red-700 font-medium">
          {estado.mensagem}
        </p>
      )}
      {estado.tipo === 'ok' && <Card dados={estado.dados} />}

      <p className="mt-6 text-xs text-slate-700">
        Dados meteorológicos:{' '}
        <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo.com
        </a>
      </p>
    </div>
  );
}
