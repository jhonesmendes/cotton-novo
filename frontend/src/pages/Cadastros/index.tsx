import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardDocumentCheckIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth.store';

const grupos = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'filiais', label: 'Filiais embarcadoras', somenteAdmin: true, hint: 'Somente administradores criam e editam filiais' },
  { key: 'destinos', label: 'Destinos' },
  { key: 'origens', label: 'Origens' },
  { key: 'locaisColeta', label: 'Locais de coleta' },
  { key: 'modelosCarreta', label: 'Modelos de carreta', manageTo: '/cadastros/modelos' },
  { key: 'motoristas', label: 'Motoristas', hint: 'Criado automaticamente ao cadastrar um veículo numa liberação' },
] as const;

type Uso = { liberacoes: { id: number; instrucao: string; status: string }[]; veiculos: { id: number; placa: string; status: string; liberacao: { id: number; instrucao: string } }[]; usuarios: { id: number; nome: string; email: string }[] };
const emUso = (u?: Uso) => !!u && u.liberacoes.length + u.veiculos.length + u.usuarios.length > 0;
const rotuloStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase();

const erroApi = (e: any, padrao: string) => e?.response?.data?.error?.message || padrao;

export default function CadastrosPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.perfil) === 'ADMIN';
  const [modal, setModal] = useState<{ tipo: string; label: string; atual?: string } | null>(null);
  const [valor, setValor] = useState('');
  const [exclusao, setExclusao] = useState<{ tipo: string; label: string; valor: string; opcoes: string[]; uso?: Uso } | null>(null);
  const [substituto, setSubstituto] = useState('');
  const { data: refs, isLoading } = useQuery({ queryKey: ['liberacoes-referencias'], queryFn: () => api.get('/liberacoes/referencias/lista').then(r => r.data) });
  const invalidar = () => { qc.invalidateQueries({ queryKey: ['liberacoes-referencias'] }); qc.invalidateQueries({ queryKey: ['liberacoes'] }); qc.invalidateQueries({ queryKey: ['origens'] }); };
  const salvar = useMutation({ mutationFn: (d: any) => d.atual ? api.patch('/liberacoes/referencias', d) : api.post('/liberacoes/referencias', d), onSuccess: () => { toast.success('Dados atualizados'); invalidar(); setModal(null); }, onError: (e) => toast.error(erroApi(e, 'Não foi possível salvar')) });
  const excluir = useMutation({ mutationFn: (d: any) => api.delete('/liberacoes/referencias', { data: d }), onSuccess: (r) => { const n = r.data?.transferidos ?? 0; toast.success(n ? `Excluído — ${n} liberação(ões) transferida(s)` : 'Excluído'); invalidar(); setExclusao(null); }, onError: (e) => toast.error(erroApi(e, 'Não foi possível excluir')) });
  const abrir = (tipo: string, label: string, atual?: string) => { setModal({ tipo, label, atual }); setValor(atual ?? ''); };
  const confirmar = () => { const texto = valor.trim(); if (texto && modal) salvar.mutate(modal.atual ? { tipo: modal.tipo, atual: modal.atual, novo: texto } : { tipo: modal.tipo, valor: texto }); };
  // Consulta onde o item é usado antes de excluir: sem vínculo exclui direto; com vínculo mostra onde está.
  const abrirExclusao = (tipo: string, label: string, item: string, itens: string[]) => { const base = { tipo, label, valor: item, opcoes: itens.filter(i => i !== item) }; setExclusao(base); setSubstituto(''); api.get('/liberacoes/referencias/uso', { params: { tipo, valor: item } }).then(r => setExclusao(atual => atual?.valor === item ? { ...base, uso: r.data } : atual)).catch(e => { toast.error(erroApi(e, 'Não foi possível verificar o uso')); setExclusao(null); }); };
  const confirmarExclusao = () => { if (exclusao) excluir.mutate({ tipo: exclusao.tipo, valor: exclusao.valor, ...(substituto && { substituto }) }); };

  return <div className="ui-page space-y-6"><div className="flex gap-4"><div className="p-3 rounded-ui-lg bg-indigo-100 text-ui-primary"><ClipboardDocumentCheckIcon className="h-6 w-6" /></div><PageHeader title="Revisão de Dados" description="Referências disponíveis para preenchimento nas liberações." /></div>
    {isLoading ? <div className="p-10 text-center text-gray-400">Carregando...</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{grupos.map((grupo: any) => { const { key, label } = grupo; const itens: string[] = refs?.[key] ?? []; const manageTo: string | undefined = grupo.manageTo; const hint: string = grupo.hint ?? 'Dados usados nas liberações'; const editavel = !grupo.somenteAdmin || isAdmin; const adicionavel = editavel && !manageTo && !['modelosCarreta', 'motoristas'].includes(key); const excluivel = isAdmin; return <section key={key} className="overflow-hidden rounded-xl border bg-white"><header className="flex items-center justify-between border-b bg-gray-50 px-5 py-4"><div><h2 className="font-semibold">{label}</h2><p className="text-xs text-gray-500">{hint}</p></div><div className="flex gap-2 items-center">{manageTo && <Link to={manageTo} className="rounded-lg bg-ui-primary p-2 text-white hover:bg-ui-primary-hover" title={`Gerenciar ${label}`}><PlusIcon className="h-4 w-4" /></Link>}{adicionavel && <button onClick={() => abrir(key, label)} className="rounded-lg bg-ui-primary p-2 text-white hover:bg-ui-primary-hover" title={`Adicionar ${label}`}><PlusIcon className="h-4 w-4" /></button>}<span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{itens.length}</span></div></header><div className="max-h-52 overflow-y-auto divide-y">{itens.map((item: string) => <div key={item} className="flex items-center justify-between px-5 py-3 text-sm"><span>{item}</span><div className="flex gap-1">{editavel && <button onClick={() => abrir(key, label, item)} className="text-ui-primary hover:bg-indigo-50 rounded p-1" title="Editar"><PencilSquareIcon className="h-4 w-4" /></button>}{excluivel && <button onClick={() => abrirExclusao(key, label, item, itens)} className="text-red-600 hover:bg-red-50 rounded p-1" title="Excluir"><TrashIcon className="h-4 w-4" /></button>}</div></div>)}</div></section>; })}</div>}
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onMouseDown={() => setModal(null)}><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="border-b px-6 py-4"><h2 className="text-lg font-bold">{modal.atual ? `Editar ${modal.label}` : `Adicionar ${modal.label}`}</h2><p className="mt-1 text-sm text-gray-500">{modal.tipo === 'motoristas' ? 'Aplicado a todos os veículos desse motorista. Para informar o CPF, use: NOME · CPF 12345678900' : modal.atual ? 'A alteração será aplicada às liberações vinculadas.' : 'O valor ficará disponível como sugestão.'}</p></div><div className="px-6 py-5"><label className="mb-1 block text-xs font-medium text-gray-600">Nome</label><input autoFocus value={valor} onChange={e => setValor(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmar()} className="w-full rounded-lg border px-3 py-2 outline-none focus:border-ui-primary focus:ring-2 focus:ring-indigo-100" /></div><div className="flex justify-end gap-3 px-6 pb-5"><button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button onClick={confirmar} disabled={salvar.isPending} className="rounded-lg bg-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ui-primary-hover">Salvar</button></div></div></div>}
    {exclusao && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onMouseDown={() => setExclusao(null)}><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
      <div className="border-b px-6 py-4"><h2 className="text-lg font-bold">Excluir {exclusao.label}</h2><p className="mt-1 text-sm text-gray-500 break-words"><strong>{exclusao.valor}</strong></p></div>
      {!exclusao.uso ? <div className="px-6 py-8 text-center text-sm text-gray-400">Verificando onde está em uso...</div> : !emUso(exclusao.uso) ? <>
        <div className="px-6 py-5 text-sm text-gray-600">Não está em uso em nenhuma liberação ou cadastro. Pode ser excluído direto.</div>
        <div className="flex justify-end gap-3 px-6 pb-5"><button onClick={() => setExclusao(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button onClick={confirmarExclusao} disabled={excluir.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{excluir.isPending ? 'Excluindo...' : 'Excluir'}</button></div>
      </> : <>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Este dado está em uso e não pode ser excluído direto. Corrija os registros abaixo (editando o nome) ou transfira-os para outro item.</div>
          <div className="max-h-56 overflow-y-auto rounded-lg border divide-y text-sm">
            {exclusao.uso.liberacoes.map(l => <div key={`l${l.id}`} className="flex justify-between gap-3 px-3 py-2"><Link to={`/liberacoes/${l.id}`} className="font-medium text-ui-primary hover:underline">{l.instrucao}</Link><span className="text-xs text-gray-500">Liberação · {rotuloStatus(l.status)}</span></div>)}
            {exclusao.uso.veiculos.map(v => <div key={`v${v.id}`} className="flex justify-between gap-3 px-3 py-2"><span><span className="font-semibold">{v.placa}</span> · <Link to={`/liberacoes/${v.liberacao.id}`} className="text-ui-primary hover:underline">{v.liberacao.instrucao}</Link></span><span className="text-xs text-gray-500">Veículo · {rotuloStatus(v.status)}</span></div>)}
            {exclusao.uso.usuarios.map(u => <div key={`u${u.id}`} className="flex justify-between gap-3 px-3 py-2"><span>{u.nome}</span><span className="text-xs text-gray-500">Usuário · {u.email}</span></div>)}
          </div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Transferir tudo para</label><select value={substituto} onChange={e => setSubstituto(e.target.value)} className="w-full rounded-lg border px-3 py-2 outline-none focus:border-ui-primary focus:ring-2 focus:ring-indigo-100"><option value="">Selecione...</option>{exclusao.opcoes.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-5"><button onClick={() => setExclusao(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button onClick={() => { const { tipo, label, valor } = exclusao; setExclusao(null); abrir(tipo, label, valor); }} className="rounded-lg border border-ui-primary px-4 py-2 text-sm font-semibold text-ui-primary hover:bg-indigo-50">Editar nome</button><button onClick={confirmarExclusao} disabled={!substituto || excluir.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{excluir.isPending ? 'Transferindo...' : 'Transferir e excluir'}</button></div>
      </>}
    </div></div>}
  </div>;
}
