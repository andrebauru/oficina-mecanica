/**
 * Funções utilitárias para cálculos de vendas e parcelamento
 * TypeScript | Oficina Mecânica
 */

import { 
  ParcelaCalculada, 
  ResultadoParcelamento,
  StatusParcela,
  DadosParcelaSingular,
  ResumoRecebivel,
  Parcela
} from '../types/vendas';

const JUROS_PADRAO = 14.6;

/**
 * Calcula o parcelamento de uma venda
 * @param valorTotal - Valor total da venda
 * @param numeroParcelas - Número de parcelas desejadas
 * @param jurosPercentual - Percentual de juros (padrão: 14.6%)
 * @param dataPrimeiraVencimento - Data da primeira parcela (padrão: 30 dias)
 * @returns Objeto com parcelas calculadas e detalhes dos juros
 */
export function calcularParcelamento(
  valorTotal: number,
  numeroParcelas: number,
  jurosPercentual: number = JUROS_PADRAO,
  dataPrimeiraVencimento?: string
): ResultadoParcelamento {
  if (numeroParcelas <= 0) {
    throw new Error('Número de parcelas deve ser maior que zero');
  }

  if (valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  // Calcular valor de juros
  const valorJuros = (valorTotal * jurosPercentual) / 100;
  const valorTotalComJuros = valorTotal + valorJuros;

  // Dividir o valor total com juros pelas parcelas
  const valorParcela = valorTotalComJuros / numeroParcelas;

  // Calcular data de primeira vencimento (padrão: 30 dias a partir de hoje)
  const dataPrimeira = dataPrimeiraVencimento 
    ? new Date(dataPrimeiraVencimento)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const parcelas: ParcelaCalculada[] = [];

  for (let i = 1; i <= numeroParcelas; i++) {
    const dataVencimento = new Date(dataPrimeira);
    dataVencimento.setMonth(dataVencimento.getMonth() + (i - 1));

    // Formatar data como YYYY-MM-DD
    const dataFormatada = dataVencimento.toISOString().split('T')[0];

    // Última parcela recebe o resto para evitar erros de arredondamento
    const valor = i === numeroParcelas 
      ? valorTotalComJuros - (valorParcela * (numeroParcelas - 1))
      : valorParcela;

    parcelas.push({
      numero: i,
      valor: Math.round(valor * 100) / 100, // Arredondar para 2 casas decimais
      dataVencimento: dataFormatada,
      status: 'pendente' as StatusParcela
    });
  }

  return {
    parcelas,
    valorTotalComJuros: Math.round(valorTotalComJuros * 100) / 100,
    valorJuros: Math.round(valorJuros * 100) / 100,
    jurosPercentual
  };
}

/**
 * Calcula venda à vista (sem juros)
 * @param valorTotal - Valor total da venda
 * @param dataPagamento - Data do pagamento
 * @returns Array com uma única parcela quitada
 */
export function calcularVendaVista(
  valorTotal: number,
  dataPagamento: string = new Date().toISOString().split('T')[0]
): ParcelaCalculada[] {
  if (valorTotal <= 0) {
    throw new Error('Valor total deve ser maior que zero');
  }

  return [{
    numero: 1,
    valor: valorTotal,
    dataVencimento: dataPagamento,
    status: 'pago' as StatusParcela
  }];
}

/**
 * Verifica se uma parcela está atrasada
 * @param dataVencimento - Data de vencimento (YYYY-MM-DD)
 * @param dataComparacao - Data para comparação (padrão: hoje)
 * @returns true se atrasada, false caso contrário
 */
export function estaAtrasada(
  dataVencimento: string,
  dataComparacao: Date = new Date()
): boolean {
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  
  const comparacao = new Date(dataComparacao);
  comparacao.setHours(0, 0, 0, 0);

  return vencimento < comparacao;
}

/**
 * Calcula dias de atraso
 * @param dataVencimento - Data de vencimento (YYYY-MM-DD)
 * @param dataComparacao - Data para comparação (padrão: hoje)
 * @returns Número de dias em atraso (0 se não está atrasado)
 */
export function calcularDiasAtraso(
  dataVencimento: string,
  dataComparacao: Date = new Date()
): number {
  const vencimento = new Date(dataVencimento);
  const comparacao = new Date(dataComparacao);

  const diferenca = comparacao.getTime() - vencimento.getTime();
  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

  return dias > 0 ? dias : 0;
}

/**
 * Atualiza status de uma parcela baseado na data de vencimento
 * @param parcela - Parcela a atualizar
 * @returns Parcela com status atualizado
 */
export function atualizarStatusParcela(parcela: Parcela): StatusParcela {
  // Se já foi pago, manter status de pago
  if (parcela.status === 'pago') {
    return 'pago';
  }

  // Se foi devolvido, manter status de devolvido
  if (parcela.status === 'devolvido') {
    return 'devolvido';
  }

  // Verificar se está atrasada
  if (estaAtrasada(parcela.dataVencimento)) {
    return 'atrasado';
  }

  // Caso contrário, está pendente
  return 'pendente';
}

/**
 * Formata número como moeda BRL
 * @param valor - Valor a formatar
 * @returns String formatada como moeda
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Formata data de ISO para padrão brasileiro
 * @param dataISO - Data em formato ISO (YYYY-MM-DD)
 * @returns String no formato DD/MM/YYYY
 */
export function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Calcula resumo geral de recebíveis
 * @param parcelas - Array de parcelas
 * @returns Objeto com resumo dos valores
 */
export function calcularResumoRecebivel(parcelas: Parcela[]): ResumoRecebivel {
  const resumo: ResumoRecebivel = {
    totalPendente: 0,
    totalAtrasado: 0,
    totalPago: 0,
    quantidadeParcelas: parcelas.length,
    quantidadePorStatus: {
      pendente: 0,
      pago: 0,
      atrasado: 0,
      devolvido: 0
    }
  };

  parcelas.forEach(parcela => {
    const status = atualizarStatusParcela(parcela);
    resumo.quantidadePorStatus[status]++;

    switch (status) {
      case 'pendente':
        resumo.totalPendente += parcela.valor;
        break;
      case 'atrasado':
        resumo.totalAtrasado += parcela.valor;
        break;
      case 'pago':
        resumo.totalPago += parcela.valor;
        break;
    }
  });

  return resumo;
}

/**
 * Filtra parcelas por status
 * @param parcelas - Array de parcelas
 * @param status - Status desejado
 * @returns Array filtrado
 */
export function filtrarPorStatus(
  parcelas: Parcela[],
  status: StatusParcela
): Parcela[] {
  return parcelas.filter(p => atualizarStatusParcela(p) === status);
}

/**
 * Ordena parcelas por data de vencimento
 * @param parcelas - Array de parcelas
 * @param ordem - 'asc' para crescente, 'desc' para decrescente
 * @returns Array ordenado
 */
export function ordenarPorDataVencimento(
  parcelas: Parcela[],
  ordem: 'asc' | 'desc' = 'asc'
): Parcela[] {
  const copia = [...parcelas];
  return copia.sort((a, b) => {
    const dataA = new Date(a.dataVencimento).getTime();
    const dataB = new Date(b.dataVencimento).getTime();
    return ordem === 'asc' ? dataA - dataB : dataB - dataA;
  });
}

/**
 * Gera link do WhatsApp com mensagem pré-preenchida
 * @param telefone - Telefone no formato (XX) XXXXX-XXXX
 * @param parcela - Dados da parcela para mensagem
 * @returns URL do WhatsApp
 */
export function gerarLinkWhatsApp(
  telefone: string,
  parcela: DadosParcelaSingular
): string {
  // Remove caracteres especiais do telefone
  const telefoneLimpo = telefone.replace(/\D/g, '');
  const telefoneComCodigo = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`;

  const mensagem = `Olá ${parcela.clienteNome}, gostaria de confirmar o pagamento da parcela #${parcela.numero} no valor de R$ ${(parcela.valor).toFixed(2).replace('.', ',')} com vencimento em ${formatarDataBR(parcela.dataVencimento)}.`;

  const mensagemCodificada = encodeURIComponent(mensagem);
  return `https://wa.me/${telefoneComCodigo}?text=${mensagemCodificada}`;
}

/**
 * Converte array de parcelas para CSV
 * @param parcelas - Array de parcelas
 * @returns String em formato CSV
 */
export function exportarParcelasCSV(parcelas: Parcela[]): string {
  const headers = 'ID,Número,Valor,Data Vencimento,Status,Cliente,Telefone\n';
  
  const linhas = parcelas.map(p => {
    const status = atualizarStatusParcela(p);
    return `${p.id},${p.numeroParcela},${p.valor.toFixed(2)},${p.dataVencimento},${status},${p.clienteNome},${p.clienteTelefone}`;
  }).join('\n');

  return headers + linhas;
}
