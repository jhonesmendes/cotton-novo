export interface Metricas {
  abertas: number;
  concluidas: number;
  concluidasManual: number;
  fardosEntregues: number;
  fardosPendentesManual: number;
  noPrazo: number;
  percentualNoPrazo: number | null;
  tempoMedioDias: number | null;
  veiculosFinalizados: number;
  fardosVeiculosFinalizados: number;
  toneladas: number;
  faturamento: number;
  custoMotorista: number;
  resultado: number;
  margemMedia: number | null;
  veiculosSemPeso: number;
}

export interface PontoSerie extends Metricas {
  periodo: string;
  rotulo: string;
}

export interface LinhaAgrupada {
  id: number;
  nome: string;
  concluidas: number;
  fardosEntregues: number;
  concluidasManual: number;
  toneladas: number;
  faturamento: number;
  resultado: number;
  ativas: number;
  fardosTotalAtivas: number;
  saldo: number;
}

export interface LiberacaoConcluida {
  id: number;
  instrucao: string;
  cliente: string;
  filial: string;
  destino: string;
  localColeta: string;
  tipoFardo: string;
  dataLiberacao: string;
  deadline: string;
  concluidaEm: string;
  noPrazo: boolean;
  diasAteConcluir: number;
  totalFardos: number;
  carregado: number;
  veiculos: number;
  fechamentoManual: boolean;
  fardosPendentesFechamento: number | null;
  motivoFechamento: string | null;
  fechamentoManualPor: string | null;
  toneladas: number;
  faturamento: number;
  custoMotorista: number;
  resultado: number;
  margem: number | null;
  veiculosSemPeso: number;
  freteEmpresa: number;
  freteMotorista: number | null;
}

export interface Relatorio {
  agrupamento: 'mes' | 'semana';
  periodo: { inicio: string; fim: string };
  periodoAnterior: { inicio: string; fim: string };
  resumo: { atual: Metricas; anterior: Metricas };
  rodando: {
    liberacoes: number;
    fardosTotal: number;
    fardosCarregados: number;
    saldo: number;
    aguardandoFechamento: number;
    vencidas: number;
    veiculosEmAndamento: number;
    toneladasCarregadas: number;
  };
  serie: PontoSerie[];
  porCliente: LinhaAgrupada[];
  porFilial: LinhaAgrupada[];
  lista: LiberacaoConcluida[];
}
