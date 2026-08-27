import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardDocumentCheckIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';

const grupos = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'filiais', label: 'Filiais embarcadoras' },
  { key: 'destinos', label: 'Destinos' },
  { key: 'origens', label: 'Origens' },
  { key: 'locaisColeta', label: 'Locais de coleta' },
  { key: 'modelosCarreta', label: 'Modelos de carreta', manageTo: '/cadastros/modelos' },
  { key: 'motoristas', label: 'Motoristas', hint: 'Criado automaticamente ao cadastrar um veículo numa liberação' },
] as const;

export default function CadastrosPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ tipo: string; label: string; atual?: string } | null>(null);
  const [valor, setValor] = useState('');
  const { data: refs, isLoading } = useQuery({ queryKey: ['liberacoes-referencias'], queryFn: () => api.get('/liberacoes/referencias/lista').then(r => r.data) });
  const salvar = useMutation({ mutationFn: (d: any) => d.atual ? api.patch('/liberacoes/referencias', d) : api.post('/liberacoes/referencias', d), onSuccess: () => { toast.success('Dados atualizados'); qc.invalidateQueries({ queryKey: ['liberacoes-referencias'] }); qc.invalidateQueries({ queryKey: ['liberacoes'] }); setModal(null); }, onError: () => toast.error('Não foi possível salvar') });
  const abrir = (tipo: string, label: string, atual?: string) => { setModal({ tipo, label, atual }); setValor(atual ?? ''); };
  const confirmar = () => { const texto = valor.trim(); if (texto && modal) salvar.mutate(modal.atual ? { tipo: modal.tipo, atual: modal.atual, novo: texto } : { tipo: modal.tipo, valor: texto }); };

  return <div className="ui-page space-y-6"><div className="flex gap-4"><div className="p-3 rounded-ui-lg bg-indigo-100 text-ui-primary"><ClipboardDocumentCheckIcon className="h-6 w-6" /></div><PageHeader title="Revisão de Dados" description="Referências disponíveis para preenchimento nas liberações." /></div>
    {isLoading ? <div className="p-10 text-center text-gray-400">Carregando...</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{grupos.map((grupo: any) => { const { key, label } = grupo; const itens = refs?.[key] ?? []; const manageTo: string | undefined = grupo.manageTo; const hint: string = grupo.hint ?? 'Dados usados nas liberações'; const adicionavel = !manageTo && !['modelosCarreta', 'motoristas'].includes(key); return <section key={key} className="overflow-hidden rounded-xl border bg-white"><header className="flex items-center justify-between border-b bg-gray-50 px-5 py-4"><div><h2 className="font-semibold">{label}</h2><p className="text-xs text-gray-500">{hint}</p></div><div className="flex gap-2 items-center">{manageTo && <Link to={manageTo} className="rounded-lg bg-ui-primary p-2 text-white hover:bg-ui-primary-hover" title={`Gerenciar ${label}`}><PlusIcon className="h-4 w-4" /></Link>}{adicionavel && <button onClick={() => abrir(key, label)} className="rounded-lg bg-ui-primary p-2 text-white hover:bg-ui-primary-hover" title={`Adicionar ${label}`}><PlusIcon className="h-4 w-4" /></button>}<span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{itens.length}</span></div></header><div className="max-h-52 overflow-y-auto divide-y">{itens.map((item: string) => <div key={item} className="flex justify-between px-5 py-3 text-sm"><span>{item}</span><button onClick={() => abrir(key, label, item)} className="text-ui-primary hover:bg-indigo-50 rounded p-1" title="Editar"><PencilSquareIcon className="h-4 w-4" /></button></div>)}</div></section>; })}</div>}
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onMouseDown={() => setModal(null)}><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="border-b px-6 py-4"><h2 className="text-lg font-bold">{modal.atual ? `Editar ${modal.label}` : `Adicionar ${modal.label}`}</h2><p className="mt-1 text-sm text-gray-500">{modal.atual ? 'A alteração será aplicada às liberações vinculadas.' : 'O valor ficará disponível como sugestão.'}</p></div><div className="px-6 py-5"><label className="mb-1 block text-xs font-medium text-gray-600">Nome</label><input autoFocus value={valor} onChange={e => setValor(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmar()} className="w-full rounded-lg border px-3 py-2 outline-none focus:border-ui-primary focus:ring-2 focus:ring-indigo-100" /></div><div className="flex justify-end gap-3 px-6 pb-5"><button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button><button onClick={confirmar} disabled={salvar.isPending} className="rounded-lg bg-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-ui-primary-hover">Salvar</button></div></div></div>}
  </div>;
}
