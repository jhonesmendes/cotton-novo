// Barra de progresso da carga: carregado (cor cheia) + programado ainda não
// carregado (cor clara) sobre o total. Os números vêm sempre escritos ao lado,
// a cor não carrega a informação sozinha.
export default function BarraProgresso({ total, programado, carregado, tamanho = 'md', legenda = true }: {
  total: number;
  programado: number;
  carregado: number;
  tamanho?: 'sm' | 'md' | 'lg';
  legenda?: boolean;
}) {
  const pct = (v: number) => (total > 0 ? Math.min(100, Math.max(0, (v / total) * 100)) : 0);
  const pCarregado = pct(carregado);
  const pProgramado = Math.max(0, pct(programado) - pCarregado);
  const altura = tamanho === 'sm' ? 'h-1.5' : tamanho === 'lg' ? 'h-3' : 'h-2';
  const n = (v: number) => v.toLocaleString('pt-BR');
  return (
    <div className="min-w-0" title={`Carregado ${n(carregado)} · Programado ${n(programado)} · Total ${n(total)} fardos`}>
      <div className={`flex w-full overflow-hidden rounded-full bg-gray-200 ${altura}`} role="img"
        aria-label={`${n(carregado)} de ${n(total)} fardos carregados, ${n(programado)} programados`}>
        <div className="bg-indigo-600" style={{ width: `${pCarregado}%` }} />
        <div className="bg-indigo-300" style={{ width: `${pProgramado}%` }} />
      </div>
      {legenda && (
        <p className="mt-1 flex justify-between gap-2 text-[11px] text-gray-500">
          <span><strong className="text-gray-800">{n(carregado)}</strong> de {n(total)} carregados</span>
          <span>{Math.round(pct(carregado))}%</span>
        </p>
      )}
    </div>
  );
}
