const PDFDocument = require('pdfkit');

const LANGUAGE_LOCALES = {
  pt: 'pt-BR',
  ja: 'ja-JP',
  fil: 'fil-PH',
  vi: 'vi-VN',
  id: 'id-ID',
  en: 'en-US',
};

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

function getTemplate(idioma = 'pt') {
  const templates = {
    pt: {
      title: 'CONTRATO DE COMPRA E VENDA DE VEÍCULO',
      subtitle: 'Instrumento particular de compra e venda',
      seller: 'Vendedor',
      buyer: 'Comprador',
      vehicle: 'Dados do Veículo',
      payment: 'Condições de Pagamento',
      baseValue: 'Valor base',
      totalValue: 'Valor total',
      installments: 'Parcelas',
      interest: 'Juros',
      manufacturer: 'Fabricante',
      model: 'Modelo',
      year: 'Ano',
      mileage: 'Km',
      generatedAt: 'Gerado em',
      signatures: 'Assinaturas',
      sections: [
        'Cláusula 1ª - Objeto: o vendedor aliena ao comprador o veículo descrito neste instrumento.',
        'Cláusula 2ª - Preço: o comprador pagará o valor total em JPY conforme condições pactuadas.',
        'Cláusula 3ª - Entrega: o veículo será entregue com a documentação necessária após conferência.',
        'Cláusula 4ª - Inadimplência: em caso de atraso, aplicam-se as medidas previstas neste contrato.',
      ],
    },
    ja: {
      title: '車両売買契約書',
      subtitle: '中古車売買契約',
      seller: '売主',
      buyer: '買主',
      vehicle: '車両情報',
      payment: '支払条件',
      baseValue: '車両価格',
      totalValue: '支払総額',
      installments: '分割回数',
      interest: '金利',
      manufacturer: 'メーカー',
      model: 'モデル',
      year: '年式',
      mileage: '走行距離',
      generatedAt: '作成日時',
      signatures: '署名欄',
      sections: [
        '第1条（目的）本契約は、売主が買主に対して下記車両を売却することを定めます。',
        '第2条（価格）買主は、合意された総額を日本円で契約条件に従って支払います。',
        '第3条（引渡し）車両の引渡しは、必要書類の確認後に実施されます。',
        '第4条（遅延）支払遅延時は、契約上の措置を適用します。',
      ],
    },
    fil: {
      title: 'KONTRATA SA BILIHAN NG SASAKYAN',
      subtitle: 'Pribadong kasunduan sa bentahan',
      seller: 'Nagbebenta',
      buyer: 'Mamimili',
      vehicle: 'Detalye ng Sasakyan',
      payment: 'Mga Tuntunin ng Bayad',
      baseValue: 'Presyo ng sasakyan',
      totalValue: 'Kabuuang halaga',
      installments: 'Mga hulog',
      interest: 'Interes',
      manufacturer: 'Tagagawa',
      model: 'Modelo',
      year: 'Taon',
      mileage: 'Kilometrahe',
      generatedAt: 'Ginawa noong',
      signatures: 'Mga Lagda',
      sections: [
        'Sugnay 1 - Paksa: Ipinagbibili ng nagbebenta sa mamimili ang sasakyang inilalarawan sa kasunduang ito.',
        'Sugnay 2 - Presyo: Babayaran ng mamimili ang kabuuang halaga sa JPY ayon sa napagkasunduang kundisyon.',
        'Sugnay 3 - Turnover: Ihahatid ang sasakyan kasama ang kinakailangang mga dokumento matapos ang beripikasyon.',
        'Sugnay 4 - Pagkaantala: Kapag naantala ang bayad, ipatutupad ang mga hakbang na nasa kontrata.',
      ],
    },
    vi: {
      title: 'HỢP ĐỒNG MUA BÁN XE',
      subtitle: 'Văn bản thỏa thuận mua bán',
      seller: 'Bên bán',
      buyer: 'Bên mua',
      vehicle: 'Thông tin xe',
      payment: 'Điều khoản thanh toán',
      baseValue: 'Giá xe',
      totalValue: 'Tổng thanh toán',
      installments: 'Số kỳ trả góp',
      interest: 'Lãi suất',
      manufacturer: 'Hãng xe',
      model: 'Mẫu xe',
      year: 'Năm',
      mileage: 'Số km',
      generatedAt: 'Tạo lúc',
      signatures: 'Chữ ký',
      sections: [
        'Điều 1 - Đối tượng: Bên bán chuyển nhượng cho bên mua chiếc xe được mô tả trong hợp đồng này.',
        'Điều 2 - Giá bán: Bên mua thanh toán tổng số tiền bằng JPY theo điều kiện đã thỏa thuận.',
        'Điều 3 - Bàn giao: Xe được bàn giao cùng các giấy tờ cần thiết sau khi xác minh.',
        'Điều 4 - Chậm thanh toán: Khi chậm thanh toán, các biện pháp trong hợp đồng sẽ được áp dụng.',
      ],
    },
    id: {
      title: 'PERJANJIAN JUAL BELI KENDARAAN',
      subtitle: 'Perjanjian jual beli pribadi',
      seller: 'Penjual',
      buyer: 'Pembeli',
      vehicle: 'Detail Kendaraan',
      payment: 'Ketentuan Pembayaran',
      baseValue: 'Harga kendaraan',
      totalValue: 'Total pembayaran',
      installments: 'Cicilan',
      interest: 'Bunga',
      manufacturer: 'Pabrikan',
      model: 'Model',
      year: 'Tahun',
      mileage: 'Kilometer',
      generatedAt: 'Dibuat pada',
      signatures: 'Tanda Tangan',
      sections: [
        'Pasal 1 - Objek: Penjual mengalihkan kendaraan yang dijelaskan dalam perjanjian ini kepada pembeli.',
        'Pasal 2 - Harga: Pembeli wajib membayar total nilai dalam JPY sesuai syarat yang disepakati.',
        'Pasal 3 - Penyerahan: Kendaraan akan diserahkan bersama dokumen yang diperlukan setelah verifikasi.',
        'Pasal 4 - Keterlambatan: Jika terjadi keterlambatan pembayaran, ketentuan kontrak akan diberlakukan.',
      ],
    },
    en: {
      title: 'VEHICLE PURCHASE AND SALE AGREEMENT',
      subtitle: 'Private instrument of purchase and sale',
      seller: 'Seller',
      buyer: 'Buyer',
      vehicle: 'Vehicle Details',
      payment: 'Payment Terms',
      baseValue: 'Vehicle price',
      totalValue: 'Total amount',
      installments: 'Installments',
      interest: 'Interest',
      manufacturer: 'Manufacturer',
      model: 'Model',
      year: 'Year',
      mileage: 'Mileage',
      generatedAt: 'Generated at',
      signatures: 'Signatures',
      sections: [
        'Clause 1 - Subject Matter: The seller transfers to the buyer the vehicle described herein.',
        'Clause 2 - Price: The buyer agrees to pay the total amount in JPY under the agreed conditions.',
        'Clause 3 - Delivery: The vehicle will be delivered with all required documents after inspection.',
        'Clause 4 - Default: In case of payment delay, contractual measures will apply.',
      ],
    },
  };

  return templates[idioma] || templates.pt;
}

function renderLanguageSection(doc, template, venda, cliente, configuracao, idioma, isFirstPage) {
  const empresa = configuracao?.nomeEmpresa || 'Hirata Cars';
  const vendedor = empresa;
  const comprador = cliente?.nome || venda?.cliente_nome || 'Cliente';
  const locale = LANGUAGE_LOCALES[idioma] || 'ja-JP';

  if (!isFirstPage) {
    doc.addPage();
  }

  doc.fillColor('#000').fontSize(18).text(template.title, { align: 'center' });
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
    .text(`${template.manufacturer}: ${venda?.fabricante || '-'}`)
    .text(`${template.model}: ${venda?.modelo || '-'}`)
    .text(`${template.year}: ${venda?.ano || '-'}`)
    .text(`${template.mileage}: ${venda?.kilometragem || '-'} km`);

  doc.moveDown();
  doc.fontSize(12).text(template.payment, { underline: true });
  doc.fontSize(11)
    .text(`${template.baseValue}: ${formatCurrency(venda?.valor)}`)
    .text(`${template.totalValue}: ${formatCurrency(venda?.valor_total)}`)
    .text(`${template.installments}: ${venda?.parcelas || 1}`)
    .text(`${template.interest}: ${Number(venda?.juros || 0).toFixed(1)}%`);

  doc.moveDown();
  template.sections.forEach((line) => {
    doc.fontSize(10.5).text(line, { align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown();
  doc.fontSize(10).fillColor('#444').text(`${template.generatedAt}: ${new Date().toLocaleString(locale)}`);

  doc.moveDown(3);
  doc.fillColor('#000').fontSize(11).text(template.signatures);
  doc.moveDown(1.5);
  doc.text('____________________________________');
  doc.text(comprador);
  doc.moveDown(2);
  doc.text('____________________________________');
  doc.text(vendedor);
}

function generateContractPdfBuffer({ idiomas = ['pt', 'ja'], venda, cliente, configuracao }) {
  const selectedLanguages = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : ['pt', 'ja'];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    selectedLanguages.forEach((idioma, index) => {
      const template = getTemplate(idioma);
      renderLanguageSection(doc, template, venda, cliente, configuracao, idioma, index === 0);
    });

    doc.end();
  });
}

module.exports = {
  generateContractPdfBuffer,
};
