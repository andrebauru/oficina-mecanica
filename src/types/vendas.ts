/**
 * Tipos e interfaces para gestão de vendas e contratos
 * TypeScript | Oficina Mecânica
 */

// ========== TIPOS BÁSICOS ==========

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  idioma?: 'pt' | 'fil';
}

export interface Veiculo {
  id: string;
  clienteId: string;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
  chassi?: string;
  kilometragem?: number;
}

// ========== VENDAS ==========

export type TipoVenda = 'vista' | 'parcelado';
export type StatusVenda = 'ativo' | 'quitado' | 'devolvido' | 'cancelado';

export interface Venda {
  id: string;
  clienteId: string;
  veiculoId: string;
  dataVenda: string; // ISO date
  valorTotal: number;
  tipoVenda: TipoVenda;
  numeroParcelas: number;
  juros: number; // percentual
  statusVenda: StatusVenda;
  foroPagamento: string; // ex: 'Tsu'
  nomeContrato?: string; // nome do arquivo PDF
  placa: string;
  chassi: string;
  dataQuitar?: string; // data de quitação (apenas para 'quitado')
  reciboPDF?: string; // nome do arquivo de recibo
}

// ========== PARCELAS ==========

export type StatusParcela = 'pendente' | 'pago' | 'atrasado' | 'devolvido';

export interface Parcela {
  id: string;
  vendaId: string;
  numeroParcela: number;
  valor: number;
  dataVencimento: string; // ISO date (YYYY-MM-DD)
  status: StatusParcela;
  dataPagamento?: string; // ISO date
  clienteNome: string;
  clienteTelefone: string;
}

// ========== CÁLCULOS ==========

export interface ParcelaCalculada {
  numero: number;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status: StatusParcela;
}

export interface ResultadoParcelamento {
  parcelas: ParcelaCalculada[];
  valorTotalComJuros: number;
  valorJuros: number;
  jurosPercentual: number;
}

// ========== CONTRATO ==========

export interface DadosContrato {
  nomeComprador: string;
  chassi: string;
  placa: string;
  valor: number;
  jurosPercentual: number;
  parcelas: ParcelaCalculada[];
  foroPagamento: string;
  dataVenda: string;
  numeroVenda: string;
}

export interface DadosContratoBilingue extends DadosContrato {
  idioma: 'pt' | 'fil';
}

// ========== FILTROS E BUSCA ==========

export interface FiltroRecebivel {
  status?: StatusParcela;
  clienteId?: string;
  dataInicio?: string;
  dataFim?: string;
  ordenarPor?: 'data' | 'valor' | 'cliente';
  ordem?: 'asc' | 'desc';
}

export interface ReciboVenda {
  id: string;
  vendaId: string;
  dataEmissao: string;
  clienteNome: string;
  valor: number;
  tipoVenda: TipoVenda;
  nomeArquivo: string;
  urlDownload?: string;
}

// ========== RESUMOS E RELATÓRIOS ==========

export interface ResumoRecebivel {
  totalPendente: number;
  totalAtrasado: number;
  totalPago: number;
  quantidadeParcelas: number;
  quantidadePorStatus: Record<StatusParcela, number>;
}

export interface DadosParcelaSingular {
  id: string;
  numero: number;
  valor: number;
  dataVencimento: string;
  status: StatusParcela;
  diasAtraso?: number;
  clienteNome: string;
  clienteTelefone: string;
  vendaId: string;
}
