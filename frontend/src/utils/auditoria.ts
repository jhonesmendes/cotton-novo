import { formatDate, formatMoney } from '@/utils/format';
import { STATUS_LABELS, SM_LABELS, RASTREAMENTO_LABELS } from '@/utils/status';

export type AcaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RegistroAuditoria {
  id: number;
  usuario: { id: number; nome: string; email?: string; perfil?: string };
  tabelaAfetada: string;
  registroId: number;
  acao: AcaoAuditoria;
  dadosAntigos: Record<string, unknown> | null;
  dadosNovos: Record<string, unknown> | null;
  camposAlterados: string[];
  descricao: string | null;
  liberacaoId: number | null;
  liberacaoInstrucao?: string | null;
  ip: string | null;
  rota: string | null;
  createdAt: string;
}

export const ACAO_LABELS: Record<AcaoAuditoria, { label: string; className: string }> = {
  INSERT: { label: 'Criação', className: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Alteração', className: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Exclusão', className: 'bg-red-100 text-red-700' },
};

export const TABELA_LABELS: Record<string, string> = {
  Veiculo: 'Veículo',
  Liberacao: 'Liberação',
  Usuario: 'Usuário',
  Cliente: 'Cliente',
  Origem: 'Filial embarcadora',
  Destino: 'Destino',
  LocalColeta: 'Local de coleta',
  Terminal: 'Origem (terminal)',
  ModeloCarreta: 'Modelo de carreta',
  ReferenciaCadastro: 'Referência de cadastro',
  Transportadora: 'Transportadora',
  AlertaConfig: 'Configuração de alerta',
};

const CAMPO_LABELS: Record<string, string> = {
  // Veículo
  placa: 'Placa',
  modeloCarretaId: 'Modelo da carreta (ID)',
  freteMotorista: 'Frete motorista',
  qtdFardos: 'Qtd. fardos',
  motoristaNome: 'Motorista',
  motoristaTelefone: 'Telefone do motorista',
  motoristaCpf: 'CPF do motorista',
  motoristaEmail: 'Email do motorista',
  transportadoraId: 'Transportadora (ID)',
  status: 'Status',
  statusSm: 'SM (monitoramento)',
  statusRastreamento: 'Rastreamento',
  numeroIsca: 'Isca',
  dataAgendamento: 'Data de agendamento',
  dataCarregamento: 'Data de carregamento',
  dataDescarga: 'Data de descarga',
  observacao: 'Observação',
  liberacaoId: 'Liberação (ID)',
  // Liberação
  instrucao: 'Instrução',
  dataLiberacao: 'Data de liberação',
  dataColeta: 'Data de coleta',
  clienteNome: 'Cliente',
  filialNome: 'Filial',
  destinoNome: 'Destino',
  origemNome: 'Origem',
  localColetaNome: 'Local de coleta',
  clienteId: 'Cliente (ID)',
  origemId: 'Filial (ID)',
  destinoId: 'Destino (ID)',
  terminalId: 'Origem (ID)',
  localColetaId: 'Local de coleta (ID)',
  freteEmpresa: 'Frete empresa',
  totalFardos: 'Total de fardos',
  tipoFardo: 'Tipo de fardo',
  deadline: 'Deadline',
  carregado: 'Carregado',
  // Usuário / cadastros
  nome: 'Nome',
  email: 'Email',
  senhaHash: 'Senha',
  senha: 'Senha',
  telefone: 'Telefone',
  perfil: 'Perfil',
  filialId: 'Filial (ID)',
  ativo: 'Ativo',
  cnpj: 'CNPJ',
  nomeDescricao: 'Modelo',
  placaVeiculo: 'Placa',
  capacidadeMaximaFardos: 'Capacidade (fardos)',
  pesoMaximoKg: 'Peso máximo (kg)',
  tipo: 'Tipo',
  valor: 'Valor',
};

export const CAMPOS_MONETARIOS = new Set(['freteMotorista', 'freteEmpresa']);

export function labelCampo(campo: string) {
  return CAMPO_LABELS[campo] ?? campo;
}

export function labelTabela(tabela: string) {
  return TABELA_LABELS[tabela] ?? tabela;
}

const ISO_DATA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function formatarValor(campo: string, valor: unknown, ocultarValores = false): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (CAMPOS_MONETARIOS.has(campo)) return ocultarValores ? 'R$ ••••••' : formatMoney(Number(valor));
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor !== 'string') return String(valor);
  if (campo === 'status' && valor in STATUS_LABELS) return STATUS_LABELS[valor as keyof typeof STATUS_LABELS];
  if (campo === 'statusSm' && valor in SM_LABELS) return SM_LABELS[valor as keyof typeof SM_LABELS];
  if (campo === 'statusRastreamento' && valor in RASTREAMENTO_LABELS) {
    return RASTREAMENTO_LABELS[valor as keyof typeof RASTREAMENTO_LABELS];
  }
  if (ISO_DATA.test(valor)) {
    // Datas "só dia" (deadline, coleta...) são gravadas à meia-noite UTC — exibir
    // pelo fuso local mostraria o dia anterior.
    if (valor.includes('T00:00:00')) return formatDate(valor.slice(0, 10));
    return formatDate(valor, 'dd/MM/yyyy HH:mm');
  }
  return valor;
}
