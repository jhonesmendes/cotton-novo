import { STATUS_LABELS, VeiculoStatus } from '@/utils/status';
import { formatDateTime, formatMoney } from '@/utils/format';

// Tela "Posição de caminhões" do cliente — mesma para o link temporário e o
// Visitante logado. Conta veículos por etapa da timeline (D29). Nunca mostra
// frete motorista, margem, motorista nem dado interno; frete empresa é visível.
export interface DadosPosicao {
  cliente: { id: number; nome: string } | null;
  atualizadoEm: string;
  etapas: VeiculoStatus[];
  totalAtivo: number;
  instrucoes: number;
  totaisPorEtapa: Record<string, number>;
  linhas: {
    instrucao: string; origem: string | null; localColeta: string | null; destino: string | null; localEntrega: string | null;
    tipoFardo: string; freteEmpresa: number; totalFardos: number; veiculos: number; porEtapa: Record<string, number>;
  }[];
  linkValidoAte?: string;
}

const rotuloEtapa = (e: VeiculoStatus) => STATUS_LABELS[e] ?? e;

export default function PosicaoCliente({ dados, rodapeExtra }: { dados: DadosPosicao; rodapeExtra?: React.ReactNode }) {
  // Colunas de etapas sem nenhum veículo do cliente ficam escondidas.
  const etapasComVeiculo = dados.etapas.filter((e) => dados.totaisPorEtapa[e] > 0);
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-4">
        <img src="/logo-fibra.jpeg" alt="Fibra Forte" className="h-12 w-12 rounded-ui-sm object-contain" />
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-ui-text">Posição de caminhões</h1>
          <p className="text-sm text-ui-text-muted">{dados.cliente?.nome}</p>
        </div>
        <p className="text-xs text-ui-text-muted">Atualizado em {formatDateTime(dados.atualizadoEm)}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        <div className="ui-card p-3 text-center lg:col-span-1">
          <p className="text-2xl font-bold text-ui-text">{dados.totalAtivo}</p>
          <p className="text-xs font-medium text-ui-text-muted">Total ativo</p>
          <p className="text-[10px] text-ui-text-muted">{dados.instrucoes} instrução(ões)</p>
        </div>
        {dados.etapas.map((e) => (
          <div key={e} className={`ui-card p-3 text-center ${dados.totaisPorEtapa[e] ? '' : 'opacity-40'}`}>
            <p className="text-2xl font-bold text-ui-text">{dados.totaisPorEtapa[e]}</p>
            <p className="text-[11px] font-medium leading-tight text-ui-text-muted">{rotuloEtapa(e)}</p>
          </div>
        ))}
      </div>

      <div className="ui-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
            <tr>
              <th className="px-3 py-3 text-left">Instrução</th>
              <th className="px-3 py-3 text-left">Origem</th>
              <th className="px-3 py-3 text-left">Local de coleta</th>
              <th className="px-3 py-3 text-left">Destino</th>
              <th className="px-3 py-3 text-left">Local de entrega</th>
              <th className="px-3 py-3 text-left">Tipo de fardo</th>
              <th className="px-3 py-3 text-right">Frete (R$/t)</th>
              <th className="px-3 py-3 text-right">Total</th>
              {etapasComVeiculo.map((e) => <th key={e} className="px-3 py-3 text-right">{rotuloEtapa(e)}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-subtle">
            {dados.linhas.map((l) => (
              // Instrução sem veículo ativo aparece apagada.
              <tr key={l.instrucao} className={l.veiculos === 0 ? 'text-ui-text-muted opacity-50' : 'text-ui-text'}>
                <td className="px-3 py-2 font-semibold">{l.instrucao}</td>
                <td className="px-3 py-2 text-xs">{l.origem ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{l.localColeta ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{l.destino ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{l.localEntrega ?? '—'}</td>
                <td className="px-3 py-2 text-xs">{l.tipoFardo === 'FARDAO' ? 'FARDÃO' : l.tipoFardo}</td>
                <td className="px-3 py-2 text-right text-xs">{formatMoney(l.freteEmpresa)}</td>
                <td className="px-3 py-2 text-right font-semibold">{l.veiculos}</td>
                {etapasComVeiculo.map((e) => <td key={e} className="px-3 py-2 text-right">{l.porEtapa[e] || ''}</td>)}
              </tr>
            ))}
            {!dados.linhas.length && <tr><td colSpan={8 + etapasComVeiculo.length} className="p-8 text-center text-ui-text-muted">Nenhuma instrução ativa no momento.</td></tr>}
          </tbody>
          {dados.linhas.length > 0 && (
            <tfoot className="border-t-2 border-ui-border font-semibold text-ui-text">
              <tr>
                <td className="px-3 py-2" colSpan={7}>Total</td>
                <td className="px-3 py-2 text-right">{dados.totalAtivo}</td>
                {etapasComVeiculo.map((e) => <td key={e} className="px-3 py-2 text-right">{dados.totaisPorEtapa[e]}</td>)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <footer className="space-y-1 text-center text-xs text-ui-text-muted">
        <p>Posição atualizada automaticamente · números = quantidade de caminhões em cada etapa</p>
        {dados.linkValidoAte && <p>Este link é temporário e vale até {formatDateTime(dados.linkValidoAte)}.</p>}
        {rodapeExtra}
      </footer>
    </div>
  );
}
