/**
 * Gerador de Contrato de Venda Bilíngue (Português + Inglês)
 * Utiliza jsPDF para criar PDF com template jurídico
 * TypeScript | Oficina Mecânica
 */

import jsPDF from 'jspdf';
import { DadosContrato } from '../types/vendas';
import { formatarMoeda, formatarDataBR } from './vendas';

interface ConteudoContrato {
  titulo: string;
  dataDocumento: string;
  nomeComprador: string;
  modeloCarro: string;
  placa: string;
  chassi: string;
  valorVenda: string;
  juros: string;
  parcelas: string;
  foroPagamento: string;
  clausulas: Array<{ titulo: string; conteudo: string }>;
  assinatura: string;
  data: string;
}

// Conteúdo Português
const conteudoPT: ConteudoContrato = {
  titulo: 'CONTRATO DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR',
  dataDocumento: 'Data do Documento:',
  nomeComprador: 'Nome do Comprador:',
  modeloCarro: 'Modelo do Veículo:',
  placa: 'Placa:',
  chassi: 'Chassis:',
  valorVenda: 'Valor da Venda:',
  juros: 'Juros (14.6%):',
  parcelas: 'Parcelas:',
  foroPagamento: 'Fórum de Pagamento:',
  clausulas: [
    {
      titulo: 'Cláusula 1 - Das Partes',
      conteudo: 'As partes contratantes acordam em cumprir os termos e condições deste contrato, conforme estabelecido pelo Código Civil (Lei nº 10.406/2002) e regulamentações aplicáveis.'
    },
    {
      titulo: 'Cláusula 2 - Do Objeto',
      conteudo: 'O presente contrato tem como objeto a compra e venda de veículo automotor, sendo o vendedor responsável pela transferência de propriedade ao comprador mediante o cumprimento das obrigações estabelecidas.'
    },
    {
      titulo: 'Cláusula 3 - Do Preço e Forma de Pagamento',
      conteudo: 'O preço total da transação inclui 14.6% de juros ao ano, sendo o pagamento realizado em parcelas mensais, conforme tabela anexada, com vencimento no 15º de cada mês.'
    },
    {
      titulo: 'Cláusula 4 - Transferência de Propriedade',
      conteudo: 'A transferência de propriedade do veículo será efetivada mediante apresentação de documentação apropriada e registro junto aos órgãos competentes, conforme legislação de trânsito vigente.'
    },
    {
      titulo: 'Cláusula 5 - Responsabilidades do Comprador',
      conteudo: 'O comprador assume total responsabilidade pelo veículo após a assinatura deste contrato, incluindo seguro, impostos e manutenção. O não pagamento das parcelas acarretará em juros de mora e possível retomada do veículo.'
    },
    {
      titulo: 'Cláusula 6 - Disposições Penais',
      conteudo: 'Qualquer violação dos termos deste contrato, incluindo fraude ou falsificação de documentos, sujeitará o infrator às sanções previstas no Código Penal (Decreto-lei nº 2.848/1940).'
    },
    {
      titulo: 'Cláusula 7 - Jurisdição e Foro',
      conteudo: 'As partes elegem o foro de Tsu como competente para dirimir quaisquer questões emergentes deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.'
    },
    {
      titulo: 'Cláusula 8 - Disposições Gerais',
      conteudo: 'Este contrato constitui o acordo integral entre as partes e substitui todos os acordos anteriores. Qualquer modificação deve ser feita por escrito e assinada por ambas as partes.'
    }
  ],
  assinatura: 'Assinatura do Comprador:',
  data: 'Data:'
};

// Conteúdo Inglês
const conteudoEN: ConteudoContrato = {
  titulo: 'VEHICLE PURCHASE AND SALE AGREEMENT',
  dataDocumento: 'Document Date:',
  nomeComprador: 'Buyer Name:',
  modeloCarro: 'Vehicle Model:',
  placa: 'License Plate:',
  chassi: 'VIN Number:',
  valorVenda: 'Sale Price:',
  juros: 'Interest (14.6%):',
  parcelas: 'Installments:',
  foroPagamento: 'Payment Forum:',
  clausulas: [
    {
      titulo: 'Clause 1 - The Parties',
      conteudo: 'The contracting parties agree to comply with the terms and conditions of this contract, as established by the Civil Code and applicable regulations.'
    },
    {
      titulo: 'Clause 2 - The Object',
      conteudo: 'This contract concerns the purchase and sale of a motor vehicle, with the seller responsible for transferring ownership to the buyer upon fulfillment of the established obligations.'
    },
    {
      titulo: 'Clause 3 - Price and Payment Method',
      conteudo: 'The total transaction price includes 14.6% annual interest, payable in monthly installments according to the attached schedule, due on the 15th of each month.'
    },
    {
      titulo: 'Clause 4 - Transfer of Ownership',
      conteudo: 'Transfer of vehicle ownership shall be effected through presentation of appropriate documentation and registration with competent authorities, in accordance with current traffic legislation.'
    },
    {
      titulo: 'Clause 5 - Buyer Responsibilities',
      conteudo: 'The buyer assumes full responsibility for the vehicle after signing this contract, including insurance, taxes, and maintenance. Failure to pay installments will result in interest penalties and possible vehicle repossession.'
    },
    {
      titulo: 'Clause 6 - Criminal Provisions',
      conteudo: 'Any violation of the terms of this contract, including fraud or document falsification, shall subject the offender to penalties provided by the Penal Code.'
    },
    {
      titulo: 'Clause 7 - Jurisdiction and Forum',
      conteudo: 'The parties elect Tsu forum as competent to settle any questions arising from this contract, renouncing any other, however privileged it may be.'
    },
    {
      titulo: 'Clause 8 - General Provisions',
      conteudo: 'This contract constitutes the entire agreement between the parties and supersedes all previous agreements. Any modification must be made in writing and signed by both parties.'
    }
  ],
  assinatura: 'Buyer Signature:',
  data: 'Date:'
};

/**
 * Gera PDF de contrato bilíngue
 */
export function gerarContratoPDF(
  dados: DadosContrato,
  idioma: 'pt' | 'en' = 'pt'
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const conteudo = idioma === 'pt' ? conteudoPT : conteudoEN;
  
  let yPos = 15;
  const marginLeft = 15;
  const marginRight = 195;
  const pageHeight = doc.internal.pageSize.getHeight();

  // ========== CABEÇALHO ==========
  doc.setFontSize(16);
  doc.setFont('arial', 'bold');
  const linhasTitulo = doc.splitTextToSize(conteudo.titulo, marginRight - marginLeft);
  doc.text(linhasTitulo as any, marginLeft, yPos);
  yPos += 15;

  // ========== DADOS GERAIS ==========
  doc.setFontSize(10);
  doc.setFont('arial', 'normal');

  const dadosGerais = [
    `${conteudo.dataDocumento} ${formatarDataBR(dados.dataVenda)}`,
    `${conteudo.nomeComprador} ${dados.nomeComprador}`,
    `${conteudo.modeloCarro} ${dados.numeroVenda}`,
    `${conteudo.placa} ${dados.placa}`,
    `${conteudo.chassi} ${dados.chassi}`,
    `${conteudo.valorVenda} ${formatarMoeda(dados.valor)}`,
    `${conteudo.juros} ${dados.jurosPercentual}%`,
    `${conteudo.foroPagamento} ${dados.foroPagamento}`
  ];

  dadosGerais.forEach(linha => {
    doc.text(linha as any, marginLeft, yPos);
    yPos += 7;
  });

  yPos += 5;

  // ========== TABELA DE PARCELAS ==========
  doc.setFont('arial', 'bold');
  doc.setFontSize(10);
  doc.text(conteudo.parcelas as any, marginLeft, yPos);
  yPos += 7;

  doc.setFont('arial', 'normal');
  doc.setFontSize(8);

  const colunasX = [marginLeft, marginLeft + 40, marginLeft + 80, marginLeft + 120];

  // Headers
  doc.setFont('arial', 'bold');
  doc.text('Parcela' as any, colunasX[0], yPos);
  doc.text('Valor' as any, colunasX[1], yPos);
  doc.text('Vencimento' as any, colunasX[2], yPos);
  yPos += 5;

  // Linhas de parcelas
  doc.setFont('arial', 'normal');
  dados.parcelas.forEach(parcela => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 15;
    }

    doc.text(`${parcela.numero}` as any, colunasX[0], yPos);
    doc.text(formatarMoeda(parcela.valor) as any, colunasX[1], yPos);
    doc.text(formatarDataBR(parcela.dataVencimento) as any, colunasX[2], yPos);
    yPos += 5;
  });

  yPos += 10;

  // ========== CLÁUSULAS ==========
  doc.setFont('arial', 'bold');
  doc.setFontSize(10);
  
  conteudo.clausulas.forEach(clausula => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 15;
    }

    doc.text(clausula.titulo as any, marginLeft, yPos);
    yPos += 6;

    doc.setFont('arial', 'normal');
    doc.setFontSize(8);
    const linhasClausula = doc.splitTextToSize(
      clausula.conteudo,
      marginRight - marginLeft
    );
    doc.text(linhasClausula as any, marginLeft, yPos);
    yPos += (linhasClausula.length * 5) + 3;

    doc.setFont('arial', 'bold');
    doc.setFontSize(10);
  });

  // ========== ASSINATURA ==========
  yPos += 10;
  if (yPos > pageHeight - 20) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFont('arial', 'normal');
  doc.setFontSize(10);
  doc.text(conteudo.assinatura as any, marginLeft, yPos);
  yPos += 15;
  doc.line(marginLeft, yPos, marginLeft + 50, yPos);
  yPos += 5;
  doc.text(conteudo.data as any, marginLeft, yPos);

  // Converter para Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}

/**
 * Baixa o PDF do contrato
 */
export function baixarPDF(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera nome de arquivo para contrato
 */
export function gerarNomeArquivoContrato(
  nomeCliente: string,
  numeroVenda: string
): string {
  const nomeLimpo = nomeCliente.toLowerCase().replace(/\s+/g, '_');
  const data = new Date().toISOString().split('T')[0];
  return `contrato_${numeroVenda}_${nomeLimpo}_${data}.pdf`;
}

/**
 * Converte Blob para Base64
 */
export async function converterParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
