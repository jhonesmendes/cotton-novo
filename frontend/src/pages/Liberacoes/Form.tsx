import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';
import EscolhaModal from '@/components/EscolhaModal';

const liberacaoSchema = z.object({
  instrucao: z.string().min(1, 'Instrução é obrigatória'),
  dataLiberacao: z.string().min(1, 'Data da liberação é obrigatória'),
  dataColeta: z.string().min(1, 'Data de coleta é obrigatória'),
  clienteNome: z.string().min(2, 'Informe o cliente'),
  filialNome: z.string().min(2, 'Informe a filial'),
  destinoNome: z.string().min(2, 'Informe o destino'),
  origemNome: z.string().min(2, 'Informe a origem'),
  localColetaNome: z.string().min(2, 'Informe o local de coleta'),
  freteEmpresa: z.coerce.number().min(0.01, 'Deve ser maior que 0'),
  // Opcional (liberações antigas não têm). Vazio = null.
  freteMotorista: z.preprocess((v) => (v === '' || v == null || Number.isNaN(v) ? null : Number(v)), z.number().min(0, 'Não pode ser negativo').nullable()),
  totalFardos: z.coerce.number().int().min(1, 'Deve ser maior que 0'),
  tipoFardo: z.string().min(1, 'Tipo de fardo é obrigatório'),
  deadline: z.string().min(1, 'Dead line é obrigatória'),
  observacao: z.string().optional().nullable(),
});

type LiberacaoFormData = z.infer<typeof liberacaoSchema>;

export default function LiberacaoForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  // Só ADMIN cadastra cliente/filial/destino/origem novos digitando; os demais
  // escolhem um existente. Local de coleta é livre, com aviso de parecido.
  const isAdmin = useAuthStore((s) => s.user?.perfil) === 'ADMIN';
  // Backend achou local de coleta parecido com o digitado (LOCAL_COLETA_SIMILAR).
  const [localSimilar, setLocalSimilar] = useState<{ valor: string; similares: string[]; etapa: 'usar' | 'confirmar' } | null>(null);
  const ultimoEnvio = useRef<any>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<LiberacaoFormData>({
    resolver: zodResolver(liberacaoSchema) as any,
    defaultValues: {
      tipoFardo: 'FARDAO',
    }
  });

  const { data: editData, isFetchedAfterMount } = useQuery({
    queryKey: ['liberacao', id],
    queryFn: () => api.get(`/liberacoes/${id}`).then((r) => r.data),
    enabled: isEdit,
    // Abre sempre com o dado atual do servidor e não recarrega durante a edição.
    refetchOnMount: 'always',
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
  // O formulário é preenchido uma única vez (ver efeito abaixo).
  const preenchido = useRef(false);

  const { data: referencias } = useQuery({
    queryKey: ['liberacoes-referencias'],
    queryFn: () => api.get('/liberacoes/referencias/lista').then((r) => r.data),
  });


  useEffect(() => {
    // Espera as referências carregarem: o <select> de filial descarta valor sem <option> correspondente.
    if (editData && isFetchedAfterMount && referencias && !preenchido.current) {
      preenchido.current = true;
      reset({
        ...editData,
        dataLiberacao: editData.dataLiberacao?.slice(0, 10),
        dataColeta: editData.dataColeta?.slice(0, 10),
        deadline: editData.deadline?.slice(0, 10),
        clienteNome: editData.clienteNome ?? editData.cliente?.nome ?? '',
        filialNome: editData.filialNome ?? editData.origem?.nome ?? '',
        origemNome: editData.origemNome ?? editData.terminal?.nome ?? '',
        destinoNome: editData.destinoNome ?? editData.destino?.nome ?? '',
        localColetaNome: editData.localColetaNome ?? editData.localColeta?.nome ?? '',
      });
    }
  }, [editData, isFetchedAfterMount, referencias, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEdit ? api.put(`/liberacoes/${id}`, data) : api.post('/liberacoes', data),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Liberação atualizada' : 'Liberação criada');
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      qc.invalidateQueries({ queryKey: ['liberacao', String(res.data.id)] });
      navigate(`/liberacoes/${res.data.id}`);
    },
    onError: (e: any) => {
      const erro = e?.response?.data?.error;
      if (erro?.code === 'LOCAL_COLETA_SIMILAR') {
        setLocalSimilar({ ...erro.details, etapa: 'usar' });
        return;
      }
      toast.error(erro?.message || 'Erro ao salvar');
    },
  });

  const onSubmit = (data: any) => {
    ultimoEnvio.current = data;
    mutation.mutate(data);
  };

  function usarLocalExistente(nome: string) {
    setValue('localColetaNome', nome);
    setLocalSimilar(null);
    onSubmit({ ...ultimoEnvio.current, localColetaNome: nome });
  }

  function criarLocalMesmoAssim() {
    setLocalSimilar(null);
    mutation.mutate({ ...ultimoEnvio.current, confirmarLocalColetaSimilar: true });
  }


  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Editar Liberação' : 'Nova Liberação'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border p-6 space-y-6">
        {/* Informações Básicas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">Informações Básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instrução*" {...register('instrucao')} error={errors.instrucao?.message} placeholder="S07453-MÃE-JAN-01" />
            <CampoReferencia label="Cliente*" {...register('clienteNome')} error={errors.clienteNome?.message} placeholder="Digite o cliente" opcoes={referencias?.clientes} livre={isAdmin} />
            <CampoReferencia label="Filial Embarcadora*" {...register('filialNome')} error={errors.filialNome?.message} placeholder="Digite a filial" opcoes={referencias?.filiais} livre={isAdmin} />
            <CampoReferencia label="Destino*" {...register('destinoNome')} error={errors.destinoNome?.message} placeholder="Digite o destino" opcoes={referencias?.destinos} livre={isAdmin} />
            <CampoReferencia label="Origem*" {...register('origemNome')} error={errors.origemNome?.message} placeholder="Digite a origem" opcoes={referencias?.origens} livre={isAdmin} />
            <Field label="Local de Coleta*" {...register('localColetaNome')} error={errors.localColetaNome?.message} placeholder="Digite o local de coleta" suggestions={referencias?.locaisColeta} />
          </div>
        </section>

        {/* Detalhes da Carga */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">Detalhes da Carga</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data da Liberação*" type="date" {...register('dataLiberacao')} error={errors.dataLiberacao?.message} />
            <Field label="Data de Coleta*" type="date" {...register('dataColeta')} error={errors.dataColeta?.message} />
            <Field label="Dead Line*" type="date" {...register('deadline')} error={errors.deadline?.message} />
            <Field label="Total de Fardos*" type="number" {...register('totalFardos')} error={errors.totalFardos?.message} />
            <Field label="Frete Empresa (R$/t)*" type="number" step="0.01" {...register('freteEmpresa')} error={errors.freteEmpresa?.message} />
            <div>
              <Field label="Frete Motorista (R$/t)" type="number" step="0.01" {...register('freteMotorista')} error={errors.freteMotorista?.message} />
              <MargemPrevia empresa={watch('freteEmpresa')} motorista={watch('freteMotorista')} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de Fardo</label>
              <select {...register('tipoFardo')}
                className={`w-full border ${errors.tipoFardo ? 'border-red-500' : 'border-gray-200'} rounded px-2 py-1.5 text-sm`}>
                <option value="FARDAO">FARDÃO</option>
                <option value="FARDINHO">FARDINHO</option>
              </select>
              {errors.tipoFardo && <p className="text-[10px] text-red-500 mt-0.5">{errors.tipoFardo.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observação</label>
              <textarea {...register('observacao')}
                rows={2} className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="px-5 py-2 bg-ui-primary text-white rounded-lg text-sm font-semibold hover:bg-ui-primary-hover disabled:opacity-60">
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Liberação'}
          </button>
        </div>
      </form>

      <EscolhaModal
        isOpen={!!localSimilar}
        title={localSimilar?.etapa === 'confirmar' ? 'Criar novo local de coleta?' : 'Local de coleta já existe'}
        loading={mutation.isPending}
        onClose={() => setLocalSimilar(null)}
        acoes={localSimilar?.etapa === 'confirmar'
          ? [
            { label: 'Voltar', variante: 'secundaria', onClick: () => setLocalSimilar((l) => l && { ...l, etapa: 'usar' }) },
            { label: 'Sim, criar novo', onClick: criarLocalMesmoAssim },
          ]
          : [{ label: 'Não, é outro local', variante: 'secundaria', onClick: () => setLocalSimilar((l) => l && { ...l, etapa: 'confirmar' }) }]}
      >
        {localSimilar?.etapa === 'confirmar' ? (
          <p>
            Será criado um novo local de coleta <strong>{localSimilar.valor}</strong>, semelhante a{' '}
            <strong>{localSimilar.similares.join(', ')}</strong>, que já existe no sistema. Confirma o cadastro?
          </p>
        ) : (
          <>
            <p>Já existe local de coleta parecido com <strong>{localSimilar?.valor}</strong>. Deseja usar o cadastro existente?</p>
            <div className="mt-3 divide-y rounded-lg border">
              {localSimilar?.similares.map((item) => (
                <div key={item} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="font-medium text-gray-800">{item}</span>
                  <button type="button" onClick={() => usarLocalExistente(item)} disabled={mutation.isPending}
                    className="rounded-lg bg-ui-primary px-3 py-1 text-xs font-semibold text-white hover:bg-ui-primary-hover disabled:opacity-50">
                    Sim, usar este
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </EscolhaModal>
    </div>
  );
}

import React from 'react';

const Field = React.forwardRef(({ label, error, type = 'text', suggestions, ...props }: any, ref) => {
  const listId = suggestions ? `suggestions-${props.name}` : undefined;
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        ref={ref}
        type={type}
        list={listId}
        {...props}
        className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded px-2 py-1.5 text-sm`}
      />
      {suggestions && <datalist id={listId}>{suggestions.map((item: string) => <option key={item} value={item} />)}</datalist>}
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
});

Field.displayName = 'Field';

// Campo de cadastro: digitação livre (com sugestões) para quem pode criar
// dado novo; lista fechada para os demais.
const CampoReferencia = React.forwardRef(({ label, error, opcoes, livre, placeholder, ...props }: any, ref) => {
  if (livre) return <Field ref={ref} label={label} error={error} placeholder={placeholder} suggestions={opcoes} {...props} />;
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select ref={ref} {...props} className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded px-2 py-1.5 text-sm`}>
        <option value="">Selecione...</option>
        {(opcoes ?? []).map((item: string) => <option key={item} value={item}>{item}</option>)}
      </select>
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
});

CampoReferencia.displayName = 'CampoReferencia';

// Margem da operação, em %: (frete empresa − frete motorista) ÷ frete empresa, ambos em R$/t.
function MargemPrevia({ empresa, motorista }: { empresa: unknown; motorista: unknown }) {
  const e = Number(empresa);
  const m = motorista === '' || motorista == null ? NaN : Number(motorista);
  if (!e || Number.isNaN(m)) return null;
  return (
    <p className="text-[11px] text-gray-500 mt-1">
      Margem: <strong className="text-gray-700">{(((e - m) / e) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</strong>
      <span className="ml-1">= ({e.toLocaleString('pt-BR')} − {m.toLocaleString('pt-BR')}) ÷ {e.toLocaleString('pt-BR')}</span>
    </p>
  );
}
