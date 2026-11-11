import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import { abrirLinha } from '@/utils/abrirLinha';
import { formatDate, formatDateTime } from '@/utils/format';
import { STATUS_LABELS, SM_LABELS, VeiculoStatus, StatusSM } from '@/utils/status';
import { Cartao, Kpi, LinhaDoTempo, Modo, PendenciasPorCliente, SITUACOES, SituacaoPrazo, Vazio, VolumePorFilial, rotuloSituacao } from './Blocos';

// Dashboard interativo: clicar num cliente, filial, dia ou situação filtra o painel
// inteiro; os filtros se somam e ficam na URL (dá para mandar o link já filtrado).
const FILTROS = ['clienteId', 'origemId', 'dia', 'situacao', 'de', 'ate'] as const;
const ATUALIZACAO_S = 60;

const isoDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function atalhosPeriodo() {
  const hoje = new Date();
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const menos30 = new Date(hoje);
  menos30.setDate(hoje.getDate() - 30);
  return [
    { rotulo: 'Esta semana', de: isoDia(segunda), ate: isoDia(domingo) },
    { rotulo: 'Este mês', de: isoDia(inicioMes), ate: isoDia(fimMes) },
    { rotulo: 'Últimos 30 dias', de: isoDia(menos30), ate: isoDia(hoje) },
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const filtros = Object.fromEntries(FILTROS.map((f) => [f, sp.get(f) ?? ''])) as Record<(typeof FILTROS)[number], string>;
  const modo: Modo = sp.get('modo') === 'cargas' ? 'cargas' : 'fardos';

  const alterar = (campo: string, valor: string) => setSp((atual) => {
    // Clicar de novo no mesmo item desmarca.
    if (!valor || atual.get(campo) === valor) atual.delete(campo); else atual.set(campo, valor);
    return atual;
  }, { replace: true });
  const limpar = () => setSp((atual) => { FILTROS.forEach((f) => atual.delete(f)); return atual; }, { replace: true });

  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]);
  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['dashboard-painel', params.toString()],
    queryFn: () => api.get(`/dashboard/painel?${params}`).then((r) => r.data),
    refetchInterval: ATUALIZACAO_S * 1000,
    placeholderData: (anterior) => anterior,
  });

  // Ordem fixa das filiais (por id) — a cor de cada filial não muda com o filtro.
  const { data: origens } = useQuery({ queryKey: ['origens', 'lista-dashboard'], queryFn: () => api.get('/origens?limit=1000').then((r) => r.data) });
  const ordemFiliais: number[] = useMemo(
    () => (Array.isArray(origens) ? origens : origens?.data ?? []).map((o: any) => o.id).sort((a: number, b: number) => a - b),
    [origens],
  );

  // Contador regressivo até a próxima atualização.
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const faltam = Math.max(0, ATUALIZACAO_S - Math.floor((agora - dataUpdatedAt) / 1000));

  const nomeCliente = (id: string) => data?.pendenciasPorCliente?.find((c: any) => String(c.id) === id)?.nome ?? `#${id}`;
  const nomeFilial = (id: string) => data?.volumePorFilial?.find((f: any) => String(f.id) === id)?.nome ?? `#${id}`;
  const chips = [
    filtros.clienteId && { campo: 'clienteId', rotulo: `Cliente: ${nomeCliente(filtros.clienteId)}` },
    filtros.origemId && { campo: 'origemId', rotulo: `Filial: ${nomeFilial(filtros.origemId)}` },
    filtros.dia && { campo: 'dia', rotulo: `Deadline: ${formatDate(filtros.dia)}` },
    filtros.situacao && { campo: 'situacao', rotulo: `Situação: ${rotuloSituacao(filtros.situacao)}` },
    (filtros.de || filtros.ate) && { campo: 'periodo', rotulo: `Período: ${filtros.de ? formatDate(filtros.de) : '…'} a ${filtros.ate ? formatDate(filtros.ate) : '…'}` },
  ].filter(Boolean) as { campo: string; rotulo: string }[];

  // Card de KPI abre Liberações com os mesmos filtros que a lista aceita.
  const abrirLiberacoes = () => {
    const q = new URLSearchParams({ status: 'ATIVA' });
    if (filtros.clienteId) q.set('clienteId', filtros.clienteId);
    if (filtros.origemId) q.set('origemId', filtros.origemId);
    navigate(`/liberacoes?${q}`);
  };

  const historico: any[] = data?.historico ?? [];
  const comparar = (campo: string, melhorQuandoSobe: boolean) => {
    // Só sem filtro: o retrato diário é do painel inteiro.
    if (chips.length || historico.length < 8) return null;
    const atual = historico[historico.length - 1]?.[campo];
    const semanaPassada = historico[historico.length - 8]?.[campo];
    return atual == null || semanaPassada == null ? null : { delta: atual - semanaPassada, melhorQuandoSobe };
  };
  const serie = (campo: string) => (chips.length ? [] : historico.map((h) => h[campo]));

  const hojeExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="ui-page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ui-text">Dashboard</h1>
          <p className="text-sm capitalize text-ui-text-muted">{hojeExtenso}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex rounded-lg border border-ui-border p-0.5">
            {(['fardos', 'cargas'] as Modo[]).map((m) => (
              <button key={m} type="button" onClick={() => setSp((a) => { a.set('modo', m); return a; }, { replace: true })}
                className={`rounded-md px-3 py-1 capitalize ${modo === m ? 'bg-ui-primary text-white' : 'text-ui-text-muted'}`}>{m}</button>
            ))}
          </div>
          <button type="button" onClick={() => refetch()} className="flex items-center gap-1 rounded-lg border border-ui-border px-2.5 py-1.5 text-ui-text-muted hover:bg-ui-muted"
            title="Atualiza sozinho a cada 1 minuto">
            <ArrowPathIcon className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {`0:${String(faltam).padStart(2, '0')}`}
          </button>
        </div>
      </div>

      {/* Filtros: período (pelo deadline) + filtros ativos vindos dos cliques */}
      <div className="ui-card flex flex-wrap items-center gap-2 p-3 text-xs">
        <span className="text-ui-text-muted">Deadline de</span>
        <input type="date" value={filtros.de} onChange={(e) => alterar('de', e.target.value)} className="ui-input w-auto py-1 text-xs" />
        <span className="text-ui-text-muted">até</span>
        <input type="date" value={filtros.ate} onChange={(e) => alterar('ate', e.target.value)} className="ui-input w-auto py-1 text-xs" />
        {atalhosPeriodo().map((a) => (
          <button key={a.rotulo} type="button" onClick={() => setSp((sp2) => { sp2.set('de', a.de); sp2.set('ate', a.ate); return sp2; }, { replace: true })}
            className={`rounded-full border px-2.5 py-1 ${filtros.de === a.de && filtros.ate === a.ate ? 'border-ui-primary text-ui-primary' : 'border-ui-border text-ui-text-muted hover:bg-ui-muted'}`}>
            {a.rotulo}
          </button>
        ))}
        {chips.length > 0 && <span className="mx-1 h-4 w-px bg-ui-border" />}
        {chips.map((c) => (
          <span key={c.campo} className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
            {c.rotulo}
            <button type="button" aria-label={`Remover ${c.rotulo}`}
              onClick={() => c.campo === 'periodo' ? setSp((a) => { a.delete('de'); a.delete('ate'); return a; }, { replace: true }) : alterar(c.campo, '')}>
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {chips.length > 0 && <button type="button" onClick={limpar} className="font-semibold text-ui-primary hover:underline">Limpar</button>}
      </div>

      {isLoading || !data ? <div className="p-10 text-center text-ui-text-muted">Carregando...</div> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo="Cargas ativas" valor={data.kpis.cargasAtivas} historico={serie('cargasAtivas')} comparacao={comparar('cargasAtivas', true)} onClick={abrirLiberacoes} />
            <Kpi titulo="Em risco" valor={data.kpis.emRisco} historico={serie('emRisco')} comparacao={comparar('emRisco', false)} onClick={abrirLiberacoes} destaque="critico" />
            <Kpi titulo="Fardos pendentes" valor={data.kpis.fardosPendentes} historico={serie('fardosPendentes')} comparacao={comparar('fardosPendentes', false)} onClick={abrirLiberacoes} />
            <Kpi titulo="Taxa de cumprimento" valor={data.kpis.taxaCumprimento} sufixo="%" historico={serie('taxaCumprimento')} comparacao={comparar('taxaCumprimento', true)} meta={data.kpis.meta} onClick={abrirLiberacoes} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Cartao titulo="Pendências por cliente" descricao={modo === 'fardos' ? 'Fardos ainda a carregar' : 'Cargas ativas'}>
              <PendenciasPorCliente dados={data.pendenciasPorCliente} modo={modo} selecionado={Number(filtros.clienteId) || undefined}
                onSelecionar={(id) => alterar('clienteId', String(id))} />
            </Cartao>
            <Cartao titulo="Volume ativo por filial" descricao={modo === 'fardos' ? 'Total de fardos das liberações ativas' : 'Cargas ativas'}>
              <VolumePorFilial dados={data.volumePorFilial} modo={modo} ordem={ordemFiliais} selecionado={Number(filtros.origemId) || undefined}
                onSelecionar={(id) => alterar('origemId', String(id))} />
            </Cartao>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Cartao className="xl:col-span-2" titulo="Linha do tempo de deadlines" descricao={`Vencidas + próximas 3 semanas · ${modo === 'fardos' ? 'fardos a carregar' : 'cargas'}`}>
              <LinhaDoTempo dados={data.linhaDoTempo} modo={modo} dia={filtros.dia || undefined} situacao={filtros.situacao || undefined}
                onDia={(d) => alterar('dia', d)} onSituacao={(s) => alterar('situacao', s)} />
            </Cartao>
            <Cartao titulo="Atividade ao vivo" descricao="Últimas mudanças nas cargas do filtro">
              <Atividade itens={data.atividade} />
            </Cartao>
          </div>

          <Cartao titulo="Cargas do filtro" descricao={`${data.cargas.length} liberação(ões) · ordenadas pelo deadline mais próximo`}>
            <TabelaCargas cargas={data.cargas} />
          </Cartao>
        </>
      )}
    </div>
  );
}

function descreverAtividade(a: any): string {
  if (a.tabela === 'Veiculo' && a.acao === 'INSERT') return 'veículo lançado';
  // Exclusão definitiva (antes da inativação existir) não tem "depois".
  if (a.acao === 'DELETE') return a.tabela === 'Veiculo' ? 'veículo excluído' : 'registro excluído';
  const partes: string[] = [];
  if (a.campos.includes('status') && a.depois.status) {
    const r = (s: string) => (a.tabela === 'Veiculo' ? STATUS_LABELS[s as VeiculoStatus] ?? s : s);
    partes.push(`${a.tabela === 'Liberacao' ? 'liberação ' : ''}${r(a.antes.status)} → ${r(a.depois.status)}`);
  }
  if (a.campos.includes('statusSm') && a.depois.statusSm) partes.push(`SM ${SM_LABELS[a.depois.statusSm as StatusSM] ?? a.depois.statusSm}`);
  if (a.campos.includes('dataAgendamento')) partes.push(a.depois.dataAgendamento ? `agendado ${formatDateTime(a.depois.dataAgendamento)}` : 'agendamento removido');
  if (a.campos.includes('ativo')) partes.push(a.depois.ativo ? 'reativado' : 'inativado');
  return partes.join(' · ') || a.campos.join(', ');
}

function Atividade({ itens }: { itens: any[] }) {
  if (!itens.length) return <Vazio texto="Sem alterações recentes" />;
  return (
    <ul className="max-h-[300px] space-y-3 overflow-y-auto pr-1 text-sm">
      {itens.map((a) => (
        <li key={a.id}>
          <Link to={`/liberacoes/${a.liberacaoId}${a.veiculoId ? `#veiculo-${a.veiculoId}` : ''}`} className="block rounded-lg px-2 py-1 hover:bg-ui-muted">
            <p className="text-ui-text">
              {a.tabela === 'Veiculo' && <span className="font-mono font-semibold">{a.descricao} </span>}
              {descreverAtividade(a)}
            </p>
            <p className="text-xs text-ui-text-muted">{a.instrucao} · {a.usuario} · {formatDateTime(a.em)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TabelaCargas({ cargas }: { cargas: any[] }) {
  const navigate = useNavigate();
  if (!cargas.length) return <Vazio />;
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-ui-surface text-xs uppercase text-ui-text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Instrução</th>
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-3 py-2 text-left">Filial</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">A programar</th>
            <th className="px-3 py-2 text-right">A carregar</th>
            <th className="px-3 py-2 text-right">Deadline</th>
            <th className="px-3 py-2 text-left">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ui-border-subtle">
          {cargas.map((c) => {
            const s = SITUACOES.find((x) => x.chave === (c.situacao as SituacaoPrazo))!;
            return (
              <tr key={c.id} onClick={(e) => abrirLinha(e, `/liberacoes/${c.id}`, navigate)} className="cursor-pointer hover:bg-ui-muted/60">
                <td className="px-3 py-2 font-medium"><Link to={`/liberacoes/${c.id}`} className="text-ui-primary hover:underline">{c.instrucao}</Link></td>
                <td className="px-3 py-2 text-xs">{c.cliente}</td>
                <td className="px-3 py-2 text-xs text-ui-text-muted">{c.filial}</td>
                <td className="px-3 py-2 text-right">{c.totalFardos.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-right">{c.saldoProgramar.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-right font-semibold">{c.saldoCarregar.toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2 text-right text-xs">{formatDate(c.deadline)} <span className="text-ui-text-muted">({c.dias}d)</span></td>
                <td className="px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-ui-text"><s.Icone className="h-3.5 w-3.5" style={{ color: s.cor }} />{s.rotulo}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
