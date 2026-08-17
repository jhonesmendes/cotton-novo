import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/services/api';
import toast from 'react-hot-toast';

const liberacaoSchema = z.object({
  instrucao: z.string().min(1, 'Instrução é obrigatória'),
  dataLiberacao: z.string().min(1, 'Data da liberação é obrigatória'),
  dataColeta: z.string().min(1, 'Data de coleta é obrigatória'),
  clienteId: z.coerce.number().min(1, 'Selecione um cliente'),
  origemId: z.coerce.number().min(1, 'Selecione uma filial'),
  destinoId: z.coerce.number().min(1, 'Selecione um destino'),
  terminalId: z.coerce.number().min(1, 'Selecione uma origem'),
  localColetaId: z.coerce.number().min(1, 'Selecione um local de coleta'),
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

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<LiberacaoFormData>({
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

  const extractArray = (r: any) => {
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.data?.data)) return r.data.data;
    return [];
  };

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/clientes').then(extractArray),
  });
  const { data: origens = [] } = useQuery({
    queryKey: ['origens'],
    queryFn: () => api.get('/origens').then(extractArray),
  });
  const { data: terminais = [] } = useQuery({
    queryKey: ['terminais'],
    queryFn: () => api.get('/terminais').then(extractArray),
  });
  const { data: destinos = [] } = useQuery({
    queryKey: ['destinos'],
    queryFn: () => api.get('/destinos').then(extractArray),
  });
  const { data: locaisColeta = [] } = useQuery({
    queryKey: ['locaisColeta'],
    queryFn: () => api.get('/locais-coleta').then(extractArray),
  });

  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeOrigens = Array.isArray(origens) ? origens : [];
  const safeTerminais = Array.isArray(terminais) ? terminais : [];
  const safeDestinos = Array.isArray(destinos) ? destinos : [];
  const safeLocaisColeta = Array.isArray(locaisColeta) ? locaisColeta : [];

  useEffect(() => {
    if (editData) {
      reset({
        ...editData,
        dataLiberacao: editData.dataLiberacao?.slice(0, 10),
        dataColeta: editData.dataColeta?.slice(0, 10),
        deadline: editData.deadline?.slice(0, 10),
        clienteId: Number(editData.clienteId),
        origemId: Number(editData.origemId),
        terminalId: Number(editData.terminalId),
        destinoId: Number(editData.destinoId),
        localColetaId: Number(editData.localColetaId),
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
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente*</label>
              <Controller
                name="clienteId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={safeClientes.map((c: any) => ({ value: c.id, label: c.nome }))}
                    value={safeClientes.map((c: any) => ({ value: c.id, label: c.nome })).find((o: any) => o.value === field.value) || null}
                    onChange={(val: any) => field.onChange(val?.value)}
                    placeholder="Selecionar ou digitar..."
                    noOptionsMessage={() => "Nenhum encontrado"}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.clienteId ? '#ef4444' : '#e5e7eb',
                        minHeight: '34px',
                      })
                    }}
                  />
                )}
              />
              {errors.clienteId && <p className="text-[10px] text-red-500 mt-0.5">{errors.clienteId.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Filial Embarcadora*</label>
              <Controller
                name="origemId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={safeOrigens.map((o: any) => ({ value: o.id, label: o.nome }))}
                    value={safeOrigens.map((o: any) => ({ value: o.id, label: o.nome })).find((o: any) => o.value === field.value) || null}
                    onChange={(val: any) => field.onChange(val?.value)}
                    placeholder="Selecionar ou digitar..."
                    noOptionsMessage={() => "Nenhum encontrado"}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.origemId ? '#ef4444' : '#e5e7eb',
                        minHeight: '34px',
                      })
                    }}
                  />
                )}
              />
              {errors.origemId && <p className="text-[10px] text-red-500 mt-0.5">{errors.origemId.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Destino*</label>
              <Controller
                name="destinoId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={safeDestinos.map((d: any) => ({ value: d.id, label: d.nome }))}
                    value={safeDestinos.map((d: any) => ({ value: d.id, label: d.nome })).find((o: any) => o.value === field.value) || null}
                    onChange={(val: any) => field.onChange(val?.value)}
                    placeholder="Selecionar ou digitar..."
                    noOptionsMessage={() => "Nenhum encontrado"}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.destinoId ? '#ef4444' : '#e5e7eb',
                        minHeight: '34px',
                      })
                    }}
                  />
                )}
              />
              {errors.destinoId && <p className="text-[10px] text-red-500 mt-0.5">{errors.destinoId.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Origem*</label>
              <Controller
                name="terminalId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={safeTerminais.map((t: any) => ({ value: t.id, label: t.nome }))}
                    value={safeTerminais.map((t: any) => ({ value: t.id, label: t.nome })).find((o: any) => o.value === field.value) || null}
                    onChange={(val: any) => field.onChange(val?.value)}
                    placeholder="Selecionar ou digitar..."
                    noOptionsMessage={() => "Nenhum encontrado"}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.terminalId ? '#ef4444' : '#e5e7eb',
                        minHeight: '34px',
                      })
                    }}
                  />
                )}
              />
              {errors.terminalId && <p className="text-[10px] text-red-500 mt-0.5">{errors.terminalId.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Local de Coleta*</label>
              <Controller
                name="localColetaId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={safeLocaisColeta.map((l: any) => ({ value: l.id, label: l.nome }))}
                    value={safeLocaisColeta.map((l: any) => ({ value: l.id, label: l.nome })).find((o: any) => o.value === field.value) || null}
                    onChange={(val: any) => field.onChange(val?.value)}
                    placeholder="Selecionar ou digitar..."
                    noOptionsMessage={() => "Nenhum encontrado"}
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: errors.localColetaId ? '#ef4444' : '#e5e7eb',
                        minHeight: '34px',
                      })
                    }}
                  />
                )}
              />
              {errors.localColetaId && <p className="text-[10px] text-red-500 mt-0.5">{errors.localColetaId.message}</p>}
            </div>
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

const Field = React.forwardRef(({ label, error, type = 'text', ...props }: any, ref) => {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        ref={ref}
        type={type}
        {...props}
        className={`w-full border ${error ? 'border-red-500' : 'border-gray-200'} rounded px-2 py-1.5 text-sm`}
      />
      {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
});

Field.displayName = 'Field';

