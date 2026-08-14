import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LiberacaoFormData>({
    resolver: zodResolver(liberacaoSchema) as any,
    defaultValues: {
      tipoFardo: 'FARDAO',
    }
  });

  const { data: editData } = useQuery({
    queryKey: ['liberacao', id],
    queryFn: () => api.get(`/liberacoes/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  const { data: referencias } = useQuery({
    queryKey: ['liberacoes-referencias'],
    queryFn: () => api.get('/liberacoes/referencias/lista').then((r) => r.data),
  });


  useEffect(() => {
    if (editData) {
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
  }, [editData, reset]);

  const mutation = useMutation({
    mutationFn: (data: LiberacaoFormData) => isEdit ? api.put(`/liberacoes/${id}`, data) : api.post('/liberacoes', data),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Liberação atualizada' : 'Liberação criada');
      qc.invalidateQueries({ queryKey: ['liberacoes'] });
      navigate(`/liberacoes/${res.data.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Erro ao salvar'),
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };


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
            <Field label="Cliente*" {...register('clienteNome')} error={errors.clienteNome?.message} placeholder="Digite o cliente" suggestions={referencias?.clientes} />
            <Field label="Filial Embarcadora*" {...register('filialNome')} error={errors.filialNome?.message} placeholder="Digite a filial" suggestions={referencias?.filiais} />
            <Field label="Destino*" {...register('destinoNome')} error={errors.destinoNome?.message} placeholder="Digite o destino" suggestions={referencias?.destinos} />
            <Field label="Origem*" {...register('origemNome')} error={errors.origemNome?.message} placeholder="Digite a origem" suggestions={referencias?.origens} />
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
            <Field label="Frete Empresa (R$/fardo)*" type="number" {...register('freteEmpresa')} error={errors.freteEmpresa?.message} />
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
            className="px-5 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Liberação'}
          </button>
        </div>
      </form>
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
