import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageHeader from '@/components/ui/PageHeader';
import AbasConfiguracoes from './Abas';

// Servidor de e-mail usado na recuperação de senha e nos convites de Visitante.
// A configuração da tela vale mais que as variáveis SMTP_* do servidor. A senha
// nunca volta para a tela (fica cifrada no banco).
interface Form { host: string; port: string; secure: boolean; user: string; pass: string; from: string }
const vazio: Form = { host: '', port: '587', secure: false, user: '', pass: '', from: '' };

const ORIGEM: Record<string, { texto: string; cls: string }> = {
  tela: { texto: 'Usando a configuração desta tela.', cls: 'border-green-200 bg-green-50 text-green-800' },
  ambiente: { texto: 'Usando as variáveis SMTP_* do servidor. Salvar aqui passa a valer no lugar delas.', cls: 'border-blue-200 bg-blue-50 text-blue-800' },
  nenhuma: { texto: 'Nenhum SMTP configurado: os e-mails (recuperação de senha, convites) não são enviados — só aparecem no log do servidor.', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
};

const erro = (e: any, padrao: string) => e?.response?.data?.error?.details?.[0]?.message ?? e?.response?.data?.error?.message ?? padrao;

export default function EmailConfigPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['config-smtp'], queryFn: () => api.get('/configuracoes/smtp').then((r) => r.data) });
  const [form, setForm] = useState<Form>(vazio);
  const [para, setPara] = useState('');
  useEffect(() => {
    if (data) setForm({ host: data.host ?? '', port: String(data.port ?? 587), secure: !!data.secure, user: data.user ?? '', pass: '', from: data.from ?? '' });
  }, [data]);
  const set = (k: keyof Form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const payload = () => ({ host: form.host, port: Number(form.port), secure: form.secure, user: form.user, from: form.from, ...(form.pass && { pass: form.pass }) });

  const salvar = useMutation({
    mutationFn: () => api.put('/configuracoes/smtp', payload()),
    onSuccess: () => { toast.success('Configuração de e-mail salva'); qc.invalidateQueries({ queryKey: ['config-smtp'] }); },
    onError: (e) => toast.error(erro(e, 'Não foi possível salvar')),
  });
  const testar = useMutation({
    mutationFn: () => api.post('/configuracoes/smtp/teste', { ...payload(), para }),
    onSuccess: () => toast.success(`E-mail de teste enviado para ${para}`),
    onError: (e) => toast.error(erro(e, 'Falha no envio de teste'), { duration: 8000 }),
  });
  const remover = useMutation({
    mutationFn: () => api.delete('/configuracoes/smtp'),
    onSuccess: () => { toast.success('Configuração removida'); qc.invalidateQueries({ queryKey: ['config-smtp'] }); },
  });

  const origem = ORIGEM[data?.origem ?? 'nenhuma'];
  // Porta 465 = SSL direto; 587 = STARTTLS.
  const trocarPorta = (p: string) => { set('port', p); if (p === '465') set('secure', true); if (p === '587') set('secure', false); };

  return (
    <div className="ui-page space-y-6">
      <PageHeader title="Configurações" description="Usuários e servidor de e-mail" />
      <AbasConfiguracoes />

      <div className={`rounded-lg border px-4 py-3 text-sm ${origem.cls}`}>{origem.texto}</div>

      <form className="ui-card grid max-w-3xl gap-4 p-6 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }}>
        <label className="text-sm text-ui-text">Servidor SMTP*
          <input required value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="smtp.seuprovedor.com.br" className="ui-input mt-1" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-ui-text">Porta*
            <select value={form.port} onChange={(e) => trocarPorta(e.target.value)} className="ui-input mt-1">
              {['587', '465', '25', '2525'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-ui-text">
            <input type="checkbox" checked={form.secure} onChange={(e) => set('secure', e.target.checked)} />SSL direto
          </label>
        </div>
        <label className="text-sm text-ui-text">Usuário
          <input value={form.user} onChange={(e) => set('user', e.target.value)} placeholder="no-reply@fibraforte.agr.br" autoComplete="off" className="ui-input mt-1" />
        </label>
        <label className="text-sm text-ui-text">Senha
          <input type="password" value={form.pass} onChange={(e) => set('pass', e.target.value)} autoComplete="new-password"
            placeholder={data?.temSenha ? '•••••••• (deixe vazio para manter)' : 'Senha ou senha de app'} className="ui-input mt-1" />
        </label>
        <label className="text-sm text-ui-text sm:col-span-2">Remetente
          <input value={form.from} onChange={(e) => set('from', e.target.value)} placeholder='Cotton Fibra Forte <no-reply@fibraforte.agr.br>' className="ui-input mt-1" />
          <span className="text-xs text-ui-text-muted">Vazio = usa o usuário como remetente.</span>
        </label>
        <p className="text-xs text-ui-text-muted sm:col-span-2">
          587 = STARTTLS (o mais comum, "SSL direto" desmarcado) · 465 = SSL direto (marcado). Gmail/Microsoft 365 pedem "senha de app".
        </p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={salvar.isPending} className="ui-btn-primary">{salvar.isPending ? 'Salvando...' : 'Salvar'}</button>
          {data?.origem === 'tela' && (
            <button type="button" onClick={() => remover.mutate()} className="ui-btn-outline">Remover configuração</button>
          )}
        </div>
      </form>

      <div className="ui-card flex max-w-3xl flex-wrap items-end gap-3 p-6">
        <label className="min-w-[240px] flex-1 text-sm text-ui-text">Enviar e-mail de teste para
          <input type="email" value={para} onChange={(e) => setPara(e.target.value)} placeholder="seu@email.com" className="ui-input mt-1" />
        </label>
        <button type="button" disabled={!para || !form.host || testar.isPending} onClick={() => testar.mutate()} className="ui-btn-outline">
          {testar.isPending ? 'Testando...' : 'Testar envio'}
        </button>
        <p className="w-full text-xs text-ui-text-muted">O teste usa os dados do formulário acima (mesmo antes de salvar).</p>
      </div>
    </div>
  );
}
