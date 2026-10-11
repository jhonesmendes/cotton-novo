import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownIcon, ArrowDownTrayIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import MultiSelect from '@/components/MultiSelect';
import { formatDate, formatDateTime, formatMoney, formatToneladas } from '@/utils/format';
import { GraficoAbertasConcluidas, GraficoFardosEntregues } from './Graficos';
import type { LiberacaoConcluida, LinhaAgrupada, Metricas, Relatorio } from './tipos';

type Opcao = { id: number; nome: string };
interface OpcoesFiltro {
  clientes: Opcao[];
  filiais: Opcao[];
  destinos: Opcao[];
  origens: Opcao[];
  locaisColeta: Opcao[];
}

const CAMPOS_FILTRO = ['agrupamento', 'dataInicio', 'dataFim', 'clienteId', 'origemId', 'destinoId', 'terminalId', 'localColetaId', 'tipoFardo', 'fechamento', 'fardosMin', 'fardosMax', 'toneladasMin', 'toneladasMax'] as const;
const margemFmt = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// Totais do relatório sem centavos (arredondados).
const moeda = (v: number) => formatMoney(Math.round(v)).replace(/,00$/, '');

const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR'));
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const deslocar = (dias: number) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Variação entre dois valores. `menorMelhor` inverte a cor (ex: tempo médio).
function Variacao({ atual, anterior, pontos = false, menorMelhor = false }: { atual: number | null; anterior: number | null; pontos?: boolean; menorMelhor?: boolean }) {
  if (atual == null || anterior == null) return <span className="text-xs text-ui-text-muted">sem base de comparação</span>;
  const diff = atual - anterior;
  if (diff === 0) return <span className="text-xs text-ui-text-muted">igual ao período anterior</span>;
  if (!pontos && anterior === 0) return <span className="text-xs text-ui-text-muted">antes: 0</span>;
  const texto = pontos ? `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} p.p.` : `${diff > 0 ? '+' : ''}${Math.round((diff / anterior) * 100)}%`;
  const bom = menorMelhor ? diff < 0 : diff > 0;
  const Icone = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${bom ? 'text-green-600' : 'text-red-600'}`}>
      <Icone className="w-3 h-3" />
      {texto}
      <span className="font-normal text-ui-text-muted ml-1">vs anterior</span>
    </span>
  );
}

function Indicador({ titulo, valor, detalhe, children }: { titulo: string; valor: string; detalhe?: string; children?: React.ReactNode }) {
  return (
    <div className="ui-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-muted">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-ui-text">{valor}</p>
      {detalhe && <p className="text-xs text-ui-text-muted">{detalhe}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function variacaoPercentual(atual: number, anterior: number | undefined) {
  if (anterior === undefined || anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

function CelulaVariacao({ valor, anterior }: { valor: number; anterior?: number }) {
  const v = variacaoPercentual(valor, anterior);
  return (
    <td className="px-3 py-2 text-right whitespace-nowrap">
      {num(valor)}
      {v !== null && v !== 0 && (
        <span className={`ml-1 text-[11px] ${v > 0 ? 'text-green-600' : 'text-red-600'}`}>{v > 0 ? '▲' : '▼'}{Math.abs(v)}%</span>
      )}
    </td>
  );
}

function exportarCsv(lista: LiberacaoConcluida[], periodo: { inicio: string; fim: string }) {
  const colunas: [string, (l: LiberacaoConcluida) => unknown][] = [
    ['Instrução', (l) => l.instrucao],
    ['Cliente', (l) => l.cliente],
    ['Filial', (l) => l.filial],
    ['Destino', (l) => l.destino],
    ['Local de coleta', (l) => l.localColeta],
    ['Tipo de fardo', (l) => l.tipoFardo],
    ['Data liberação', (l) => formatDate(l.dataLiberacao.slice(0, 10))],
    ['Deadline', (l) => formatDate(l.deadline.slice(0, 10))],
    ['Concluída em', (l) => formatDateTime(l.concluidaEm)],
    ['No prazo', (l) => (l.noPrazo ? 'Sim' : 'Não')],
    ['Dias até concluir', (l) => l.diasAteConcluir],
    ['Total fardos', (l) => l.totalFardos],
    ['Carregado', (l) => l.carregado],
    ['Veículos', (l) => l.veiculos],
    ['Toneladas', (l) => String(l.toneladas).replace('.', ',')],
    ['Frete empresa (R$/t)', (l) => String(l.freteEmpresa).replace('.', ',')],
    ['Frete motorista (R$/t)', (l) => (l.freteMotorista == null ? '' : String(l.freteMotorista).replace('.', ','))],
    ['Margem', (l) => (l.margem == null ? '' : String(l.margem).replace('.', ','))],
    ['Faturamento (R$)', (l) => String(l.faturamento).replace('.', ',')],
    ['Custo motoristas (R$)', (l) => String(l.custoMotorista).replace('.', ',')],
    ['Resultado (R$)', (l) => String(l.resultado).replace('.', ',')],
    ['Veículos sem peso', (l) => l.veiculosSemPeso],
    ['Fechamento', (l) => (l.fechamentoManual ? 'Manual' : 'Automático')],
    ['Fardos pendentes', (l) => l.fardosPendentesFechamento ?? ''],
    ['Motivo', (l) => l.motivoFechamento ?? ''],
    ['Fechado por', (l) => l.fechamentoManualPor ?? ''],
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [colunas.map(([t]) => esc(t)).join(';'), ...lista.map((l) => colunas.map(([, f]) => esc(f(l))).join(';'))];
  // BOM + ";" — abre direto com acentos e colunas certas no Excel em pt-BR.
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `liberacoes-concluidas_${periodo.inicio}_a_${periodo.fim}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const listaIds = (v: string) => (v ? v.split(',').map(Number) : []);

// Faixa mín/máx — só aplica ao sair do campo ou com Enter, para não recarregar a cada tecla.
function Faixa({ rotulo, unidade, min, max, inteiro = false, onChange }: { rotulo: string; unidade: string; min: string; max: string; inteiro?: boolean; onChange: (min: string, max: string) => void }) {
  const [de, setDe] = useState(min);
  const [ate, setAte] = useState(max);
  useEffect(() => { setDe(min); setAte(max); }, [min, max]);
  const aplicar = () => {
    const limpar = (v: string) => (v.trim() === '' ? '' : String(inteiro ? Math.max(0, Math.round(Number(v))) : Math.max(0, Number(v.replace(',', '.')))));
    if (limpar(de) !== min || limpar(ate) !== max) onChange(limpar(de), limpar(ate));
  };
  const props = { type: 'number', min: 0, step: inteiro ? 1 : 0.01, className: 'ui-input', onBlur: aplicar, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') aplicar(); } };
  return (
    <div>
      <span className="text-xs text-ui-text-muted mb-1 block">{rotulo}</span>
      <div className="flex items-center gap-2">
        <input {...props} value={de} onChange={(e) => setDe(e.target.value)} placeholder="mín." aria-label={`${rotulo} mínimo`} />
        <span className="text-xs text-ui-text-muted">a</span>
        <input {...props} value={ate} onChange={(e) => setAte(e.target.value)} placeholder="máx." aria-label={`${rotulo} máximo`} />
        <span className="text-xs text-ui-text-muted">{unidade}</span>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visao, setVisao] = useState<'cliente' | 'filial'>('cliente');
  const filtros = Object.fromEntries(CAMPOS_FILTRO.map((c) => [c, searchParams.get(c) ?? ''])) as Record<(typeof CAMPOS_FILTRO)[number], string>;
  const agrupamento = filtros.agrupamento === 'semana' ? 'semana' : 'mes';

  const alterar = (mudancas: Partial<typeof filtros>) =>
    setSearchParams((sp) => {
      for (const [k, v] of Object.entries(mudancas)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      return sp;
    }, { replace: true });

  const { data: opcoes } = useQuery<OpcoesFiltro>({
    queryKey: ['relatorios', 'filtros'],
    queryFn: () => api.get('/relatorios/filtros').then((r) => r.data),
  });

  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
  const { data, isLoading, isFetching, isError } = useQuery<Relatorio>({
    queryKey: ['relatorios', params],
    queryFn: () => api.get('/relatorios', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const temFiltroDimensao = ['clienteId', 'origemId', 'destinoId', 'terminalId', 'localColetaId', 'tipoFardo', 'fechamento', 'fardosMin', 'fardosMax', 'toneladasMin', 'toneladasMax'].some((c) => filtros[c as keyof typeof filtros]);
  const atual: Metricas | undefined = data?.resumo.atual;
  const anterior: Metricas | undefined = data?.resumo.anterior;
  const agrupados: LinhaAgrupada[] = (visao === 'cliente' ? data?.porCliente : data?.porFilial) ?? [];

  const select = (campo: keyof typeof filtros, rotulo: string, lista: Opcao[] | undefined, todos: string) => (
    <label className="block">
      <span className="text-xs text-ui-text-muted mb-1 block">{rotulo}</span>
      <select value={filtros[campo]} onChange={(e) => alterar({ [campo]: e.target.value })} className="ui-input">
        <option value="">{todos}</option>
        {(lista ?? []).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </label>
  );

  return (
    <div className="ui-page space-y-6">
      <PageHeader
        title="Relatórios"
        description="O que foi concluído e finalizado, período a período, comparado com o que está rodando agora"
      />

      {/* FILTROS */}
      <div className="ui-card p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <span className="text-xs text-ui-text-muted mb-1 block">Comparar</span>
            <div className="inline-flex rounded-ui-md border border-ui-border p-0.5" role="group" aria-label="Agrupamento">
              {(['mes', 'semana'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => alterar({ agrupamento: a, dataInicio: '', dataFim: '' })}
                  aria-pressed={agrupamento === a}
                  className={`px-3 py-1.5 text-sm rounded-ui-sm transition-colors ${agrupamento === a ? 'bg-ui-primary text-white font-semibold' : 'text-ui-text-muted hover:text-ui-text'}`}
                >
                  {a === 'mes' ? 'Mês a mês' : 'Semana a semana'}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="text-xs text-ui-text-muted mb-1 block">De</span>
            <input type="date" value={filtros.dataInicio || data?.periodo.inicio || ''} onChange={(e) => alterar({ dataInicio: e.target.value })} className="ui-input" />
          </label>
          <label>
            <span className="text-xs text-ui-text-muted mb-1 block">Até</span>
            <input type="date" value={filtros.dataFim || data?.periodo.fim || ''} onChange={(e) => alterar({ dataFim: e.target.value })} className="ui-input" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { rotulo: 'Últimos 3 meses', ag: 'mes', de: deslocar(-62) },
              { rotulo: 'Últimos 6 meses', ag: 'mes', de: deslocar(-153) },
              { rotulo: 'Ano atual', ag: 'mes', de: `${new Date().getFullYear()}-01-01` },
              { rotulo: 'Últimas 4 semanas', ag: 'semana', de: deslocar(-21) },
              { rotulo: 'Últimas 12 semanas', ag: 'semana', de: deslocar(-77) },
            ].map((p) => (
              <button key={p.rotulo} type="button" onClick={() => alterar({ agrupamento: p.ag, dataInicio: p.de, dataFim: hojeISO() })} className="ui-btn-outline text-xs px-2.5 py-1.5">
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <MultiSelect rotulo="Clientes" opcoes={opcoes?.clientes ?? []} selecionados={listaIds(filtros.clienteId)} onChange={(v) => alterar({ clienteId: v.join(',') })} />
          <MultiSelect rotulo="Filiais embarcadoras" todos="Todas" opcoes={opcoes?.filiais ?? []} selecionados={listaIds(filtros.origemId)} onChange={(v) => alterar({ origemId: v.join(',') })} />
          {select('terminalId', 'Origem', opcoes?.origens, 'Todas')}
          {select('destinoId', 'Destino', opcoes?.destinos, 'Todos')}
          {select('localColetaId', 'Local de coleta', opcoes?.locaisColeta, 'Todos')}
          <label className="block">
            <span className="text-xs text-ui-text-muted mb-1 block">Tipo de fardo</span>
            <select value={filtros.tipoFardo} onChange={(e) => alterar({ tipoFardo: e.target.value })} className="ui-input">
              <option value="">Todos</option>
              <option value="FARDAO">Fardão</option>
              <option value="FARDINHO">Fardinho</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-ui-text-muted mb-1 block">Fechamento</span>
            <select value={filtros.fechamento} onChange={(e) => alterar({ fechamento: e.target.value })} className="ui-input">
              <option value="">Todos</option>
              <option value="auto">Automático</option>
              <option value="manual">Manual (fardos pendentes)</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Faixa rotulo="Fardos da instrução" unidade="fardos" min={filtros.fardosMin} max={filtros.fardosMax} inteiro
            onChange={(min, max) => alterar({ fardosMin: min, fardosMax: max })} />
          <Faixa rotulo="Toneladas carregadas" unidade="t" min={filtros.toneladasMin} max={filtros.toneladasMax}
            onChange={(min, max) => alterar({ toneladasMin: min, toneladasMax: max })} />
        </div>
        {(temFiltroDimensao || filtros.dataInicio || filtros.dataFim) && (
          <button type="button" onClick={() => setSearchParams({}, { replace: true })} className="text-sm text-ui-text-muted hover:text-ui-text">
            Limpar filtros
          </button>
        )}
      </div>

      {isError && <div className="ui-card p-6 text-center text-red-600">Não foi possível carregar o relatório. Confira o período informado.</div>}
      {isLoading && <div className="ui-card p-8 text-center text-ui-text-muted">Carregando relatório...</div>}

      {data && atual && anterior && (
        <>
          <p className="text-xs text-ui-text-muted -mt-2">
            Período: <strong>{formatDate(data.periodo.inicio)} a {formatDate(data.periodo.fim)}</strong> · comparado com{' '}
            {formatDate(data.periodoAnterior.inicio)} a {formatDate(data.periodoAnterior.fim)}
            {isFetching && ' · atualizando...'}
          </p>

          {/* INDICADORES DO PERÍODO */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <Indicador titulo="Concluídas" valor={num(atual.concluidas)} detalhe={`${num(atual.abertas)} abertas no período`}>
              <Variacao atual={atual.concluidas} anterior={anterior.concluidas} />
            </Indicador>
            <Indicador titulo="Fardos entregues" valor={num(atual.fardosEntregues)}>
              <Variacao atual={atual.fardosEntregues} anterior={anterior.fardosEntregues} />
            </Indicador>
            <Indicador titulo="Veículos finalizados" valor={num(atual.veiculosFinalizados)} detalhe={`${num(atual.fardosVeiculosFinalizados)} fardos`}>
              <Variacao atual={atual.veiculosFinalizados} anterior={anterior.veiculosFinalizados} />
            </Indicador>
            <Indicador titulo="No prazo" valor={atual.percentualNoPrazo == null ? '—' : `${atual.percentualNoPrazo.toLocaleString('pt-BR')}%`} detalhe={`${num(atual.noPrazo)} de ${num(atual.concluidas)} até o deadline`}>
              <Variacao atual={atual.percentualNoPrazo} anterior={anterior.percentualNoPrazo} pontos />
            </Indicador>
            <Indicador titulo="Tempo médio" valor={atual.tempoMedioDias == null ? '—' : `${atual.tempoMedioDias.toLocaleString('pt-BR')} dias`} detalhe="da liberação à conclusão">
              <Variacao atual={atual.tempoMedioDias} anterior={anterior.tempoMedioDias} menorMelhor />
            </Indicador>
            <Indicador titulo="Fechadas manualmente" valor={num(atual.concluidasManual)} detalhe={`${num(atual.fardosPendentesManual)} fardos ficaram pendentes`}>
              <Variacao atual={atual.concluidasManual} anterior={anterior.concluidasManual} menorMelhor />
            </Indicador>
          </div>

          {/* FINANCEIRO DO PERÍODO */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <Indicador titulo="Toneladas entregues" valor={formatToneladas(atual.toneladas)}>
              <Variacao atual={atual.toneladas} anterior={anterior.toneladas} />
            </Indicador>
            <Indicador titulo="Faturamento (frete empresa)" valor={moeda(atual.faturamento)} detalhe="toneladas × R$/t da liberação">
              <Variacao atual={atual.faturamento} anterior={anterior.faturamento} />
            </Indicador>
            <Indicador titulo="Custo motoristas" valor={moeda(atual.custoMotorista)} detalhe="toneladas × R$/t de cada viagem">
              <Variacao atual={atual.custoMotorista} anterior={anterior.custoMotorista} menorMelhor />
            </Indicador>
            <Indicador titulo="Resultado" valor={moeda(atual.resultado)} detalhe="faturamento − custo motoristas">
              <Variacao atual={atual.resultado} anterior={anterior.resultado} />
            </Indicador>
            <Indicador titulo="Margem média" valor={margemFmt(atual.margemMedia)} detalhe="(frete empresa − motorista) ÷ 100">
              <Variacao atual={atual.margemMedia} anterior={anterior.margemMedia} />
            </Indicador>
          </div>
          {atual.veiculosSemPeso > 0 && (
            <p className="-mt-2 text-xs text-amber-700">
              ⚠ {atual.veiculosSemPeso} veículo(s) das liberações concluídas no período estão sem peso informado — toneladas e valores ficam parciais até o peso ser preenchido.
            </p>
          )}

          {/* FECHADO x RODANDO */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="ui-card p-5 border-l-4 border-l-blue-500">
              <h3 className="text-sm font-semibold text-ui-text">Fechado no período</h3>
              <p className="text-xs text-ui-text-muted mb-4">{formatDate(data.periodo.inicio)} a {formatDate(data.periodo.fim)}</p>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><dt className="text-ui-text-muted text-xs">Liberações concluídas</dt><dd className="text-lg font-bold text-ui-text">{num(atual.concluidas)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Fardos entregues</dt><dd className="text-lg font-bold text-ui-text">{num(atual.fardosEntregues)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Veículos finalizados</dt><dd className="text-lg font-bold text-ui-text">{num(atual.veiculosFinalizados)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Toneladas entregues</dt><dd className="text-lg font-bold text-ui-text">{formatToneladas(atual.toneladas)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Fechadas com pendência</dt><dd className="text-lg font-bold text-ui-text">{num(atual.concluidasManual)} <span className="text-xs font-normal text-ui-text-muted">({num(atual.fardosPendentesManual)} fardos)</span></dd></div>
              </dl>
            </div>
            <div className="ui-card p-5 border-l-4 border-l-orange-500">
              <h3 className="text-sm font-semibold text-ui-text">Rodando agora</h3>
              <p className="text-xs text-ui-text-muted mb-4">Liberações ativas hoje{temFiltroDimensao ? ', com os mesmos filtros' : ''}</p>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div><dt className="text-ui-text-muted text-xs">Liberações ativas</dt><dd className="text-lg font-bold text-ui-text">{num(data.rodando.liberacoes)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Fardos carregados / total</dt><dd className="text-lg font-bold text-ui-text">{num(data.rodando.fardosCarregados)} <span className="text-xs font-normal text-ui-text-muted">de {num(data.rodando.fardosTotal)}</span></dd></div>
                <div><dt className="text-ui-text-muted text-xs">Veículos em andamento</dt><dd className="text-lg font-bold text-ui-text">{num(data.rodando.veiculosEmAndamento)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Toneladas já carregadas</dt><dd className="text-lg font-bold text-ui-text">{formatToneladas(data.rodando.toneladasCarregadas)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Saldo a carregar</dt><dd className="text-lg font-bold text-ui-text">{num(data.rodando.saldo)} <span className="text-xs font-normal text-ui-text-muted">fardos</span></dd></div>
                <div><dt className="text-ui-text-muted text-xs">Vencidas (deadline)</dt><dd className={`text-lg font-bold ${data.rodando.vencidas ? 'text-red-600' : 'text-ui-text'}`}>{num(data.rodando.vencidas)}</dd></div>
                <div><dt className="text-ui-text-muted text-xs">Aguardando fechamento</dt><dd className={`text-lg font-bold ${data.rodando.aguardandoFechamento ? 'text-amber-600' : 'text-ui-text'}`}>{num(data.rodando.aguardandoFechamento)}</dd></div>
              </dl>
            </div>
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GraficoAbertasConcluidas serie={data.serie} />
            <GraficoFardosEntregues serie={data.serie} />
          </div>

          {/* COMPARATIVO POR PERÍODO */}
          <div className="ui-card overflow-hidden">
            <div className="ui-card-header py-3">
              <h3 className="text-sm font-semibold text-ui-text">Comparativo {agrupamento === 'mes' ? 'mês a mês' : 'semana a semana'}</h3>
              <p className="text-xs text-ui-text-muted">▲▼ variação em relação ao período anterior da linha de cima</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">{agrupamento === 'mes' ? 'Mês' : 'Semana'}</th>
                    <th className="px-3 py-2 text-right">Abertas</th>
                    <th className="px-3 py-2 text-right">Concluídas</th>
                    <th className="px-3 py-2 text-right">Manuais</th>
                    <th className="px-3 py-2 text-right">Fardos entregues</th>
                    <th className="px-3 py-2 text-right">Toneladas</th>
                    <th className="px-3 py-2 text-right">Faturamento</th>
                    <th className="px-3 py-2 text-right">Resultado</th>
                    <th className="px-3 py-2 text-right">No prazo</th>
                    <th className="px-3 py-2 text-right">Tempo médio</th>
                    <th className="px-3 py-2 text-right">Veículos finalizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-subtle">
                  {data.serie.map((s, i) => {
                    const prev = data.serie[i - 1];
                    return (
                      <tr key={s.periodo} className="hover:bg-ui-muted/60">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{s.rotulo}</td>
                        <CelulaVariacao valor={s.abertas} anterior={prev?.abertas} />
                        <CelulaVariacao valor={s.concluidas} anterior={prev?.concluidas} />
                        <td className="px-3 py-2 text-right">{s.concluidasManual ? <span className="text-amber-700 font-semibold">{s.concluidasManual}</span> : '—'}</td>
                        <CelulaVariacao valor={s.fardosEntregues} anterior={prev?.fardosEntregues} />
                        <td className="px-3 py-2 text-right whitespace-nowrap">{formatToneladas(s.toneladas)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(s.faturamento)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(s.resultado)}</td>
                        <td className="px-3 py-2 text-right">{s.percentualNoPrazo == null ? '—' : `${s.percentualNoPrazo.toLocaleString('pt-BR')}%`}</td>
                        <td className="px-3 py-2 text-right">{s.tempoMedioDias == null ? '—' : `${s.tempoMedioDias.toLocaleString('pt-BR')} d`}</td>
                        <CelulaVariacao valor={s.veiculosFinalizados} anterior={prev?.veiculosFinalizados} />
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-ui-muted/60 font-semibold">
                  <tr>
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{num(atual.abertas)}</td>
                    <td className="px-3 py-2 text-right">{num(atual.concluidas)}</td>
                    <td className="px-3 py-2 text-right">{num(atual.concluidasManual)}</td>
                    <td className="px-3 py-2 text-right">{num(atual.fardosEntregues)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{formatToneladas(atual.toneladas)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(atual.faturamento)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(atual.resultado)}</td>
                    <td className="px-3 py-2 text-right">{atual.percentualNoPrazo == null ? '—' : `${atual.percentualNoPrazo.toLocaleString('pt-BR')}%`}</td>
                    <td className="px-3 py-2 text-right">{atual.tempoMedioDias == null ? '—' : `${atual.tempoMedioDias.toLocaleString('pt-BR')} d`}</td>
                    <td className="px-3 py-2 text-right">{num(atual.veiculosFinalizados)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* FECHADO x RODANDO POR CLIENTE / FILIAL */}
          <div className="ui-card overflow-hidden">
            <div className="ui-card-header py-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ui-text">Fechado x Rodando por {visao === 'cliente' ? 'cliente' : 'filial'}</h3>
                <p className="text-xs text-ui-text-muted">Concluído no período ao lado do que está ativo agora</p>
              </div>
              <div className="inline-flex rounded-ui-md border border-ui-border p-0.5" role="group">
                {(['cliente', 'filial'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVisao(v)} aria-pressed={visao === v}
                    className={`px-3 py-1 text-xs rounded-ui-sm ${visao === v ? 'bg-ui-primary text-white font-semibold' : 'text-ui-text-muted hover:text-ui-text'}`}>
                    {v === 'cliente' ? 'Cliente' : 'Filial'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left" rowSpan={2}>{visao === 'cliente' ? 'Cliente' : 'Filial'}</th>
                    <th className="px-3 pt-2 text-center border-l border-ui-border" colSpan={5}>Fechado no período</th>
                    <th className="px-3 pt-2 text-center border-l border-ui-border" colSpan={3}>Rodando agora</th>
                  </tr>
                  <tr>
                    <th className="px-3 pb-2 text-right border-l border-ui-border font-medium">Concluídas</th>
                    <th className="px-3 pb-2 text-right font-medium">Fardos entregues</th>
                    <th className="px-3 pb-2 text-right font-medium">Toneladas</th>
                    <th className="px-3 pb-2 text-right font-medium">Resultado</th>
                    <th className="px-3 pb-2 text-right font-medium">Manuais</th>
                    <th className="px-3 pb-2 text-right border-l border-ui-border font-medium">Ativas</th>
                    <th className="px-3 pb-2 text-right font-medium">Fardos (total)</th>
                    <th className="px-3 pb-2 text-right font-medium">Saldo a carregar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-subtle">
                  {agrupados.map((g) => (
                    <tr key={g.id} className="hover:bg-ui-muted/60">
                      <td className="px-3 py-2 font-medium">{g.nome}</td>
                      <td className="px-3 py-2 text-right border-l border-ui-border">{num(g.concluidas)}</td>
                      <td className="px-3 py-2 text-right">{num(g.fardosEntregues)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{formatToneladas(g.toneladas)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(g.resultado)}</td>
                      <td className="px-3 py-2 text-right">{g.concluidasManual ? <span className="text-amber-700 font-semibold">{g.concluidasManual}</span> : '—'}</td>
                      <td className="px-3 py-2 text-right border-l border-ui-border">{num(g.ativas)}</td>
                      <td className="px-3 py-2 text-right">{num(g.fardosTotalAtivas)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{num(g.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {agrupados.length === 0 && <div className="p-6 text-center text-ui-text-muted text-sm">Nada concluído no período nem rodando agora.</div>}
            </div>
          </div>

          {/* LISTA DAS CONCLUÍDAS */}
          <div className="ui-card overflow-hidden">
            <div className="ui-card-header py-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ui-text">Liberações concluídas no período</h3>
                <p className="text-xs text-ui-text-muted">{data.lista.length} instrução(ões) · em amarelo: fechadas manualmente com fardos pendentes</p>
              </div>
              <button type="button" onClick={() => exportarCsv(data.lista, data.periodo)} disabled={!data.lista.length} className="ui-btn-outline text-sm disabled:opacity-40">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Instrução</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Filial → Destino</th>
                    <th className="px-3 py-2 text-left">Concluída em</th>
                    <th className="px-3 py-2 text-left">Deadline</th>
                    <th className="px-3 py-2 text-right">Dias</th>
                    <th className="px-3 py-2 text-right">Fardos</th>
                    <th className="px-3 py-2 text-right">Toneladas</th>
                    <th className="px-3 py-2 text-right">Margem</th>
                    <th className="px-3 py-2 text-right">Resultado</th>
                    <th className="px-3 py-2 text-left">Fechamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border-subtle">
                  {data.lista.map((l) => (
                    <tr key={l.id} className={l.fechamentoManual ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-ui-muted/60'}>
                      <td className="px-3 py-2 font-medium"><Link to={`/liberacoes/${l.id}`} className="text-ui-primary hover:underline">{l.instrucao}</Link></td>
                      <td className="px-3 py-2 text-xs">{l.cliente}</td>
                      <td className="px-3 py-2 text-xs text-ui-text-muted">{l.filial} → {l.destino}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDateTime(l.concluidaEm)}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {formatDate(l.deadline.slice(0, 10))}{' '}
                        <span className={`ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${l.noPrazo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {l.noPrazo ? 'no prazo' : 'atrasada'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{l.diasAteConcluir}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{num(l.carregado)} <span className="text-xs text-ui-text-muted">/ {num(l.totalFardos)}</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" title={l.veiculosSemPeso ? `${l.veiculosSemPeso} veículo(s) sem peso` : undefined}>
                        {formatToneladas(l.toneladas)}{l.veiculosSemPeso > 0 && <span className="text-amber-600"> *</span>}
                      </td>
                      <td className="px-3 py-2 text-right" title={l.freteMotorista != null ? `(${l.freteEmpresa} − ${l.freteMotorista}) ÷ 100` : 'sem frete motorista na liberação'}>{margemFmt(l.margem)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(l.resultado)}</td>
                      <td className="px-3 py-2 text-xs">
                        {l.fechamentoManual ? (
                          <span className="text-amber-700 font-medium" title={l.motivoFechamento ?? undefined}>
                            Manual · {num(l.fardosPendentesFechamento)} pendentes
                          </span>
                        ) : (
                          <span className="text-ui-text-muted">Automático</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.lista.length === 0 && <div className="p-6 text-center text-ui-text-muted text-sm">Nenhuma liberação concluída no período.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
