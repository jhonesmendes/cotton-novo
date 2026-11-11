import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

interface Parametro {
  chave: string;
  rotulo: string;
  descricao: string;
  unidade: string;
  min: number;
  max: number;
  valor: number;
}

// Valores ajustáveis das regras do sistema. Só ADMIN altera; cada mudança entra na auditoria.
export default function ParametrosSection() {
  const isAdmin = useAuthStore((s) => s.user?.perfil) === 'ADMIN';
  const { data } = useQuery<Parametro[]>({ queryKey: ['parametros'], queryFn: () => api.get('/parametros').then((r) => r.data) });

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <header className="flex items-center gap-3 border-b bg-gray-50 px-5 py-4">
        <AdjustmentsHorizontalIcon className="h-5 w-5 text-ui-primary" />
        <div>
          <h2 className="font-semibold">Parâmetros</h2>
          <p className="text-xs text-gray-500">{isAdmin ? 'Valores usados pelas regras do sistema' : 'Somente administradores alteram'}</p>
        </div>
      </header>
      <div className="divide-y">
        {(data ?? []).map((p) => <LinhaParametro key={p.chave} parametro={p} editavel={isAdmin} />)}
      </div>
    </section>
  );
}

function LinhaParametro({ parametro, editavel }: { parametro: Parametro; editavel: boolean }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(String(parametro.valor));
  useEffect(() => setValor(String(parametro.valor)), [parametro.valor]);
  const salvar = useMutation({
    mutationFn: () => api.put('/parametros', { chave: parametro.chave, valor: Number(valor.replace(',', '.')) }),
    onSuccess: () => {
      toast.success('Parâmetro salvo');
      qc.invalidateQueries({ queryKey: ['parametros'] });
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      qc.invalidateQueries({ queryKey: ['liberacao'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Não foi possível salvar'),
  });
  const alterado = Number(valor.replace(',', '.')) !== parametro.valor;

  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
      <div className="min-w-[220px] flex-1">
        <p className="font-medium text-gray-800">{parametro.rotulo}</p>
        <p className="text-xs text-gray-500">{parametro.descricao}</p>
      </div>
      <div className="flex items-center gap-2">
        <input type="number" step="0.1" min={parametro.min} max={parametro.max} value={valor} disabled={!editavel}
          onChange={(e) => setValor(e.target.value)}
          className="w-24 rounded-lg border px-2 py-1.5 text-right disabled:bg-gray-50" />
        <span className="text-gray-500">{parametro.unidade}</span>
        {editavel && (
          <button onClick={() => salvar.mutate()} disabled={!alterado || salvar.isPending || valor === ''}
            className="rounded-lg bg-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-ui-primary-hover disabled:opacity-40">
            Salvar
          </button>
        )}
      </div>
    </div>
  );
}
