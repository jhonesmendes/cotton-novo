import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowUturnLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmModal from '@/components/ConfirmModal';
import AbasConfiguracoes from './Abas';

// Configurações › Permissões: o Administrador marca, para cada perfil e tela,
// o que pode — Ver, Incluir, Alterar, Excluir. Vale na hora, inclusive no backend
// (cada rota confere a permissão). ADMIN tem sempre tudo; GR e Visitante são fixos.
type Acao = 'ver' | 'incluir' | 'alterar' | 'excluir';
interface TelaDef { tela: string; rotulo: string; acoes: Acao[]; ajuda?: string }
interface PerfilPerm { perfil: string; permissoes: Record<string, Acao[]>; padrao: Record<string, Acao[]> }

const ROTULO_PERFIL: Record<string, string> = {
  OPERADOR: 'Operador', GESTOR_FILIAL: 'Gestor de Filial', VISUALIZADOR: 'Visualizador', CLIENTE: 'Cliente (interno)',
};
const ROTULO_ACAO: Record<Acao, string> = { ver: 'Ver', incluir: 'Incluir', alterar: 'Alterar', excluir: 'Excluir' };
const ACOES: Acao[] = ['ver', 'incluir', 'alterar', 'excluir'];

const erro = (e: any, padrao: string) => e?.response?.data?.error?.message ?? padrao;
const iguais = (a: Record<string, Acao[]>, b: Record<string, Acao[]>) =>
  Object.keys({ ...a, ...b }).every((t) => [...(a[t] ?? [])].sort().join() === [...(b[t] ?? [])].sort().join());

export default function PermissoesPage() {
  const qc = useQueryClient();
  const { data } = useQuery<{ telas: TelaDef[]; perfis: PerfilPerm[] }>({
    queryKey: ['permissoes', 'matriz'],
    queryFn: () => api.get('/permissoes').then((r) => r.data),
  });
  const [perfil, setPerfil] = useState('OPERADOR');
  const [rascunho, setRascunho] = useState<Record<string, Acao[]>>({});
  const [restaurar, setRestaurar] = useState(false);
  const atual = data?.perfis.find((p) => p.perfil === perfil);

  useEffect(() => { if (atual) setRascunho(atual.permissoes); }, [atual]);
  const alterado = useMemo(() => !!atual && !iguais(rascunho, atual.permissoes), [rascunho, atual]);
  const noPadrao = !!atual && iguais(atual.permissoes, Object.fromEntries((data?.telas ?? []).map((t) => [t.tela, atual.padrao[t.tela] ?? []])));

  const marcar = (tela: string, acao: Acao, valor: boolean) => setRascunho((r) => {
    const set = new Set(r[tela] ?? []);
    if (valor) {
      set.add(acao);
      set.add('ver'); // qualquer ação pressupõe ver a tela
    } else if (acao === 'ver') {
      set.clear(); // sem ver, nada mais
    } else {
      set.delete(acao);
    }
    return { ...r, [tela]: [...set] as Acao[] };
  });

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ['permissoes'] });
  };
  const salvar = useMutation({
    mutationFn: () => api.put('/permissoes', { perfil, permissoes: rascunho }),
    onSuccess: () => { toast.success(`Permissões de ${ROTULO_PERFIL[perfil]} salvas`); recarregar(); },
    onError: (e) => toast.error(erro(e, 'Não foi possível salvar')),
  });
  const voltarPadrao = useMutation({
    mutationFn: () => api.post(`/permissoes/${perfil}/restaurar`),
    onSuccess: () => { toast.success('Permissões padrão restauradas'); setRestaurar(false); recarregar(); },
    onError: (e) => toast.error(erro(e, 'Não foi possível restaurar')),
  });

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Configurações" description="Usuários, servidor de e-mail e permissões" />
      <AbasConfiguracoes />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Perfil">
        {(data?.perfis ?? []).map((p) => (
          <button key={p.perfil} type="button" role="tab" aria-selected={perfil === p.perfil}
            onClick={() => { if (alterado && !window.confirm('Descartar as alterações não salvas?')) return; setPerfil(p.perfil); }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${perfil === p.perfil ? 'border-ui-primary bg-ui-primary text-white' : 'border-ui-border text-ui-text-muted hover:bg-ui-muted'}`}>
            {ROTULO_PERFIL[p.perfil] ?? p.perfil}
          </button>
        ))}
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ui-muted text-xs uppercase text-ui-text-muted">
              <tr>
                <th className="px-5 py-3 text-left">Tela</th>
                {ACOES.map((a) => <th key={a} className="w-24 px-3 py-3 text-center">{ROTULO_ACAO[a]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-subtle">
              {(data?.telas ?? []).map((t) => (
                <tr key={t.tela} className="hover:bg-ui-muted/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ui-text">{t.rotulo}</p>
                    {t.ajuda && <p className="text-xs text-ui-text-muted">{t.ajuda}</p>}
                  </td>
                  {ACOES.map((a) => {
                    const existe = t.acoes.includes(a);
                    const marcado = (rascunho[t.tela] ?? []).includes(a);
                    const padrao = (atual?.padrao[t.tela] ?? []).includes(a);
                    return (
                      <td key={a} className="px-3 py-3 text-center">
                        {existe ? (
                          <label className="inline-flex cursor-pointer items-center justify-center p-1" title={`${ROTULO_ACAO[a]} em ${t.rotulo}${padrao ? ' (padrão: sim)' : ' (padrão: não)'}`}>
                            <input type="checkbox" checked={marcado} onChange={(e) => marcar(t.tela, a, e.target.checked)}
                              aria-label={`${ROTULO_ACAO[a]} — ${t.rotulo}`} className="h-4 w-4" />
                          </label>
                        ) : <span className="text-ui-text-muted" aria-hidden>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border-subtle px-5 py-4">
          <p className="text-xs text-ui-text-muted">
            {alterado ? 'Há alterações não salvas.' : noPadrao ? 'Este perfil está com as permissões padrão.' : 'Este perfil tem permissões personalizadas.'}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRestaurar(true)} disabled={noPadrao || voltarPadrao.isPending} className="ui-btn-outline">
              <ArrowUturnLeftIcon className="h-4 w-4" />Restaurar padrão
            </button>
            {alterado && <button type="button" onClick={() => atual && setRascunho(atual.permissoes)} className="ui-btn-outline">Descartar</button>}
            <button type="button" onClick={() => salvar.mutate()} disabled={!alterado || salvar.isPending} className="ui-btn-primary">
              {salvar.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      <div className="ui-card space-y-2 p-5 text-sm text-ui-text-muted">
        <p className="flex items-center gap-2 font-semibold text-ui-text"><LockClosedIcon className="h-4 w-4" />Fixo (não muda por aqui)</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-ui-text">Administrador</strong>: tudo, sempre — para ninguém perder o acesso de administração por engano.</li>
          <li><strong className="text-ui-text">Usuários, E-mail, Permissões, Acesso do cliente e Auditoria</strong>: só Administrador (liberar Usuários deixaria outro perfil virar administrador).</li>
          <li><strong className="text-ui-text">GR</strong>: só a tela GR (SM, rastreamento e isca). <strong className="text-ui-text">Visitante</strong>: só a posição do cliente dele.</li>
          <li>Regras de negócio que continuam só do Administrador: finalizar instrução com pendência, mudar status direto, reativar veículo, criar cliente/filial/destino/origem/modelo novos.</li>
        </ul>
        <p>As mudanças valem na hora para quem já está logado (o menu atualiza em até 1 minuto).</p>
      </div>

      <ConfirmModal isOpen={restaurar} title={`Restaurar padrão — ${ROTULO_PERFIL[perfil]}`}
        message="As permissões deste perfil voltam a ser as do sistema. As personalizações são apagadas."
        confirmLabel="Restaurar" variant="warning" loading={voltarPadrao.isPending}
        onConfirm={() => voltarPadrao.mutate()} onCancel={() => setRestaurar(false)} />
    </div>
  );
}
