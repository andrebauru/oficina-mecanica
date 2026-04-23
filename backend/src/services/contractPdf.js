const PDFDocument = require('pdfkit');

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
}

function getTemplate(idioma = 'pt') {
  if (idioma === 'ja') {
    return {
      title: '車両売買契約書',
      subtitle: '中古車売買契約',
      sections: [
        '第1条（目的）本契約は、売主が買主に対して下記車両を売却することを定めます。',
        '第2条（価格）買主は、合意された総額を契約条件に従って支払います。',
        '第3条（引渡し）車両の引渡しは、必要書類の確認後に実施されます。',
        '第4条（遅延）支払遅延時は、契約上の措置を適用します。',
      ],
      buyer: '買主',
      seller: '売主',
      vehicle: '車両情報',
      payment: '支払条件',
      generatedAt: '作成日時',
      signatures: '署名',
    };
  }

  return {
    title: 'CONTRATO DE COMPRA E VENDA DE VEÍCULO',
    subtitle: 'Instrumento particular de compra e venda',
    sections: [
      'Cláusula 1ª - Objeto: o vendedor aliena ao comprador o veículo descrito neste instrumento.',
      'Cláusula 2ª - Preço: o comprador pagará o valor total conforme condições pactuadas.',
      'Cláusula 3ª - Entrega: o veículo será entregue com a documentação necessária após conferência.',
      'Cláusula 4ª - Inadimplência: em caso de atraso, aplicam-se as medidas previstas neste contrato.',
    ],
    buyer: 'Comprador',
    seller: 'Vendedor',
    vehicle: 'Dados do Veículo',
    payment: 'Condições de Pagamento',
    generatedAt: 'Gerado em',
    signatures: 'Assinaturas',
  };
}

function generateContractPdfBuffer({ idioma = 'pt', venda, cliente, configuracao }) {
  return new Promise((resolve, reject) => {
    const template = getTemplate(idioma);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const empresa = configuracao?.nomeEmpresa || 'Hirata Cars';
    const vendedor = empresa;
    const comprador = cliente?.nome || venda?.cliente_nome || 'Cliente';

    doc.fontSize(18).text(template.title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text(template.subtitle, { align: 'center' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(11).text(`${template.seller}: ${vendedor}`);
    doc.text(`${template.buyer}: ${comprador}`);
    if (cliente?.email) doc.text(`Email: ${cliente.email}`);
    if (cliente?.telefone) doc.text(`Telefone: ${cliente.telefone}`);
    doc.moveDown();

    doc.fontSize(12).text(template.vehicle, { underline: true });
    doc.fontSize(11)
      .text(`Fabricante: ${venda?.fabricante || '-'}`)
      .text(`Modelo: ${venda?.modelo || '-'}`)
      .text(`Ano: ${venda?.ano || '-'}`)
      .text(`Km: ${venda?.kilometragem || '-'}`);
    doc.moveDown();

    doc.fontSize(12).text(template.payment, { underline: true });
    doc.fontSize(11)
      .text(`Valor base: ${formatCurrency(venda?.valor)}`)
      .text(`Valor total: ${formatCurrency(venda?.valor_total)}`)
      .text(`Parcelas: ${venda?.parcelas || 1}`)
      .text(`Juros: ${Number(venda?.juros || 0).toFixed(2)}%`);

    doc.moveDown();
    template.sections.forEach((line) => {
      doc.fontSize(10.5).text(line, { align: 'justify' });
      doc.moveDown(0.5);
    });

    doc.moveDown();
    doc.fontSize(10).fillColor('#444').text(`${template.generatedAt}: ${new Date().toLocaleString('pt-BR')}`);

    doc.moveDown(3);
    doc.fillColor('#000').fontSize(11).text(template.signatures);
    doc.moveDown(1.5);
    doc.text('____________________________________');
    doc.text(comprador);
    doc.moveDown(2);
    doc.text('____________________________________');
    doc.text(vendedor);

    doc.end();
  });
}

module.exports = {
  generateContractPdfBuffer,
};
