import { Fragment, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import AlteracoesDetalhe from '@/components/AlteracoesDetalhe';
import { formatDateTime } from '@/utils/format';
import { ACAO_LABELS, AcaoAuditoria, RegistroAuditoria, labelCampo, labelTabela } from '@/utils/auditoria';

interface Filtros {
  usuarioId: string;
  tabela: string;
  acao: string;
  dataInicio: string;
  dataFim: string;
  busca: string;
}

const FILTROS_VAZIOS: Filtros = { usuarioId: '', tabela: '', acao: '', dataInicio: '', dataFim: '', busca: '' };
const POR_PAGINA = 50;

export default function AuditoriaPage() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [page, setPage] = useState(1);
  const [expandido, setExpandido] = useState<number | null>(null);

  const alterarFiltro = (campo: keyof Filtros, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPage(1);
  };

  const { data: opcoes } = useQuery<{ usuarios: { id: number; nome: string; ativo: boolean }[]; tabelas: string[] }>({
    queryKey: ['auditoria', 'filtros'],
    queryFn: () => api.get('/auditoria/filtros').then((r) => r.data),
  });

  const params = Object.fromEntries(Object.entries({ ...filtros, page, limit: POR_PAGINA }).filter(([, v]) => v !== ''));
  const { data, isLoading, isFetching } = useQuery<{ data: RegistroAuditoria[]; total: number }>({
    queryKey: ['auditoria', params],
    queryFn: () => api.get('/auditoria', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = Object.values(filtros).some(Boolean);

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Auditoria" description="Tudo que foi criado, alterado ou excluído no sistema — por quem e quando" />

      {/* FILTROS */}
      <div className="ui-card p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={filtros.busca}
          onChange={(e) => alterarFiltro('busca', e.target.value)}
          placeholder="Buscar placa, instrução, valor, usuário..."
          className="ui-input lg:col-span-2"
        />
        <select value={filtros.usuarioId} onChange={(e) => alterarFiltro('usuarioId', e.target.value)} className="ui-input">
          <option value="">Todos os usuários</option>
          {opcoes?.usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}{u.ativo ? '' : ' (inativo)'}</option>
          ))}
        </select>
        <select value={filtros.tabela} onChange={(e) => alterarFiltro('tabela', e.target.value)} className="ui-input">
          <option value="">Todos os módulos</option>
          {opcoes?.tabelas.map((t) => <option key={t} value={t}>{labelTabela(t)}</option>)}
        </select>
        <select value={filtros.acao} onChange={(e) => alterarFiltro('acao', e.target.value)} className="ui-input">
          <option value="">Todas as ações</option>
          {(Object.keys(ACAO_LABELS) as AcaoAuditoria[]).map((a) => <option key={a} value={a}>{ACAO_LABELS[a].label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-ui-text-muted">
          De
          <input type="date" value={filtros.dataInicio} onChange={(e) => alterarFiltro('dataInicio', e.target.value)} className="ui-input" />
        </label>
        <label className="flex items-center gap-2 text-xs text-ui-text-muted">
          Até
          <input type="date" value={filtros.dataFim} onChange={(e) => alterarFiltro('dataFim', e.target.value)} className="ui-input" />
        </label>
        {temFiltro && (
          <button type="button" onClick={() => { setFiltros(FILTROS_VAZIOS); setPage(1); }} className="text-sm text-ui-text-muted hover:text-ui-text text-left">
            Limpar filtros
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="ui-card overflow-hidden">
        <div className="ui-card-header py-3 text-sm text-ui-text-muted flex items-center justify-between">
          <span>{total} registro(s){isFetching && !isLoading ? ' · atualizando...' : ''}</span>
          <span className="text-xs">Clique numa linha para ver os detalhes</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Data/hora</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Módulo</th>
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3 text-left">Campos</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-subtle">
                {(data?.data ?? []).map((r) => {
                  const aberto = expandido === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr onClick={() => setExpandido(aberto ? null : r.id)} className="cursor-pointer transition-colors hover:bg-ui-muted/60">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(r.createdAt)}</td>
                        <td className="px-4 py-3 font-medium">{r.usuario?.nome}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACAO_LABELS[r.acao].className}`}>{ACAO_LABELS[r.acao].label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{labelTabela(r.tabelaAfetada)}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-gray-800">{r.descricao ?? `#${r.registroId}`}</span>
                          {r.liberacaoId && r.tabelaAfetada !== 'Liberacao' && (
                            <Link
                              to={`/liberacoes/${r.liberacaoId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block text-xs text-blue-600 hover:underline"
                            >
                              {r.liberacaoInstrucao ?? `Liberação #${r.liberacaoId}`}
                            </Link>
                          )}
                          {r.tabelaAfetada === 'Liberacao' && r.acao !== 'DELETE' && (
                            <Link to={`/liberacoes/${r.registroId}`} onClick={(e) => e.stopPropagation()} className="block text-xs text-blue-600 hover:underline">
                              Abrir liberação
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[260px] truncate">
                          {r.acao === 'UPDATE' ? r.camposAlterados.map(labelCampo).join(', ') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {aberto ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="bg-ui-muted/40">
                          <td colSpan={7} className="px-6 py-4 space-y-3">
                            <AlteracoesDetalhe registro={r} />
                            <p className="text-[11px] text-gray-400">
                              {r.usuario?.email && <>{r.usuario.email} · </>}
                              {r.rota && <>{r.rota} · </>}
                              {r.ip && <>IP {r.ip} · </>}
                              ID do registro {r.registroId}
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {(data?.data ?? []).length === 0 && (
              <div className="p-8 text-center text-gray-400">Nenhum registro encontrado.</div>
            )}
          </div>
        )}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-ui-border px-4 py-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="ui-btn-outline disabled:opacity-40">Anterior</button>
            <span className="text-ui-text-muted">Página {page} de {totalPaginas}</span>
            <button type="button" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)} className="ui-btn-outline disabled:opacity-40">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
}
