import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardDocumentIcon, LinkIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import { formatDateTime } from '@/utils/format';

// Acessos do cliente à tela de posição (só ADMIN): link temporário (24 h, sem login)
// ou convite de Visitante (e-mail com link de cadastro de 7 h). Sempre um cliente por acesso.
const SITUACAO: Record<string, { rotulo: string; cls: string }> = {
  VALIDO: { rotulo: 'Válido', cls: 'bg-green-100 text-green-700' },
  EXPIRADO: { rotulo: 'Expirado', cls: 'bg-gray-100 text-gray-500' },
  CANCELADO: { rotulo: 'Cancelado', cls: 'bg-gray-100 text-gray-500' },
  ACEITO: { rotulo: 'Visitante ativo', cls: 'bg-indigo-100 text-indigo-700' },
  VISITANTE_DESATIVADO: { rotulo: 'Visitante desativado', cls: 'bg-gray-100 text-gray-500' },
};

const erro = (e: any, padrao: string) => e?.response?.data?.error?.details?.[0]?.message ?? e?.response?.data?.error?.message ?? padrao;

async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); toast.success('Link copiado'); } catch { toast.error('Copie o link manualmente'); }
}

export default function AcessosClientePage() {
  const qc = useQueryClient();
  const [clienteId, setClienteId] = useState('');
  const [email, setEmail] = useState('');
  const [gerado, setGerado] = useState<{ url: string; expiraEm: string; tipo: string } | null>(null);

  const { data: clientes } = useQuery({ queryKey: ['clientes'], queryFn: () => api.get('/clientes').then((r) => r.data) });
  const listaClientes: any[] = Array.isArray(clientes) ? clientes : clientes?.data ?? [];
  const { data: acessos } = useQuery<any[]>({ queryKey: ['acessos-cliente'], queryFn: () => api.get('/acessos-cliente').then((r) => r.data) });

  const recarregar = () => qc.invalidateQueries({ queryKey: ['acessos-cliente'] });
  const gerarLink = useMutation({
    mutationFn: () => api.post('/acessos-cliente/link', { clienteId: Number(clienteId) }),
    onSuccess: (r) => { setGerado({ ...r.data, tipo: 'Link temporário' }); recarregar(); },
    onError: (e) => toast.error(erro(e, 'Não foi possível gerar o link')),
  });
  const convidar = useMutation({
    mutationFn: () => api.post('/acessos-cliente/convite', { clienteId: Number(clienteId), email }),
    onSuccess: (r) => { setGerado({ ...r.data, tipo: `Convite enviado para ${email}` }); setEmail(''); recarregar(); },
    onError: (e) => toast.error(erro(e, 'Não foi possível enviar o convite')),
  });
  const acao = useMutation({
    mutationFn: ({ id, tipo }: { id: number; tipo: 'reenviar' | 'cancelar' }) =>
      tipo === 'reenviar' ? api.post(`/acessos-cliente/${id}/reenviar`) : api.delete(`/acessos-cliente/${id}`),
    onSuccess: (r, v) => {
      toast.success(v.tipo === 'reenviar' ? 'Convite reenviado' : 'Acesso cancelado');
      if (v.tipo === 'reenviar') setGerado({ ...r.data, tipo: 'Convite reenviado' });
      recarregar();
    },
    onError: (e) => toast.error(erro(e, 'Não foi possível concluir')),
  });

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Acesso do cliente" description="Tela de posição dos caminhões para o cliente — link temporário ou login de Visitante" />

      <div className="ui-card space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto,auto]">
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="ui-input">
            <option value="">Selecione o cliente...</option>
            {listaClientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (só para convite)" className="ui-input" />
          <button type="button" disabled={!clienteId || gerarLink.isPending} onClick={() => gerarLink.mutate()}
            className="ui-btn-outline justify-center disabled:opacity-40" title="Link sem login, vale 24 h">
            <LinkIcon className="h-4 w-4" />Gerar link 24 h
          </button>
          <button type="button" disabled={!clienteId || !email || convidar.isPending} onClick={() => convidar.mutate()}
            className="ui-btn-primary justify-center disabled:opacity-40" title="E-mail com link de cadastro (7 h)">
            <EnvelopeIcon className="h-4 w-4" />Convidar Visitante
          </button>
        </div>
        {gerado && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <p className="font-semibold">{gerado.tipo} · vale até {formatDateTime(gerado.expiraEm)}</p>
            <div className="mt-2 flex gap-2">
              <input readOnly value={gerado.url} className="ui-input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
              <button type="button" onClick={() => copiar(gerado.url)} className="ui-btn-outline"><ClipboardDocumentIcon className="h-4 w-4" />Copiar</button>
            </div>
            <p className="mt-1 text-xs">O link só aparece agora — depois não dá para recuperar (gere outro se precisar).</p>
          </div>
        )}
      </div>

      <div className="ui-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">E-mail / Visitante</th>
              <th className="px-4 py-3 text-left">Gerado</th>
              <th className="px-4 py-3 text-left">Validade</th>
              <th className="px-4 py-3 text-left">Situação</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border-subtle">
            {(acessos ?? []).map((a) => {
              const s = SITUACAO[a.situacao] ?? { rotulo: a.situacao, cls: '' };
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3">{a.tipo === 'LINK' ? 'Link 24 h' : 'Convite'}</td>
                  <td className="px-4 py-3">{a.cliente?.nome}</td>
                  <td className="px-4 py-3 text-xs">{a.usuario ? `${a.usuario.nome} · ${a.usuario.email}` : a.email ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-ui-text-muted">{a.geradoPor?.nome} · {formatDateTime(a.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-ui-text-muted">
                    {formatDateTime(a.expiraEm)}
                    {a.tipo === 'LINK' && a.usadoEm && <p>aberto em {formatDateTime(a.usadoEm)}</p>}
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.rotulo}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    {a.tipo === 'CONVITE' && !a.aceitoEm && !a.canceladoEm && (
                      <button type="button" onClick={() => acao.mutate({ id: a.id, tipo: 'reenviar' })} className="mr-3 font-semibold text-ui-primary hover:underline">Reenviar</button>
                    )}
                    {(a.situacao === 'VALIDO' || a.situacao === 'ACEITO') && (
                      <button type="button" onClick={() => acao.mutate({ id: a.id, tipo: 'cancelar' })} className="font-semibold text-red-600 hover:underline">
                        {a.situacao === 'ACEITO' ? 'Desativar visitante' : 'Cancelar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!acessos?.length && <tr><td colSpan={7} className="p-8 text-center text-ui-text-muted">Nenhum acesso gerado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
