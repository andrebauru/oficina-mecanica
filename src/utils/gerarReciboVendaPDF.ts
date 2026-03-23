import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { formatarDataBR, formatarMoeda } from './vendas';

export interface DadosReciboVendaPDF {
  logoUrl?: string;
  nomeEmpresa?: string;
  enderecoEmpresa?: string;
  telefoneEmpresa?: string;
  numeroAutorizacao?: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  numeroVenda: string;
  dataVenda: string;
  descricaoVeiculo: string;
  placa?: string;
  chassi?: string;
  tipoVenda: 'vista' | 'parcelado';
  valorTotal: number;
  valorPago: number;
  observacoes?: string;
}

function formatarData(data: string): string {
  const iso = data.includes('T') ? data.split('T')[0] : data;
  return formatarDataBR(iso);
}

function getHtml(dados: DadosReciboVendaPDF): string {
  const saldoRestante = Math.max(0, dados.valorTotal - dados.valorPago);

  return `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a; width: 190mm; padding: 10mm 8mm; background: white;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #0d47a1; padding-bottom: 12px; margin-bottom: 16px; gap: 16px;">
        <div style="display:flex; gap: 14px; align-items:flex-start;">
          ${dados.logoUrl ? `<img src="${dados.logoUrl}" alt="Logo" style="width: 90px; max-height: 90px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 22px; font-weight: 800; color: #0d47a1;">${dados.nomeEmpresa || 'Oficina Mecânica'}</div>
            <div style="margin-top: 6px; font-size: 12px; line-height: 1.5; color: #444;">
              <div>${dados.enderecoEmpresa || 'Endereço não informado'}</div>
              <div>${dados.telefoneEmpresa || 'Telefone não informado'}</div>
              <div>${dados.numeroAutorizacao ? `Autorização: ${dados.numeroAutorizacao}` : ''}</div>
            </div>
          </div>
        </div>
        <div style="text-align:right; min-width: 160px;">
          <div style="font-size: 20px; font-weight: 800; color: #0d47a1;">RECIBO DE VENDA</div>
          <div style="margin-top: 8px; font-size: 12px; color: #555;">Venda Nº ${dados.numeroVenda}</div>
          <div style="font-size: 12px; color: #555;">Emitido em ${formatarData(dados.dataVenda)}</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
        <div style="border: 1px solid #d9e2f2; border-radius: 8px; padding: 12px; background: #f8fbff;">
          <div style="font-size: 13px; font-weight: 700; color: #0d47a1; margin-bottom: 8px;">Dados da empresa</div>
          <div style="font-size: 12px; line-height: 1.7;">
            <div><strong>Nome:</strong> ${dados.nomeEmpresa || 'Não informado'}</div>
            <div><strong>Telefone:</strong> ${dados.telefoneEmpresa || 'Não informado'}</div>
            <div><strong>Endereço:</strong> ${dados.enderecoEmpresa || 'Não informado'}</div>
          </div>
        </div>
        <div style="border: 1px solid #d9e2f2; border-radius: 8px; padding: 12px; background: #f8fbff;">
          <div style="font-size: 13px; font-weight: 700; color: #0d47a1; margin-bottom: 8px;">Dados do cliente</div>
          <div style="font-size: 12px; line-height: 1.7;">
            <div><strong>Nome:</strong> ${dados.clienteNome || 'Não informado'}</div>
            <div><strong>Telefone:</strong> ${dados.clienteTelefone || 'Não informado'}</div>
            <div><strong>Endereço:</strong> ${dados.clienteEndereco || 'Não informado'}</div>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 700; color: #0d47a1; margin-bottom: 8px;">Dados da venda</div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px 14px; font-size: 12px; line-height: 1.7;">
          <div><strong>Veículo:</strong> ${dados.descricaoVeiculo}</div>
          <div><strong>Tipo de venda:</strong> ${dados.tipoVenda === 'vista' ? 'À vista' : 'Parcelada'}</div>
          <div><strong>Placa:</strong> ${dados.placa || 'Não informada'}</div>
          <div><strong>Chassi:</strong> ${dados.chassi || 'Não informado'}</div>
          <div><strong>Valor total:</strong> ${formatarMoeda(dados.valorTotal)}</div>
          <div><strong>Valor pago:</strong> ${formatarMoeda(dados.valorPago)}</div>
          <div><strong>Saldo restante:</strong> ${formatarMoeda(saldoRestante)}</div>
          <div><strong>Data do pagamento:</strong> ${formatarData(dados.dataVenda)}</div>
        </div>
      </div>

      <div style="border-left: 4px solid #2e7d32; background: #f5fff7; padding: 12px 14px; border-radius: 6px; margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 700; color: #2e7d32; margin-bottom: 6px;">Declaração de recebimento</div>
        <div style="font-size: 12px; line-height: 1.8; color: #333;">
          Declaramos para os devidos fins que recebemos de <strong>${dados.clienteNome}</strong> o valor de
          <strong> ${formatarMoeda(dados.valorPago)}</strong>, referente à venda do veículo descrito acima.
        </div>
      </div>

      ${dados.observacoes ? `
        <div style="border: 1px dashed #b0bec5; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 13px; font-weight: 700; color: #455a64; margin-bottom: 6px;">Observações</div>
          <div style="font-size: 12px; line-height: 1.7; white-space: pre-wrap;">${dados.observacoes}</div>
        </div>
      ` : ''}

      <div style="margin-top: 22px;">
        <div style="font-size: 12px; font-weight: 700; color: #0d47a1; margin-bottom: 10px;">Espaço para carimbo / calibração</div>
        <div style="height: 90px; border: 2px dashed #b0bec5; border-radius: 10px; margin-bottom: 26px;"></div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 30px;">
        <div style="text-align:center;">
          <div style="border-top: 1px solid #444; padding-top: 8px; font-size: 12px;">Assinatura da empresa</div>
        </div>
        <div style="text-align:center;">
          <div style="border-top: 1px solid #444; padding-top: 8px; font-size: 12px;">Assinatura do cliente</div>
        </div>
      </div>
    </div>
  `;
}

export async function gerarReciboVendaPDF(dados: DadosReciboVendaPDF): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.innerHTML = getHtml(dados);
  document.body.appendChild(container);

  try {
    const blob: Blob = await (html2pdf as any)()
      .set({
        margin: [6, 6, 6, 6],
        filename: 'recibo-venda.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container.firstElementChild as HTMLElement)
      .toPdf()
      .output('blob');

    return blob;
  } finally {
    document.body.removeChild(container);
  }
}

export async function gerarReciboVendaImagem(dados: DadosReciboVendaPDF): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.innerHTML = getHtml(dados);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    document.body.removeChild(container);
  }
}

export function baixarReciboVendaPDF(blob: Blob, numeroVenda: string, clienteNome: string): string {
  const data = new Date().toISOString().split('T')[0];
  const nomeLimpo = clienteNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'cliente';

  const fileName = `recibo_venda_${numeroVenda}_${nomeLimpo}_${data}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return fileName;
}