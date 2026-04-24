const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const BLANK_FIELD = '________________________';

const LANGUAGE_LOCALES = {
  pt: 'pt-BR',
  ja: 'ja-JP',
  fil: 'fil-PH',
  vi: 'vi-VN',
  id: 'id-ID',
  en: 'en-US',
};

const FONT_CANDIDATES = {
  regular: [
    path.resolve(__dirname, '../../assets/fonts/NotoSansJP-Regular.ttf'),
    path.resolve(__dirname, '../../assets/fonts/NotoSansCJKjp-Regular.otf'),
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    'C:/Windows/Fonts/msgothic.ttc',
    'C:/Windows/Fonts/meiryo.ttc',
  ],
  bold: [
    path.resolve(__dirname, '../../assets/fonts/NotoSansJP-Bold.ttf'),
    path.resolve(__dirname, '../../assets/fonts/NotoSansCJKjp-Bold.otf'),
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    'C:/Windows/Fonts/meiryob.ttc',
  ],
};

function findFirstExisting(paths) {
  return paths.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  }) || null;
}

function registerUnicodeFonts(doc) {
  const regularPath = findFirstExisting(FONT_CANDIDATES.regular);
  const boldPath = findFirstExisting(FONT_CANDIDATES.bold) || regularPath;

  if (regularPath) {
    doc.registerFont('unicodeRegular', regularPath);
    if (boldPath) {
      doc.registerFont('unicodeBold', boldPath);
    }
    return {
      regular: 'unicodeRegular',
      bold: boldPath ? 'unicodeBold' : 'unicodeRegular',
    };
  }

  console.warn('[contractPdf] Fonte Unicode/CJK não encontrada. Usando fallback padrão.');
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function safeField(value, { allowEmpty = false } = {}) {
  if (value === null || value === undefined) return allowEmpty ? '' : BLANK_FIELD;
  const normalized = String(value).trim();
  if (!normalized) return allowEmpty ? '' : BLANK_FIELD;
  return normalized;
}

function ensureSpace(doc, requiredHeight = 80) {
  const available = doc.page.height - doc.page.margins.bottom - doc.y;
  if (available < requiredHeight) {
    doc.addPage();
  }
}

function resolveLogoPath() {
  const candidates = [
    path.resolve(__dirname, '../../../public/Hirata Logo.png'),
    path.resolve(__dirname, '../../assets/Hirata Logo.png'),
  ];
  return findFirstExisting(candidates);
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

function toDateBR(value) {
  if (!value) return BLANK_FIELD;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return BLANK_FIELD;
  return d.toLocaleDateString('pt-BR');
}

function getVehicleData(venda, veiculo) {
  return {
    fabricante: safeField(venda?.fabricante || veiculo?.marca),
    modelo: safeField(venda?.modelo || veiculo?.modelo),
    ano: safeField(venda?.ano || veiculo?.ano),
    chassi: safeField(venda?.chassi || veiculo?.chassi),
    placa: safeField(venda?.placa || veiculo?.placa),
    km: safeField(venda?.kilometragem || veiculo?.kilometragem),
  };
}

function buildInstallments(venda) {
  const total = Number(venda?.valor_total || 0);
  const sinal = Number(venda?.valor_pago || 0);
  const totalParcelas = Math.max(1, Number(venda?.parcelas || 1));
  const restante = Math.max(total - sinal, 0);
  const valorParcela = totalParcelas > 0 ? restante / totalParcelas : restante;
  const baseDate = venda?.created_at ? new Date(venda.created_at) : new Date();

  const installments = Array.from({ length: Math.min(12, totalParcelas) }, (_x, index) => {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + index + 1);
    return {
      numero: index + 1,
      data: dueDate,
      valor: valorParcela,
      multa: '-',
    };
  });

  return {
    total,
    sinal,
    restante,
    totalParcelas,
    valorParcela,
    installments,
  };
}

function templateByLanguage(idioma = 'pt') {
  const templates = {
    pt: {
      title: 'CONTRATO PARTICULAR DE COMPRA E VENDA DE VEÍCULO USADO',
      cityLabel: 'Nome da cidade',
      sellerLabel: 'DIRETOR (VENDEDOR)',
      buyerLabel: 'COMPRADOR',
      clause1: 'Cláusula 1ª - Objeto do Contrato',
      clause2: 'Cláusula 2ª - Responsabilidades do DIRETOR',
      clause3: 'Cláusula 3ª - Responsabilidades do COMPRADOR',
      clause4: 'Cláusula 4ª - Preço e Forma de Pagamento',
      clause6: 'Cláusula 6ª - Condições Gerais do Contrato',
      clause7: 'Cláusula 7ª - Transferência da Propriedade',
      clause8: 'Cláusula 8ª - Disposições finais',
      generatedAt: 'Gerado em',
      paymentTableHeaders: ['PRESTAÇÕES', 'DATA', 'VALOR', 'MULTA'],
      texts: {
        intro: 'Tem entre os mesmos, de maneira justa e acordada, o presente CONTRATO PARTICULAR DE COMPRA E VENDA DE VEÍCULO/AUTOMÓVEL USADO, ficando desde já aceito, pelas cláusulas abaixo descritas.',
        object: 'O presente tem como OBJETO o veículo/automóvel nas seguintes condições acordadas: descrever detalhadamente o veículo.',
        objectP1: 'Parágrafo primeiro. O veículo/automóvel, objeto do presente contrato, é usado, apresentando um desgaste e envelhecimento inerentes aos seus anos e quilometragem.',
        objectP2: 'Parágrafo segundo. Antes da sua revenda, o DIRETOR inspecionou o veículo/automóvel e verificou as suas condições de funcionamento, corrigindo as anomalias detectadas, não inerentes ao desgaste e envelhecimento do veículo.',
        clause2: 'Sem prejuízo do disposto no parágrafo primeiro da cláusula 1ª, o DIRETOR responde pelo bom estado e bom funcionamento do veículo, pelo prazo de 3 meses para motor e câmbio, a contar da data da sua entrega.',
        clause2p: 'Parágrafo único. A exceção prevista no caput da presente cláusula somente é aplicável a elementos que não se relacionem, direta ou indiretamente, com a segurança do veículo e cuja ausência ou deformação não impeçam a satisfação dos fins a que se destina.',
        clause3: 'É dever do COMPRADOR verificar, até ao momento da entrega do veículo automóvel, se o mesmo se encontra nas condições negociadas.',
        clause3p: 'Parágrafo único. Qualquer substituição de peças e/ou componentes, além daquelas que forem efetuadas na inspeção referida, e que não constituam elementos indispensáveis à segurança e ao bom funcionamento do veículo, apenas será efetuada mediante pedido escrito do COMPRADOR e eventual revisão do preço pago na venda do veículo automóvel.',
        clause4: 'O COMPRADOR concorda em realizar o pagamento do preço total do automóvel, sendo que este valor será dividido em SINAL e PARCELAS conforme tabela abaixo.',
        clause4p1: 'Parágrafo primeiro. Na determinação do preço supramencionados foram fatores relevantes à sua fixação: o fato de não ser um veículo novo, o uso e desgaste do veículo e a quilometragem do mesmo.',
        clause4p2: 'Parágrafo segundo. O preço não inclui os custos inerentes à formalização da transmissão de propriedade.',
        clause4p3: 'Parágrafo terceiro. Sem prejuízo do disposto nas cláusulas anteriores, o veículo é vendido livre de quaisquer ônus ou encargos.',
        clause6: 'Perante qualquer anomalia verificada no veículo, o COMPRADOR deverá denunciá-la ao VENDEDOR no prazo de prazo para reclamação de anomalias dias, após o seu conhecimento.',
        clause6p1: 'Parágrafo primeiro. O DIRETOR não se responsabiliza pela utilização negligente do veículo automóvel ou por defeitos resultantes de manutenção por oficinas não recomendadas.',
        clause6p2: 'Parágrafo segundo. O COMPRADOR deverá fazer carimbar o livro de revisões do veículo ou fazer a sua prova mediante documento escrito e respectivas faturas.',
        clause6p3: 'Parágrafo terceiro. O veículo será entregue nas instalações do DIRETOR, salvo convenção escrita em contrário.',
        clause7: 'A Escritura de Compra e Venda será formalizada até o dia útil após o pagamento da última parcela, quando as mesmas estiverem devidamente quitadas.',
        clause8: 'O presente contrato passa a vigorar entre as partes a partir da assinatura do mesmo, as quais elegem o foro da cidade contratada, para dirimirem quaisquer dúvidas provenientes da execução e cumprimento do mesmo. Os herdeiros ou sucessores das partes contratantes se obrigam desde já ao inteiro teor deste contrato.',
      },
    },
    ja: {
      title: '中古車売買契約書',
      cityLabel: '市区町村名',
      sellerLabel: '売主（会社代表）',
      buyerLabel: '買主',
      clause1: '第1条 - 契約の目的',
      clause2: '第2条 - 売主の責任',
      clause3: '第3条 - 買主の責任',
      clause4: '第4条 - 価格および支払方法',
      clause6: '第6条 - 一般条件',
      clause7: '第7条 - 所有権移転',
      clause8: '第8条 - 最終条項',
      generatedAt: '作成日時',
      paymentTableHeaders: ['回', '期日', '金額', '遅延損害金'],
      texts: {
        intro: '当事者は、以下の条項に従い、中古車売買に関する本契約を締結します。',
        object: '本契約の目的物は、以下の車両情報（メーカー、モデル、年式、車台番号、ナンバー、走行距離）です。',
        objectP1: '第1条第1項：本車両は中古車であり、年式および走行距離に応じた使用劣化があります。',
        objectP2: '第1条第2項：売主は再販売前に点検を実施し、経年劣化以外の不具合を是正しました。',
        clause2: '売主は引渡日から3か月間、エンジンおよびミッションの正常作動について責任を負います。',
        clause2p: '但し、安全性に直接または間接に関係しない要素に限り、当事者の合意により保証対象外とできます。',
        clause3: '買主は引渡時までに、交渉内容どおりの状態であることを確認する義務を負います。',
        clause3p: '安全走行に不可欠でない部品交換は、買主の書面依頼と価格再調整の対象となります。',
        clause4: '買主は総額、手付金、分割払いを以下の条件で支払うものとします。',
        clause4p1: '価格決定には、中古車であること、使用状況、走行距離を反映しています。',
        clause4p2: '上記価格には名義変更等の手続費用は含まれません。',
        clause4p3: '本車両は第三者の権利負担なく売却されます。',
        clause6: '買主は不具合を認識後、法定期間内に売主へ通知するものとします。',
        clause6p1: '売主は、推奨外工場での整備や不適切使用による不具合について責任を負いません。',
        clause6p2: '買主は整備記録簿および請求書等の証憑を保管するものとします。',
        clause6p3: '車両の引渡しは、別途書面合意がない限り売主施設で行います。',
        clause7: '所有権移転は最終分割金の完済後に手続きを行います。',
        clause8: '本契約は署名日より効力を有し、紛争は合意管轄地の裁判所にて解決します。',
      },
    },
    fil: {
      title: 'KONTRATA NG BILIHAN NG GINAMIT NA SASAKYAN',
      cityLabel: 'Pangalan ng Lungsod',
      sellerLabel: 'DIREKTOR (NAGBEBENTA)',
      buyerLabel: 'MAMIMILI',
      clause1: 'Sugnay 1 - Paksa ng Kontrata',
      clause2: 'Sugnay 2 - Pananagutan ng Direktor',
      clause3: 'Sugnay 3 - Pananagutan ng Mamimili',
      clause4: 'Sugnay 4 - Presyo at Paraan ng Bayad',
      clause6: 'Sugnay 6 - Pangkalahatang Kondisyon',
      clause7: 'Sugnay 7 - Paglipat ng Pagmamay-ari',
      clause8: 'Sugnay 8 - Huling Probisyon',
      generatedAt: 'Nabuo noong',
      paymentTableHeaders: ['HULOG', 'PETSA', 'HALAGA', 'MULTA'],
      texts: {
        intro: 'Ang mga panig ay patas na sumasang-ayon sa kontratang ito para sa bentahan ng ginamit na sasakyan.',
        object: 'Saklaw ng kontrata ang sasakyan batay sa tatak, modelo, taon, chassi, plaka at kilometrahe.',
        objectP1: 'Ang sasakyan ay gamit na at may karaniwang pagkasira ayon sa taon at paggamit.',
        objectP2: 'Bago ibenta, sinuri ng nagbebenta ang sasakyan at inayos ang depektong hindi normal na wear and tear.',
        clause2: 'May pananagutan ang nagbebenta sa makina at transmission sa loob ng 3 buwan mula sa turnover.',
        clause2p: 'Ang anumang pagbubukod sa warranty ay para lamang sa bahaging hindi kaugnay ng kaligtasan ng sasakyan.',
        clause3: 'Tungkulin ng mamimili na suriin ang kondisyon ng sasakyan bago ito tanggapin.',
        clause3p: 'Ang pagpapalit ng hindi kritikal na piyesa ay sa nakasulat na kahilingan ng mamimili at posibleng rebisyon ng presyo.',
        clause4: 'Babayaran ng mamimili ang kabuuang presyo sa pamamagitan ng down payment at hulugan.',
        clause4p1: 'Kasama sa basehan ng presyo ang pagiging gamit na sasakyan, pagkasira at kilometrahe.',
        clause4p2: 'Hindi kasama sa presyo ang gastos sa paglipat ng rehistro/pagmamay-ari.',
        clause4p3: 'Ibinebenta ang sasakyan na walang lien o pasanin.',
        clause6: 'Dapat i-report ng mamimili ang anumang depekto sa loob ng legal na panahon.',
        clause6p1: 'Hindi mananagot ang nagbebenta sa depektong dulot ng maling paggamit o sa hindi inirekomendang talyer.',
        clause6p2: 'Dapat panatilihin ng mamimili ang records ng maintenance at resibo.',
        clause6p3: 'Ang turnover ay sa pasilidad ng nagbebenta maliban kung may ibang kasulatang kasunduan.',
        clause7: 'Ang paglilipat ng pagmamay-ari ay pormal pagkatapos ng ganap na bayad sa huling hulog.',
        clause8: 'Umiiral ang kontratang ito sa petsa ng pirma at ang alitan ay didinggin sa napagkasunduang lungsod.',
      },
    },
    vi: {
      title: 'HỢP ĐỒNG MUA BÁN XE ĐÃ QUA SỬ DỤNG',
      cityLabel: 'Tên thành phố',
      sellerLabel: 'BÊN BÁN (GIÁM ĐỐC)',
      buyerLabel: 'BÊN MUA',
      clause1: 'Điều 1 - Đối tượng hợp đồng',
      clause2: 'Điều 2 - Trách nhiệm bên bán',
      clause3: 'Điều 3 - Trách nhiệm bên mua',
      clause4: 'Điều 4 - Giá và phương thức thanh toán',
      clause6: 'Điều 6 - Điều kiện chung',
      clause7: 'Điều 7 - Chuyển quyền sở hữu',
      clause8: 'Điều 8 - Điều khoản cuối cùng',
      generatedAt: 'Tạo lúc',
      paymentTableHeaders: ['KỲ', 'NGÀY', 'GIÁ TRỊ', 'PHẠT'],
      texts: {
        intro: 'Các bên thống nhất ký kết hợp đồng mua bán xe cũ với các điều khoản sau.',
        object: 'Đối tượng là xe theo thông tin: hãng, mẫu, năm, số khung, biển số, số km.',
        objectP1: 'Xe là xe đã qua sử dụng, có hao mòn tự nhiên theo thời gian và quãng đường.',
        objectP2: 'Trước khi bán, bên bán đã kiểm tra và khắc phục các lỗi ngoài hao mòn tự nhiên.',
        clause2: 'Bên bán bảo hành động cơ và hộp số trong 3 tháng kể từ ngày bàn giao.',
        clause2p: 'Ngoại lệ bảo hành chỉ áp dụng cho chi tiết không ảnh hưởng trực tiếp/gián tiếp đến an toàn xe.',
        clause3: 'Bên mua có trách nhiệm kiểm tra tình trạng xe trước thời điểm nhận xe.',
        clause3p: 'Thay thế linh kiện không thiết yếu cho an toàn chỉ thực hiện khi có yêu cầu bằng văn bản của bên mua.',
        clause4: 'Bên mua thanh toán tổng giá trị qua tiền đặt cọc và các kỳ trả góp.',
        clause4p1: 'Giá bán phản ánh việc xe cũ, mức độ sử dụng và số km.',
        clause4p2: 'Giá chưa bao gồm chi phí sang tên/chuyển quyền sở hữu.',
        clause4p3: 'Xe được bán không kèm bất kỳ nghĩa vụ ràng buộc nào.',
        clause6: 'Bên mua phải thông báo lỗi trong thời hạn pháp lý kể từ khi phát hiện.',
        clause6p1: 'Bên bán không chịu trách nhiệm với lỗi do sử dụng bất cẩn hoặc sửa chữa tại cơ sở không được chỉ định.',
        clause6p2: 'Bên mua phải lưu hồ sơ bảo dưỡng và hóa đơn liên quan.',
        clause6p3: 'Xe được bàn giao tại cơ sở bên bán trừ khi có thỏa thuận khác bằng văn bản.',
        clause7: 'Thủ tục chuyển quyền sở hữu thực hiện sau khi thanh toán xong kỳ cuối.',
        clause8: 'Hợp đồng có hiệu lực từ ngày ký, tranh chấp giải quyết tại tòa án có thẩm quyền tại thành phố đã chọn.',
      },
    },
    id: {
      title: 'PERJANJIAN JUAL BELI MOBIL BEKAS',
      cityLabel: 'Nama kota',
      sellerLabel: 'PENJUAL (DIREKTUR)',
      buyerLabel: 'PEMBELI',
      clause1: 'Pasal 1 - Objek Perjanjian',
      clause2: 'Pasal 2 - Tanggung Jawab Penjual',
      clause3: 'Pasal 3 - Tanggung Jawab Pembeli',
      clause4: 'Pasal 4 - Harga dan Cara Pembayaran',
      clause6: 'Pasal 6 - Ketentuan Umum',
      clause7: 'Pasal 7 - Pengalihan Kepemilikan',
      clause8: 'Pasal 8 - Ketentuan Penutup',
      generatedAt: 'Dibuat pada',
      paymentTableHeaders: ['ANGSURAN', 'TANGGAL', 'NILAI', 'DENDA'],
      texts: {
        intro: 'Para pihak sepakat menandatangani perjanjian jual beli mobil bekas ini.',
        object: 'Objek perjanjian adalah kendaraan dengan data: merek, model, tahun, nomor rangka, pelat, dan kilometer.',
        objectP1: 'Kendaraan merupakan unit bekas dengan penyusutan alami sesuai usia dan kilometer.',
        objectP2: 'Sebelum dijual, penjual telah memeriksa dan memperbaiki anomali di luar keausan normal.',
        clause2: 'Penjual menjamin mesin dan transmisi selama 3 bulan sejak tanggal serah terima.',
        clause2p: 'Pengecualian garansi hanya berlaku untuk elemen yang tidak terkait dengan keselamatan kendaraan.',
        clause3: 'Pembeli wajib memeriksa kondisi kendaraan sebelum serah terima.',
        clause3p: 'Penggantian komponen non-kritis dilakukan atas permintaan tertulis pembeli dan peninjauan harga bila perlu.',
        clause4: 'Pembeli membayar harga total dengan uang muka dan cicilan sesuai tabel.',
        clause4p1: 'Penetapan harga mempertimbangkan kondisi mobil bekas, pemakaian, dan kilometer.',
        clause4p2: 'Harga tidak termasuk biaya pengalihan kepemilikan.',
        clause4p3: 'Kendaraan dijual bebas dari beban atau tanggungan.',
        clause6: 'Pembeli harus melaporkan anomali dalam tenggat hukum yang berlaku.',
        clause6p1: 'Penjual tidak bertanggung jawab atas penggunaan lalai atau perbaikan di bengkel yang tidak direkomendasikan.',
        clause6p2: 'Pembeli wajib menyimpan bukti servis berkala dan faktur.',
        clause6p3: 'Serah terima dilakukan di fasilitas penjual kecuali ada perjanjian tertulis lain.',
        clause7: 'Pengalihan kepemilikan diformalkan setelah pelunasan cicilan terakhir.',
        clause8: 'Perjanjian berlaku sejak ditandatangani dan sengketa diselesaikan pada yurisdiksi kota yang disepakati.',
      },
    },
    en: {
      title: 'PRIVATE USED VEHICLE PURCHASE AND SALE AGREEMENT',
      cityLabel: 'City name',
      sellerLabel: 'SELLER (DIRECTOR)',
      buyerLabel: 'BUYER',
      clause1: 'Clause 1 - Subject Matter',
      clause2: 'Clause 2 - Seller Responsibilities',
      clause3: 'Clause 3 - Buyer Responsibilities',
      clause4: 'Clause 4 - Price and Payment Terms',
      clause6: 'Clause 6 - General Conditions',
      clause7: 'Clause 7 - Transfer of Ownership',
      clause8: 'Clause 8 - Final Provisions',
      generatedAt: 'Generated at',
      paymentTableHeaders: ['INSTALLMENT', 'DATE', 'AMOUNT', 'PENALTY'],
      texts: {
        intro: 'The parties hereby fairly agree to this private used vehicle purchase and sale agreement under the clauses below.',
        object: 'The object is the vehicle described with manufacturer, model, year, chassis, plate and mileage.',
        objectP1: 'The vehicle is used and naturally presents wear and aging according to its years and mileage.',
        objectP2: 'Before resale, the seller inspected the vehicle and corrected anomalies not inherent to normal wear.',
        clause2: 'The seller guarantees engine and transmission for 3 months from delivery date.',
        clause2p: 'Warranty exclusions apply only to elements not directly or indirectly related to vehicle safety.',
        clause3: 'The buyer must verify that the vehicle is in negotiated condition before delivery.',
        clause3p: 'Replacement of non-essential parts for safety/good operation requires buyer written request and possible price review.',
        clause4: 'The buyer agrees to pay total price with down payment and installments as listed below.',
        clause4p1: 'Pricing considered the vehicle being used, its wear and mileage.',
        clause4p2: 'The above price does not include ownership transfer formalization costs.',
        clause4p3: 'The vehicle is sold free of any liens or encumbrances.',
        clause6: 'Any anomaly shall be reported by the buyer to the seller within applicable legal period.',
        clause6p1: 'The seller is not liable for negligent use or maintenance/repair by non-recommended workshops.',
        clause6p2: 'The buyer must keep periodic maintenance records and invoices.',
        clause6p3: 'Vehicle delivery shall occur at seller facilities unless otherwise agreed in writing.',
        clause7: 'The deed/ownership transfer will be formalized after full payment of last installment.',
        clause8: 'This agreement is effective upon signature, and disputes shall be settled in the elected city forum.',
      },
    },
  };

  return templates[idioma] || templates.pt;
}

function writeSectionTitle(doc, fonts, title) {
  ensureSpace(doc, 50);
  doc.moveDown(0.7);
  doc.font(fonts.bold).fontSize(11.5).fillColor('#000').text(title, { underline: true });
  doc.moveDown(0.2);
}

function writeParagraph(doc, fonts, text) {
  if (!text) return;
  ensureSpace(doc, 30);
  doc.font(fonts.regular).fontSize(10.5).fillColor('#111').text(text, { align: 'justify' });
  doc.moveDown(0.2);
}

function drawInstallmentsTable(doc, fonts, headers, installments) {
  ensureSpace(doc, 320);
  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const rowHeight = 18;
  const colWidths = [90, 140, 130, tableWidth - 90 - 140 - 130];
  let y = doc.y + 3;

  const drawRow = (rowData, isHeader = false) => {
    let x = startX;
    for (let i = 0; i < rowData.length; i += 1) {
      doc.rect(x, y, colWidths[i], rowHeight).stroke('#333');
      doc
        .font(isHeader ? fonts.bold : fonts.regular)
        .fontSize(isHeader ? 9.5 : 9)
        .fillColor('#000')
        .text(String(rowData[i] || ''), x + 4, y + 5, {
          width: colWidths[i] - 8,
          align: i === 0 ? 'center' : i === 2 ? 'right' : 'left',
        });
      x += colWidths[i];
    }
    y += rowHeight;
  };

  drawRow(headers, true);
  for (let i = 0; i < 12; i += 1) {
    const item = installments[i];
    drawRow(item ? [item.numero, toDateBR(item.data), formatCurrency(item.valor), item.multa] : [i + 1, '', '', '']);
  }

  doc.y = y + 2;
}

function renderLanguageSection(doc, template, payload, idioma, isFirstPage) {
  if (!isFirstPage) doc.addPage();

  const fonts = payload.fonts;

  const locale = LANGUAGE_LOCALES[idioma] || 'pt-BR';
  const generatedAt = new Date().toLocaleString(locale);
  const cidade = safeField(payload.configuracao?.cidadeContrato || template.cityLabel);
  const empresaNome = safeField(payload.configuracao?.nomeEmpresa || 'Hirata Cars');
  const empresaTelefone = safeField(payload.configuracao?.telefone);
  const empresaAutorizacao = safeField(payload.configuracao?.numeroAutorizacao);
  const empresaEndereco = safeField(payload.configuracao?.endereco);
  const empresaNacionalidade = safeField(payload.configuracao?.nacionalidade);
  const empresaProfissao = safeField(payload.configuracao?.profissao);
  const empresaEstadoCivil = safeField(payload.configuracao?.estadoCivil);
  const compradorNome = safeField(payload.cliente?.nome || payload.venda?.cliente_nome || 'Comprador');
  const compradorEndereco = safeField(payload.cliente?.endereco);
  const compradorDoc = safeField(payload.cliente?.cnh_number);
  const compradorNacionalidade = safeField(payload.cliente?.nacionalidade);
  const compradorProfissao = safeField(payload.cliente?.profissao);
  const compradorEstadoCivil = safeField(payload.cliente?.estado_civil || payload.cliente?.estadoCivil);

  const logoPath = resolveLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, doc.page.margins.left, doc.y, { fit: [72, 72] });
    } catch {
      // segue sem logo
    }
  }

  doc.font(fonts.bold).fontSize(16).text('Hirata Cars', { align: 'center' });
  doc.font(fonts.regular).fontSize(10.2).text(`Tel: ${empresaTelefone} | 古物商許可: ${empresaAutorizacao}`, { align: 'center' });
  doc.moveDown(0.5);

  doc.font(fonts.bold).fontSize(15).text(template.title, { align: 'center' });
  doc.moveDown(0.5);
  doc.moveDown(0.8);

  doc.font(fonts.regular).fontSize(10.5).text(`De um lado, ${empresaNome}`);
  doc.fontSize(10.2).text(`(${empresaNacionalidade}) (${empresaProfissao}) (${empresaEstadoCivil})`);
  doc.fontSize(10.2).text(`(Zairyo Card: ${empresaAutorizacao}) (${empresaEndereco})`);
  doc.fontSize(10.2).text(`neste ato denominado ${template.sellerLabel}`);
  doc.moveDown(0.4);

  doc.fontSize(10.5).text(`Do outro lado, ${compradorNome}`);
  doc.fontSize(10.2).text(`(${compradorNacionalidade}) (${compradorProfissao}) (${compradorEstadoCivil})`);
  doc.fontSize(10.2).text(`(Zairyo Card: ${compradorDoc}) (${compradorEndereco})`);
  doc.fontSize(10.2).text(`denominado ${template.buyerLabel}`);
  doc.moveDown(0.4);
  writeParagraph(doc, fonts, template.texts.intro);

  writeSectionTitle(doc, fonts, template.clause1);
  writeParagraph(doc, fonts, template.texts.object);
  writeParagraph(
    doc,
    fonts,
    `• ${payload.veiculo.fabricante} | ${payload.veiculo.modelo} | ${payload.veiculo.ano} | Chassi: ${payload.veiculo.chassi} | Placa: ${payload.veiculo.placa} | KM: ${payload.veiculo.km}`
  );
  writeParagraph(doc, fonts, template.texts.objectP1);
  writeParagraph(doc, fonts, template.texts.objectP2);

  writeSectionTitle(doc, fonts, template.clause2);
  writeParagraph(doc, fonts, template.texts.clause2);
  writeParagraph(doc, fonts, template.texts.clause2p);

  writeSectionTitle(doc, fonts, template.clause3);
  writeParagraph(doc, fonts, template.texts.clause3);
  writeParagraph(doc, fonts, template.texts.clause3p);

  writeSectionTitle(doc, fonts, template.clause4);
  writeParagraph(doc, fonts, template.texts.clause4);
  writeParagraph(doc, fonts, `Preço Total: ${formatCurrency(payload.pagamento.total)}`);
  writeParagraph(doc, fonts, `SINAL: ${formatCurrency(payload.pagamento.sinal)} | PARCELAS: ${payload.pagamento.totalParcelas}x de ${formatCurrency(payload.pagamento.valorParcela)}`);
  drawInstallmentsTable(doc, fonts, template.paymentTableHeaders, payload.pagamento.installments);
  writeParagraph(doc, fonts, template.texts.clause4p1);
  writeParagraph(doc, fonts, template.texts.clause4p2);
  writeParagraph(doc, fonts, template.texts.clause4p3);

  writeSectionTitle(doc, fonts, template.clause6);
  writeParagraph(doc, fonts, template.texts.clause6);
  writeParagraph(doc, fonts, template.texts.clause6p1);
  writeParagraph(doc, fonts, template.texts.clause6p2);
  writeParagraph(doc, fonts, template.texts.clause6p3);

  writeSectionTitle(doc, fonts, template.clause7);
  writeParagraph(doc, fonts, template.texts.clause7);

  writeSectionTitle(doc, fonts, template.clause8);
  writeParagraph(doc, fonts, template.texts.clause8);

  ensureSpace(doc, 220);
  doc.moveDown(1);
  doc.font(fonts.regular).fontSize(10).fillColor('#333').text(`${cidade}, ${toDateBR(new Date())}`);
  doc.moveDown(1.4);
  doc.text('____________________________________    ____________________________________');
  doc.text('Comprador                                 Vendedor');
  doc.moveDown(1.1);
  doc.text('____________________________________    ____________________________________');
  doc.text('Testemunha 1                              Testemunha 2');
  doc.moveDown(1.1);
  doc.text('____________________________________');
  doc.text('Espaço para Carimbo (Inkan)');
  doc.moveDown(0.8);
  doc.font(fonts.regular).fontSize(9).fillColor('#666').text(`${template.generatedAt}: ${generatedAt}`);
}

function generateContractPdfBuffer({ idiomas = ['pt', 'ja'], venda, cliente, veiculo, configuracao }) {
  const selectedLanguages = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : ['pt', 'ja'];
  const payload = {
    venda,
    cliente,
    configuracao,
    veiculo: getVehicleData(venda, veiculo),
    pagamento: buildInstallments(venda),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: 'A4' });
    const chunks = [];
    const fonts = registerUnicodeFonts(doc);

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    selectedLanguages.forEach((idioma, index) => {
      const template = templateByLanguage(idioma);
      renderLanguageSection(doc, template, { ...payload, fonts }, idioma, index === 0);
    });

    doc.end();
  });
}

module.exports = {
  generateContractPdfBuffer,
};
