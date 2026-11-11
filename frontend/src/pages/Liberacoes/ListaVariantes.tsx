import { Fragment, useState } from 'react';
import Dica from '@/components/Dica';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import BarraProgresso from '@/components/BarraProgresso';
import { formatDate } from '@/utils/format';
import { abrirLinha } from '@/utils/abrirLinha';
import { SITUACAO_LABELS, STATUS_LABELS, STATUS_OPTIONS, SituacaoLiberacao, VeiculoStatus } from '@/utils/status';
import { AvisoFechamento, Buscar, DiasDeadline, Filtravel, PlacasChips, corPlaca } from './ListaComum';

// Variações da lista de liberações por estilo do painel:
//  - Controle  → GradeControle: uma linha por instrução, faixa de situação, expande veículos na linha;
//  - Lavoura   → CardsLavoura: cards grandes com progresso e placas por etapa;
//  - Executivo → TabelaExecutiva: agrupada por situação, com progresso.

const nome = (l: any, campo: string, rel: string) => l[campo] ?? l[rel]?.nome ?? '—';
const rota = (l: any) => `${nome(l, 'origemNome', 'terminal')} → ${nome(l, 'destinoNome', 'destino')}`;
const ativos = (l: any) => (l.veiculos ?? []).filter((v: any) => v.ativo);

// Cor da faixa lateral = situação calculada (sempre acompanhada do rótulo escrito).
const COR_SITUACAO: Record<string, string> = {
  FALTA_PROGRAMAR: '#d03b3b', FALTA_CARREGAR: '#ec835a', EM_FINALIZACAO: 'rgb(var(--tema-500))',
  PENDENCIA_DADOS: '#fab219', CONCLUIDA: '#0ca30c', SUSPENSA: '#fab219', CANCELADA: 'rgb(var(--g-400))',
};
const corSituacao = (l: any) => COR_SITUACAO[l.status === 'ATIVA' ? l.situacao : l.status === 'SUSPENSA' ? 'SUSPENSA' : l.status] ?? COR_SITUACAO.CANCELADA;
const rotuloSituacao = (l: any) => (l.status === 'ATIVA' ? SITUACAO_LABELS[l.situacao as SituacaoLiberacao]?.label : l.status === 'CONCLUIDA' ? 'Concluída' : l.status === 'SUSPENSA' ? 'Suspensa' : 'Cancelada');

function ChipSituacao({ l }: { l: any }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-gray-700">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: corSituacao(l) }} />
      {rotuloSituacao(l)}{l.situacao === 'PENDENCIA_DADOS' && l.totalPendencias ? ` (${l.totalPendencias})` : ''}
    </span>
  );
}

// ─── Controle ───────────────────────────────────────────────────────────────
export function GradeControle({ itens, onBuscar }: { itens: any[]; onBuscar: Buscar }) {
  const navigate = useNavigate();
  const [abertas, setAbertas] = useState<Set<number>>(new Set());
  const alternar = (id: number) => setAbertas((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="whitespace-nowrap text-left text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            <th className="w-8 px-2 py-2" aria-label="Expandir" />
            <th className="px-3 py-2">Instrução</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Rota</th>
            <th className="px-3 py-2">Coleta</th>
            <th className="w-[200px] px-3 py-2"><Dica termo="CARREGADO">Carregado</Dica></th>
            <th className="px-3 py-2 text-right"><Dica termo="A_PROGRAMAR">A programar</Dica></th>
            <th className="px-3 py-2 text-right"><Dica termo="A_CARREGAR">A carregar</Dica></th>
            <th className="px-3 py-2 text-right">Deadline</th>
            <th className="px-3 py-2">Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {itens.map((l) => {
            const aberta = abertas.has(l.id);
            const vs = ativos(l);
            return (
              <Fragment key={l.id}>
                <tr onClick={(e) => abrirLinha(e, `/liberacoes/${l.id}`, navigate)} className="cursor-pointer whitespace-nowrap hover:bg-gray-50"
                  style={{ boxShadow: `inset 3px 0 0 ${corSituacao(l)}` }}>
                  <td className="px-2">
                    <button type="button" onClick={() => alternar(l.id)} aria-expanded={aberta} aria-label={`${aberta ? 'Recolher' : 'Ver'} veículos de ${l.instrucao}`}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100">
                      {aberta ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-3 font-semibold"><Link to={`/liberacoes/${l.id}`} className="text-ui-primary hover:underline">{l.instrucao}</Link></td>
                  <td className="px-3"><Filtravel texto={nome(l, 'clienteNome', 'cliente')} onBuscar={onBuscar} /></td>
                  <td className="max-w-[260px] truncate px-3 text-gray-600" title={rota(l)}>{rota(l)}</td>
                  <td className="max-w-[180px] truncate px-3 text-gray-500" title={nome(l, 'localColetaNome', 'localColeta')}>{nome(l, 'localColetaNome', 'localColeta')}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><BarraProgresso total={l.totalFardos} programado={l.programado} carregado={l.carregado} tamanho="sm" legenda={false} /></div>
                      <span className="w-[72px] text-right text-xs text-gray-600">{l.carregado}/{l.totalFardos}</span>
                    </div>
                  </td>
                  <td className={`px-3 text-right ${l.saldo > 0 ? 'font-semibold text-orange-600' : 'text-gray-500'}`}>{l.saldo}</td>
                  <td className="px-3 text-right font-semibold">{l.saldoCarregar}</td>
                  <td className="px-3 text-right text-xs">{formatDate(l.deadline)} <DiasDeadline l={l} /></td>
                  <td className="px-3"><ChipSituacao l={l} /></td>
                </tr>
                {aberta && (
                  <tr className="bg-gray-50">
                    <td />
                    <td colSpan={9} className="px-3 py-2">
                      {vs.length === 0 ? <p className="text-xs text-gray-500">Nenhum veículo ativo.</p> : (
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-gray-200">
                            {vs.map((v: any) => (
                              <tr key={v.id} onClick={(e) => abrirLinha(e, `/liberacoes/${l.id}#veiculo-${v.id}`, navigate)} className="cursor-pointer hover:bg-white">
                                <td className="py-1.5 pr-3 font-mono font-semibold">{v.placa}</td>
                                <td className="py-1.5 pr-3 text-gray-600">{v.motoristaNome}</td>
                                <td className="py-1.5 pr-3">
                                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${corPlaca(v.status)}`}>{STATUS_LABELS[v.status as VeiculoStatus] ?? v.status}</span>
                                </td>
                                <td className="py-1.5 pr-3 text-right">{v.qtdFardos} fardos</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lavoura ────────────────────────────────────────────────────────────────
export function CardsLavoura({ itens, onBuscar }: { itens: any[]; onBuscar: Buscar }) {
  const navigate = useNavigate();
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2 2xl:grid-cols-3">
      {itens.map((l) => {
        const vs = ativos(l);
        const porEtapa = STATUS_OPTIONS.map((s) => ({ s, n: vs.filter((v: any) => v.status === s).length })).filter((x) => x.n > 0);
        return (
          <article key={l.id} onClick={(e) => abrirLinha(e, `/liberacoes/${l.id}`, navigate)}
            className="group flex cursor-pointer flex-col gap-4 rounded-ui-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/liberacoes/${l.id}`} className="text-lg font-extrabold tracking-tight text-gray-900 group-hover:text-ui-primary">{l.instrucao}</Link>
                <p className="text-sm text-gray-500"><Filtravel texto={nome(l, 'clienteNome', 'cliente')} onBuscar={onBuscar} /></p>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-gray-800" style={{ background: `color-mix(in srgb, ${corSituacao(l)} 18%, transparent)` }}>
                {rotuloSituacao(l)}
              </span>
            </header>

            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-ui-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{rota(l)}</p>
                <p className="truncate text-xs">Coleta: {nome(l, 'localColetaNome', 'localColeta')}</p>
              </div>
            </div>

            <BarraProgresso total={l.totalFardos} programado={l.programado} carregado={l.carregado} tamanho="lg" />

            <PlacasChips l={l} max={6} />

            <div className="flex flex-wrap items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-gray-400" />
              {porEtapa.length === 0
                ? <span className="text-xs text-gray-500">Nenhum caminhão programado</span>
                : porEtapa.map(({ s, n }) => (
                  <span key={s} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${corPlaca(s)}`}>{n} · {STATUS_LABELS[s]}</span>
                ))}
            </div>

            <footer className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
              <span className="text-gray-500">Deadline <strong className="text-gray-800">{formatDate(l.deadline)}</strong> <DiasDeadline l={l} /></span>
              <span className="text-gray-500">{l.saldo > 0 ? <><strong className="text-orange-600">{l.saldo}</strong> a programar</> : <><strong className="text-gray-800">{l.saldoCarregar}</strong> a carregar</>}</span>
            </footer>
            <AvisoFechamento l={l} />
          </article>
        );
      })}
    </div>
  );
}

// ─── Executivo ──────────────────────────────────────────────────────────────
const ORDEM_GRUPOS = ['PENDENCIA_DADOS', 'FALTA_PROGRAMAR', 'FALTA_CARREGAR', 'EM_FINALIZACAO', 'SUSPENSA', 'CONCLUIDA', 'CANCELADA'];
const grupoDe = (l: any) => (l.status === 'ATIVA' ? l.situacao : l.status === 'CONCLUIDA' ? 'CONCLUIDA' : l.status === 'SUSPENSA' ? 'SUSPENSA' : 'CANCELADA');
const ROTULO_GRUPO: Record<string, string> = {
  PENDENCIA_DADOS: 'Pendência de dados', FALTA_PROGRAMAR: 'Falta programar', FALTA_CARREGAR: 'Falta carregar',
  EM_FINALIZACAO: 'Em finalização', SUSPENSA: 'Suspensas', CONCLUIDA: 'Concluídas', CANCELADA: 'Canceladas',
};

export function TabelaExecutiva({ itens, onBuscar }: { itens: any[]; onBuscar: Buscar }) {
  const navigate = useNavigate();
  const grupos = ORDEM_GRUPOS.map((g) => ({ g, itens: itens.filter((l) => grupoDe(l) === g) })).filter((x) => x.itens.length);
  return (
    <div className="space-y-8 p-6">
      {grupos.map(({ g, itens: doGrupo }) => (
        <section key={g}>
          <header className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_SITUACAO[g] }} />
              {ROTULO_GRUPO[g]} <span className="text-sm font-normal text-gray-500">{doGrupo.length}</span>
            </h2>
            <p className="text-sm text-gray-500">
              {doGrupo.reduce((s, l) => s + Math.max(0, l.saldoCarregar), 0).toLocaleString('pt-BR')} fardos a carregar
            </p>
          </header>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2 pr-4 font-semibold">Instrução</th>
                <th className="py-2 pr-4 font-semibold">Cliente</th>
                <th className="py-2 pr-4 font-semibold">Rota</th>
                <th className="w-[28%] py-2 pr-4 font-semibold">Progresso</th>
                <th className="py-2 pr-4 text-right font-semibold"><Dica termo="A_CARREGAR">A carregar</Dica></th>
                <th className="py-2 text-right font-semibold">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doGrupo.map((l) => (
                <tr key={l.id} onClick={(e) => abrirLinha(e, `/liberacoes/${l.id}`, navigate)} className="cursor-pointer hover:bg-gray-50">
                  <td className="py-3 pr-4 font-semibold"><Link to={`/liberacoes/${l.id}`} className="text-gray-900 hover:text-ui-primary">{l.instrucao}</Link></td>
                  <td className="py-3 pr-4"><Filtravel texto={nome(l, 'clienteNome', 'cliente')} onBuscar={onBuscar} /></td>
                  <td className="py-3 pr-4 text-gray-600">{rota(l)}</td>
                  <td className="py-3 pr-4"><BarraProgresso total={l.totalFardos} programado={l.programado} carregado={l.carregado} /></td>
                  <td className="py-3 pr-4 text-right text-base font-semibold">{l.saldoCarregar}</td>
                  <td className="py-3 text-right whitespace-nowrap">{formatDate(l.deadline)} <DiasDeadline l={l} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {!grupos.length && <p className="py-10 text-center text-gray-500">Nenhuma liberação para este filtro.</p>}
    </div>
  );
}

