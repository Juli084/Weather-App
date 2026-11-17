export default function Card({ dados }) {
  return (
    <section className="bg-white p-6 mt-10 rounded-lg shadow-md min-w-[260px]" aria-live="polite">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-700">{dados.cidade}</h2>
        <span className="text-slate-500 text-sm font-medium">{dados.regiao}</span>
      </div>

      <div className="font-bold text-slate-700 flex justify-center mt-4 mb-2">
        <span className="text-8xl">{dados.temperatura}</span>
        <span className="text-3xl mt-2">°C</span>
      </div>

      <p className="text-center text-slate-700 font-medium">{dados.condicao}</p>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-sm text-slate-500">
        <div>
          <dt>Sensação</dt>
          <dd className="font-semibold text-slate-700">{dados.sensacao} °C</dd>
        </div>
        <div>
          <dt>Umidade</dt>
          <dd className="font-semibold text-slate-700">{dados.umidade}%</dd>
        </div>
        <div>
          <dt>Vento</dt>
          <dd className="font-semibold text-slate-700">{dados.vento} km/h</dd>
        </div>
      </dl>
    </section>
  );
}
