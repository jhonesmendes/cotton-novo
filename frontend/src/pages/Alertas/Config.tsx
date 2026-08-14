import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDownIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface AlertaConfig {
  id: number;
  clienteId?: number;
  terminalId?: number;
  tipoAlerta: string;
  diasAntes: number;
  canais?: string;
  destinatarios?: string;
  horarioInicio?: string;
  horarioFim?: string;
  ativo: boolean;
}

export default function AlertasConfigPage() {
  const [novoAlerta, setNovoAlerta] = useState<Partial<AlertaConfig>>({
    diasAntes: 3,
    canais: 'email',
    ativo: true,
  });
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas-config'],
    queryFn: () => api.get('/alertas/config').then((r) => r.data),
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => api.get('/liberacoes/clientes').then((r) => r.data),
  });

  const criarMutation = useMutation({
    mutationFn: (data: Partial<AlertaConfig>) =>
      api.post('/alertas/config', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas-config'] });
      setNovoAlerta({ diasAntes: 3, canais: 'email', ativo: true });
      setShowForm(false);
      toast.success('Alerta configurado com sucesso');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Erro ao criar alerta');
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/alertas/config/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas-config'] });
      toast.success('Alerta removido');
    },
  });

  const tiposAlerta = [
    { value: 'DEADLINE_PROXIMO', label: '⏰ Deadline Próximo' },
    { value: 'CARGA_ATRASADA', label: '⚠️ Carga Atrasada' },
    { value: 'SALDO_PENDENTE', label: '📦 Saldo Pendente' },
    { value: 'STATUS_ALTERADO', label: '🔄 Status Alterado' },
    { value: 'DOCUMENTACAO_PENDENTE', label: '📄 Documentação Pendente' },
    { value: 'AGENDAMENTO_NECESSARIO', label: '📅 Agendamento Necessário' },
  ];

  const canaisDisponiveis = [
    { value: 'email', label: '📧 Email' },
    { value: 'whatsapp', label: '📱 WhatsApp' },
    { value: 'sms', label: '💬 SMS' },
    { value: 'notificacao', label: '🔔 Notificação' },
  ];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração de Alertas</h1>
          <p className="text-gray-500 text-sm mt-1">Defina quando e como você quer ser notificado</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Novo Alerta
        </button>
      </div>

      {/* Formulário de Novo Alerta */}
      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Alerta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Alerta *
              </label>
              <select
                value={novoAlerta.tipoAlerta || ''}
                onChange={(e) =>
                  setNovoAlerta({ ...novoAlerta, tipoAlerta: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Selecione o tipo</option>
                {tiposAlerta.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dias Antes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dias Antes do Deadline
              </label>
              <input
                type="number"
                value={novoAlerta.diasAntes || 3}
                onChange={(e) =>
                  setNovoAlerta({ ...novoAlerta, diasAntes: parseInt(e.target.value) })
                }
                min={0}
                max={30}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Canais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canais de Notificação
              </label>
              <div className="flex flex-wrap gap-2">
                {canaisDisponiveis.map((canal) => (
                  <label
                    key={canal.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={novoAlerta.canais?.includes(canal.value) || false}
                      onChange={(e) => {
                        let canais = novoAlerta.canais?.split(',') || [];
                        if (e.target.checked) {
                          canais.push(canal.value);
                        } else {
                          canais = canais.filter((c) => c !== canal.value);
                        }
                        setNovoAlerta({ ...novoAlerta, canais: canais.join(',') });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{canal.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Horário de Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Início
              </label>
              <input
                type="time"
                value={novoAlerta.horarioInicio || '08:00'}
                onChange={(e) =>
                  setNovoAlerta({ ...novoAlerta, horarioInicio: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Horário de Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horário de Fim
              </label>
              <input
                type="time"
                value={novoAlerta.horarioFim || '18:00'}
                onChange={(e) =>
                  setNovoAlerta({ ...novoAlerta, horarioFim: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Destinatários */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email dos Destinatários (separados por vírgula)
              </label>
              <input
                type="text"
                value={novoAlerta.destinatarios || ''}
                onChange={(e) =>
                  setNovoAlerta({ ...novoAlerta, destinatarios: e.target.value })
                }
                placeholder="exemplo@email.com, outro@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() =>
                criarMutation.mutate(novoAlerta as AlertaConfig)
              }
              disabled={criarMutation.isPending}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {criarMutation.isPending ? 'Salvando...' : 'Salvar Alerta'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Alertas Configurados */}
      <div className="space-y-3">
        {alertas?.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">Nenhum alerta configurado ainda</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-green-600 hover:text-green-700 font-medium"
            >
              Criar primeiro alerta →
            </button>
          </div>
        ) : (
          alertas?.map((alerta: AlertaConfig) => (
            <div
              key={alerta.id}
              className="bg-white rounded-xl border p-4 flex items-start justify-between hover:shadow-md transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {tiposAlerta.find((t) => t.value === alerta.tipoAlerta)?.label}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      alerta.ativo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {alerta.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  📅 {alerta.diasAntes} dias antes • 🕐 {alerta.horarioInicio} - {alerta.horarioFim}
                </p>
                {alerta.canais && (
                  <p className="text-sm text-gray-600 mt-1">
                    Canais: {alerta.canais.split(',').map((c) => canaisDisponiveis.find((x) => x.value === c)?.label).join(', ')}
                  </p>
                )}
                {alerta.destinatarios && (
                  <p className="text-xs text-gray-500 mt-1">Para: {alerta.destinatarios}</p>
                )}
              </div>
              <button
                onClick={() => deletarMutation.mutate(alerta.id)}
                className="text-gray-400 hover:text-red-600 ml-4"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
