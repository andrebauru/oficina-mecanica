const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const BLANK_FIELD = '_______________________';

const LANGUAGE_LOCALES = {
  pt: 'pt-BR',
  ja: 'ja-JP',
  fil: 'fil-PH',
  vi: 'vi-VN',
  id: 'id-ID',
  en: 'en-US',
};

function safeField(value, { allowEmpty = false } = {}) {
  if (value === null || value === undefined) return allowEmpty ? '' : BLANK_FIELD;
  const normalized = String(value).trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return allowEmpty ? '' : BLANK_FIELD;
  }
  return normalized;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDate(value, locale = 'pt-BR') {
  if (!value) return safeField(null);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeField(null);
  return date.toLocaleDateString(locale);
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

  const installments = Array.from({ length: totalParcelas }, (_x, index) => {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + index + 1);
    return {
      numero: index + 1,
      data: dueDate,
      valor: valorParcela,
      multa: safeField(null),
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

function contractTemplateByLanguage(language = 'pt') {
  const basePtClauses = [
    {
      title: 'Cláusula 1ª - Objeto do Contrato',
      paragraphs: [
        'O presente tem como OBJETO o veículo/automóvel nas seguintes condições acordadas: descrever detalhadamente o veículo.',
        'Parágrafo primeiro. O veículo/automóvel, objeto do presente contrato, é usado, apresentando um desgaste e envelhecimento inerentes aos seus anos e quilometragem.',
        'Parágrafo segundo. Antes da sua revenda, o DIRETOR inspecionou o veículo/automóvel e verificou as suas condições de funcionamento, corrigindo as anomalias detectadas, não inerentes ao desgaste e envelhecimento do veículo.',
      ],
    },
    {
      title: 'Cláusula 2ª - Responsabilidades do DIRETOR',
      paragraphs: [
        'Sem prejuízo do disposto no parágrafo primeiro da cláusula 1ª, o DIRETOR responde pelo bom estado e bom funcionamento do veículo, pelo prazo de 3 meses para motor e câmbio, a contar da data da sua entrega.',
        'Parágrafo único. A exceção prevista no caput da presente cláusula somente é aplicável a elementos que não se relacionem, direta ou indiretamente, com a segurança do veículo e cuja ausência ou deformação não impeçam a satisfação dos fins a que se destina.',
      ],
    },
    {
      title: 'Cláusula 3ª - Responsabilidades do COMPRADOR',
      paragraphs: [
        'É dever do COMPRADOR verificar, até ao momento da entrega do veículo automóvel, se o mesmo se encontra nas condições negociadas.',
        'Parágrafo único. Qualquer substituição de peças e/ou componentes, além daquelas que forem efetuadas na inspeção referida, e que não constituam elementos indispensáveis à segurança e ao bom funcionamento do veículo, apenas será efetuada mediante pedido escrito do COMPRADOR e eventual revisão do preço pago na venda do veículo automóvel.',
      ],
    },
    {
      title: 'Cláusula 4ª - Preço e Forma de Pagamento',
      paragraphs: [
        'O COMPRADOR concorda em realizar o pagamento do preço total do automóvel, sendo que este valor será dividido em SINAL e PARCELAS conforme tabela abaixo.',
        'Parágrafo primeiro. Na determinação do preço supramencionado foram fatores relevantes à sua fixação: o fato de não ser um veículo novo, o uso e desgaste do veículo e a quilometragem do mesmo.',
        'Parágrafo segundo. O preço não inclui os custos inerentes à formalização da transmissão de propriedade.',
      ],
    },
    {
      title: 'Cláusula 5ª - Inadimplemento e Mora',
      paragraphs: [
        'O atraso no pagamento de qualquer parcela autoriza a cobrança de multa e demais encargos legais aplicáveis, sem prejuízo das medidas administrativas e judiciais cabíveis.',
        'Persistindo a inadimplência, o DIRETOR poderá exigir o vencimento antecipado das parcelas vincendas, observada a legislação em vigor e o devido direito de defesa.',
      ],
    },
    {
      title: 'Cláusula 6ª - Condições Gerais do Contrato',
      paragraphs: [
        'Perante qualquer anomalia verificada no veículo, o COMPRADOR deverá denunciá-la ao VENDEDOR no prazo legal aplicável após o seu conhecimento.',
        'Parágrafo primeiro. O DIRETOR não se responsabiliza pela utilização negligente do veículo automóvel ou por defeitos resultantes de manutenção por oficinas não recomendadas.',
        'Parágrafo segundo. O COMPRADOR deverá fazer carimbar o livro de revisões do veículo ou fazer a sua prova mediante documento escrito e respectivas faturas.',
        'Parágrafo terceiro. O veículo será entregue nas instalações do DIRETOR, salvo convenção escrita em contrário.',
      ],
    },
    {
      title: 'Cláusula 7ª - Transferência da Propriedade',
      paragraphs: [
        'A Escritura de Compra e Venda será formalizada após o pagamento da última parcela, quando as mesmas estiverem devidamente quitadas.',
      ],
    },
    {
      title: 'Cláusula 8ª - Disposições Finais',
      paragraphs: [
        'O presente contrato passa a vigorar entre as partes a partir da assinatura do mesmo, as quais elegem o foro da cidade contratada para dirimir quaisquer dúvidas provenientes da execução e cumprimento do mesmo.',
        'Os herdeiros ou sucessores das partes contratantes se obrigam desde já ao inteiro teor deste contrato.',
      ],
    },
  ];

  const jaClauses = [
    {
      title: '第1条 - 契約の目的',
      paragraphs: [
        '本契約の目的物は、以下の車両情報（メーカー、モデル、年式、車台番号、ナンバー、走行距離）です。',
        '第1項：本車両は中古車であり、年式および走行距離に応じた使用劣化があります。',
        '第2項：売主は再販売前に点検を実施し、経年劣化以外の不具合を是正しました。',
      ],
    },
    {
      title: '第2条 - 売主の責任',
      paragraphs: [
        '売主は引渡日から3か月間、エンジンおよびミッションの正常作動について責任を負います。',
        '但し、安全性に直接または間接に関係しない要素に限り、当事者の合意により保証対象外とできます。',
      ],
    },
    {
      title: '第3条 - 買主の責任',
      paragraphs: [
        '買主は引渡時までに、交渉内容どおりの状態であることを確認する義務を負います。',
        '安全走行に不可欠でない部品交換は、買主の書面依頼と価格再調整の対象となります。',
      ],
    },
    {
      title: '第4条 - 価格および支払方法',
      paragraphs: [
        '買主は総額、手付金、分割払いを以下の条件で支払うものとします。',
        '価格決定には、中古車であること、使用状況、走行距離を反映しています。',
        '上記価格には名義変更等の手続費用は含まれません。',
      ],
    },
    {
      title: '第5条 - 債務不履行および遅延',
      paragraphs: [
        'いずれかの分割金の支払遅延が生じた場合、売主は契約および法令に基づく遅延損害金等を請求できます。',
        '遅延が継続する場合、売主は残代金の期限の利益喪失を主張でき、法的措置を講じることができます。',
      ],
    },
    {
      title: '第6条 - 一般条件',
      paragraphs: [
        '買主は不具合を認識後、法定期間内に売主へ通知するものとします。',
        '売主は、推奨外工場での整備や不適切使用による不具合について責任を負いません。',
        '買主は整備記録簿および請求書等の証憑を保管するものとします。',
        '車両の引渡しは、別途書面合意がない限り売主施設で行います。',
      ],
    },
    {
      title: '第7条 - 所有権移転',
      paragraphs: ['所有権移転は最終分割金の完済後に手続きを行います。'],
    },
    {
      title: '第8条 - 最終条項',
      paragraphs: [
        '本契約は署名日より効力を有し、紛争は合意管轄地の裁判所にて解決します。',
        '当事者の相続人および承継人も本契約の拘束を受けます。',
      ],
    },
  ];

  const filClauses = [
    {
      title: 'Sugnay 1 - Paksa ng Kontrata',
      paragraphs: [
        'Saklaw ng kontrata ang sasakyan batay sa tatak, modelo, taon, chassi, plaka at kilometrahe.',
        'Ang sasakyan ay gamit na at may karaniwang pagkasira ayon sa taon at paggamit.',
        'Bago ibenta, sinuri ng nagbebenta ang sasakyan at inayos ang depektong hindi normal na wear and tear.',
      ],
    },
    {
      title: 'Sugnay 2 - Pananagutan ng Direktor',
      paragraphs: [
        'May pananagutan ang nagbebenta sa makina at transmission sa loob ng 3 buwan mula sa turnover.',
        'Ang anumang pagbubukod sa warranty ay para lamang sa bahaging hindi kaugnay ng kaligtasan ng sasakyan.',
      ],
    },
    {
      title: 'Sugnay 3 - Pananagutan ng Mamimili',
      paragraphs: [
        'Tungkulin ng mamimili na suriin ang kondisyon ng sasakyan bago ito tanggapin.',
        'Ang pagpapalit ng hindi kritikal na piyesa ay sa nakasulat na kahilingan ng mamimili at posibleng rebisyon ng presyo.',
      ],
    },
    {
      title: 'Sugnay 4 - Presyo at Paraan ng Bayad',
      paragraphs: [
        'Babayaran ng mamimili ang kabuuang presyo sa pamamagitan ng down payment at hulugan.',
        'Kasama sa basehan ng presyo ang pagiging gamit na sasakyan, pagkasira at kilometrahe.',
        'Hindi kasama sa presyo ang gastos sa paglipat ng rehistro/pagmamay-ari.',
      ],
    },
    {
      title: 'Sugnay 5 - Hindi Pagbabayad at Pagkaantala',
      paragraphs: [
        'Kung may pagkaantala sa hulog, maaaring singilin ang mga legal na multa at karampatang bayarin ayon sa batas.',
        'Kung magpatuloy ang hindi pagbabayad, maaaring hingin ng nagbebenta ang agarang kabuuang bayad at magsagawa ng legal na hakbang.',
      ],
    },
    {
      title: 'Sugnay 6 - Pangkalahatang Kondisyon',
      paragraphs: [
        'Dapat i-report ng mamimili ang anumang depekto sa loob ng legal na panahon.',
        'Hindi mananagot ang nagbebenta sa depektong dulot ng maling paggamit o sa hindi inirekomendang talyer.',
        'Dapat panatilihin ng mamimili ang records ng maintenance at resibo.',
        'Ang turnover ay sa pasilidad ng nagbebenta maliban kung may ibang kasulatang kasunduan.',
      ],
    },
    {
      title: 'Sugnay 7 - Paglipat ng Pagmamay-ari',
      paragraphs: ['Ang paglilipat ng pagmamay-ari ay pormal pagkatapos ng ganap na bayad sa huling hulog.'],
    },
    {
      title: 'Sugnay 8 - Huling Probisyon',
      paragraphs: [
        'Umiiral ang kontratang ito sa petsa ng pirma at ang alitan ay didinggin sa napagkasunduang lungsod.',
        'Ang mga tagapagmana at legal na kahalili ng mga partido ay saklaw ng kasunduang ito.',
      ],
    },
  ];

  const viClauses = [
    {
      title: 'Điều 1 - Đối tượng hợp đồng',
      paragraphs: [
        'Đối tượng là xe theo thông tin: hãng, mẫu, năm, số khung, biển số, số km.',
        'Xe là xe đã qua sử dụng, có hao mòn tự nhiên theo thời gian và quãng đường.',
        'Trước khi bán, bên bán đã kiểm tra và khắc phục các lỗi ngoài hao mòn tự nhiên.',
      ],
    },
    {
      title: 'Điều 2 - Trách nhiệm bên bán',
      paragraphs: [
        'Bên bán bảo hành động cơ và hộp số trong 3 tháng kể từ ngày bàn giao.',
        'Ngoại lệ bảo hành chỉ áp dụng cho chi tiết không ảnh hưởng trực tiếp/gián tiếp đến an toàn xe.',
      ],
    },
    {
      title: 'Điều 3 - Trách nhiệm bên mua',
      paragraphs: [
        'Bên mua có trách nhiệm kiểm tra tình trạng xe trước thời điểm nhận xe.',
        'Thay thế linh kiện không thiết yếu cho an toàn chỉ thực hiện khi có yêu cầu bằng văn bản của bên mua.',
      ],
    },
    {
      title: 'Điều 4 - Giá và phương thức thanh toán',
      paragraphs: [
        'Bên mua thanh toán tổng giá trị qua tiền đặt cọc và các kỳ trả góp.',
        'Giá bán phản ánh việc xe cũ, mức độ sử dụng và số km.',
        'Giá chưa bao gồm chi phí sang tên/chuyển quyền sở hữu.',
      ],
    },
    {
      title: 'Điều 5 - Chậm thanh toán và vi phạm',
      paragraphs: [
        'Trường hợp chậm thanh toán bất kỳ kỳ nào, bên bán có quyền áp dụng chế tài chậm trả theo hợp đồng và pháp luật hiện hành.',
        'Nếu vi phạm kéo dài, bên bán có thể yêu cầu đến hạn ngay toàn bộ khoản còn lại và áp dụng biện pháp pháp lý cần thiết.',
      ],
    },
    {
      title: 'Điều 6 - Điều kiện chung',
      paragraphs: [
        'Bên mua phải thông báo lỗi trong thời hạn pháp lý kể từ khi phát hiện.',
        'Bên bán không chịu trách nhiệm với lỗi do sử dụng bất cẩn hoặc sửa chữa tại cơ sở không được chỉ định.',
        'Bên mua phải lưu hồ sơ bảo dưỡng và hóa đơn liên quan.',
        'Xe được bàn giao tại cơ sở bên bán trừ khi có thỏa thuận khác bằng văn bản.',
      ],
    },
    {
      title: 'Điều 7 - Chuyển quyền sở hữu',
      paragraphs: ['Thủ tục chuyển quyền sở hữu thực hiện sau khi thanh toán xong kỳ cuối.'],
    },
    {
      title: 'Điều 8 - Điều khoản cuối cùng',
      paragraphs: [
        'Hợp đồng có hiệu lực từ ngày ký, tranh chấp giải quyết tại tòa án có thẩm quyền tại thành phố đã chọn.',
        'Người thừa kế hoặc người kế nhiệm của các bên cũng bị ràng buộc bởi toàn bộ nội dung hợp đồng này.',
      ],
    },
  ];

  const idClauses = [
    {
      title: 'Pasal 1 - Objek Perjanjian',
      paragraphs: [
        'Objek perjanjian adalah kendaraan dengan data: merek, model, tahun, nomor rangka, pelat, dan kilometer.',
        'Kendaraan merupakan unit bekas dengan penyusutan alami sesuai usia dan kilometer.',
        'Sebelum dijual, penjual telah memeriksa dan memperbaiki anomali di luar keausan normal.',
      ],
    },
    {
      title: 'Pasal 2 - Tanggung Jawab Penjual',
      paragraphs: [
        'Penjual menjamin mesin dan transmisi selama 3 bulan sejak tanggal serah terima.',
        'Pengecualian garansi hanya berlaku untuk elemen yang tidak terkait dengan keselamatan kendaraan.',
      ],
    },
    {
      title: 'Pasal 3 - Tanggung Jawab Pembeli',
      paragraphs: [
        'Pembeli wajib memeriksa kondisi kendaraan sebelum serah terima.',
        'Penggantian komponen non-kritis dilakukan atas permintaan tertulis pembeli dan peninjauan harga bila perlu.',
      ],
    },
    {
      title: 'Pasal 4 - Harga dan Cara Pembayaran',
      paragraphs: [
        'Pembeli membayar harga total dengan uang muka dan cicilan sesuai tabel.',
        'Penetapan harga mempertimbangkan kondisi mobil bekas, pemakaian, dan kilometer.',
        'Harga tidak termasuk biaya pengalihan kepemilikan.',
      ],
    },
    {
      title: 'Pasal 5 - Wanprestasi dan Keterlambatan',
      paragraphs: [
        'Keterlambatan pembayaran angsuran memberikan hak kepada penjual untuk menagih denda serta biaya yang berlaku menurut hukum.',
        'Jika wanprestasi berlanjut, penjual dapat menuntut percepatan pelunasan sisa kewajiban dan menempuh upaya hukum.',
      ],
    },
    {
      title: 'Pasal 6 - Ketentuan Umum',
      paragraphs: [
        'Pembeli harus melaporkan anomali dalam tenggat hukum yang berlaku.',
        'Penjual tidak bertanggung jawab atas penggunaan lalai atau perbaikan di bengkel yang tidak direkomendasikan.',
        'Pembeli wajib menyimpan bukti servis berkala dan faktur.',
        'Serah terima dilakukan di fasilitas penjual kecuali ada perjanjian tertulis lain.',
      ],
    },
    {
      title: 'Pasal 7 - Pengalihan Kepemilikan',
      paragraphs: ['Pengalihan kepemilikan diformalkan setelah pelunasan cicilan terakhir.'],
    },
    {
      title: 'Pasal 8 - Ketentuan Penutup',
      paragraphs: [
        'Perjanjian berlaku sejak ditandatangani dan sengketa diselesaikan pada yurisdiksi kota yang disepakati.',
        'Ahli waris atau penerus para pihak sejak awal terikat pada seluruh isi perjanjian ini.',
      ],
    },
  ];

  const enClauses = [
    {
      title: 'Clause 1 - Subject Matter',
      paragraphs: [
        'The object is the vehicle described with manufacturer, model, year, chassis, plate and mileage.',
        'The vehicle is used and naturally presents wear and aging according to its years and mileage.',
        'Before resale, the seller inspected the vehicle and corrected anomalies not inherent to normal wear.',
      ],
    },
    {
      title: 'Clause 2 - Seller Responsibilities',
      paragraphs: [
        'The seller guarantees engine and transmission for 3 months from delivery date.',
        'Warranty exclusions apply only to elements not directly or indirectly related to vehicle safety.',
      ],
    },
    {
      title: 'Clause 3 - Buyer Responsibilities',
      paragraphs: [
        'The buyer must verify that the vehicle is in negotiated condition before delivery.',
        'Replacement of non-essential parts for safety/good operation requires buyer written request and possible price review.',
      ],
    },
    {
      title: 'Clause 4 - Price and Payment Terms',
      paragraphs: [
        'The buyer agrees to pay total price with down payment and installments as listed below.',
        'Pricing considered the vehicle being used, its wear and mileage.',
        'The above price does not include ownership transfer formalization costs.',
      ],
    },
    {
      title: 'Clause 5 - Default and Delay',
      paragraphs: [
        'Delay in any installment allows the seller to charge late penalties and other lawful charges, without prejudice to legal remedies.',
        'If default persists, the seller may accelerate all remaining installments, in accordance with applicable law.',
      ],
    },
    {
      title: 'Clause 6 - General Conditions',
      paragraphs: [
        'Any anomaly shall be reported by the buyer to the seller within applicable legal period.',
        'The seller is not liable for negligent use or maintenance/repair by non-recommended workshops.',
        'The buyer must keep periodic maintenance records and invoices.',
        'Vehicle delivery shall occur at seller facilities unless otherwise agreed in writing.',
      ],
    },
    {
      title: 'Clause 7 - Transfer of Ownership',
      paragraphs: ['The deed/ownership transfer will be formalized after full payment of last installment.'],
    },
    {
      title: 'Clause 8 - Final Provisions',
      paragraphs: [
        'This agreement is effective upon signature, and disputes shall be settled in the elected city forum.',
        'The heirs and successors of both parties are bound by the full content of this agreement.',
      ],
    },
  ];

  const templates = {
    pt: {
      locale: 'pt-BR',
      title: 'CONTRATO PARTICULAR DE COMPRA E VENDA DE VEÍCULO USADO',
      sellerLabel: 'Empresa (Vendedor)',
      buyerLabel: 'COMPRADOR',
      generatedAtLabel: 'Gerado em',
      paymentHeaders: ['PRESTAÇÃO', 'DATA', 'VALOR', 'MULTA'],
      intro: 'Tem entre os mesmos, de maneira justa e acordada, o presente CONTRATO PARTICULAR DE COMPRA E VENDA DE VEÍCULO/AUTOMÓVEL USADO, ficando desde já aceito pelas cláusulas abaixo descritas.',
      clauses: basePtClauses,
      labels: {
        total: 'Preço Total',
        sinal: 'Sinal',
        parcelas: 'Parcelas',
        localDate: 'Cidade/Data',
        companyLicense: 'Licença da Empresa',
        cnh: 'CNH',
        endereco: 'Endereço',
        telefone: 'Telefone',
      },
      signatures: ['Empresa (Vendedor)', 'Comprador', 'Avalista', 'Carimbo (印鑑)'],
    },
    ja: {
      locale: 'ja-JP',
      title: '中古車売買契約書',
      sellerLabel: '会社 (売主)',
      buyerLabel: '買主',
      generatedAtLabel: '作成日時',
      paymentHeaders: ['回', '期日', '金額', '遅延損害金'],
      intro: '当事者は、以下の条項に従い、中古車売買に関する本契約を締結します。',
      clauses: jaClauses,
      labels: {
        total: '総額',
        sinal: '頭金',
        parcelas: '分割',
        localDate: '作成地/日付',
        companyLicense: '古物商許可',
        cnh: '運転免許証 (CNH)',
        endereco: '住所',
        telefone: '電話',
      },
      signatures: ['会社 (売主)', '買主', '保証人 (Avalista)', 'Carimbo (印鑑)'],
    },
    fil: {
      locale: 'fil-PH',
      title: 'KONTRATA NG BILIHAN NG GINAMIT NA SASAKYAN',
      sellerLabel: 'Kumpanya (Nagbebenta)',
      buyerLabel: 'MAMIMILI',
      generatedAtLabel: 'Nabuo noong',
      paymentHeaders: ['HULOG', 'PETSA', 'HALAGA', 'MULTA'],
      intro: 'Ang mga panig ay patas na sumasang-ayon sa kontratang ito para sa bentahan ng ginamit na sasakyan.',
      clauses: filClauses,
      labels: {
        total: 'Kabuuang Halaga',
        sinal: 'Sinal',
        parcelas: 'Mga Hulog',
        localDate: 'Lungsod/Petsa',
        companyLicense: 'Lisensya ng Kumpanya',
        cnh: 'Lisensya sa Pagmamaneho',
        endereco: 'Address',
        telefone: 'Telepono',
      },
      signatures: ['Kumpanya (Nagbebenta)', 'Mamimili', 'Tagapanagot', 'Carimbo (印鑑)'],
    },
    vi: {
      locale: 'vi-VN',
      title: 'HỢP ĐỒNG MUA BÁN XE ĐÃ QUA SỬ DỤNG',
      sellerLabel: 'Công ty (Người bán)',
      buyerLabel: 'BÊN MUA',
      generatedAtLabel: 'Tạo lúc',
      paymentHeaders: ['KỲ', 'NGÀY', 'GIÁ TRỊ', 'PHẠT'],
      intro: 'Các bên thống nhất ký kết hợp đồng mua bán xe cũ với các điều khoản dưới đây.',
      clauses: viClauses,
      labels: {
        total: 'Tổng giá',
        sinal: 'Đặt cọc',
        parcelas: 'Trả góp',
        localDate: 'Địa điểm/Ngày',
        companyLicense: 'Giấy phép công ty',
        cnh: 'Giấy phép lái xe',
        endereco: 'Địa chỉ',
        telefone: 'Điện thoại',
      },
      signatures: ['Công ty (Người bán)', 'Bên mua', 'Người bảo lãnh', 'Carimbo (印鑑)'],
    },
    id: {
      locale: 'id-ID',
      title: 'PERJANJIAN JUAL BELI MOBIL BEKAS',
      sellerLabel: 'Perusahaan (Penjual)',
      buyerLabel: 'PEMBELI',
      generatedAtLabel: 'Dibuat pada',
      paymentHeaders: ['ANGSURAN', 'TANGGAL', 'NILAI', 'DENDA'],
      intro: 'Para pihak sepakat menandatangani perjanjian jual beli mobil bekas ini.',
      clauses: idClauses,
      labels: {
        total: 'Harga Total',
        sinal: 'Uang Muka',
        parcelas: 'Cicilan',
        localDate: 'Kota/Tanggal',
        companyLicense: 'Izin Perusahaan',
        cnh: 'Surat Izin Mengemudi (SIM)',
        endereco: 'Alamat',
        telefone: 'Telepon',
      },
      signatures: ['Perusahaan (Penjual)', 'Pembeli', 'Penjamin', 'Carimbo (印鑑)'],
    },
    en: {
      locale: 'en-US',
      title: 'PRIVATE USED VEHICLE PURCHASE AND SALE AGREEMENT',
      sellerLabel: 'Company (Seller)',
      buyerLabel: 'BUYER',
      generatedAtLabel: 'Generated at',
      paymentHeaders: ['INSTALLMENT', 'DATE', 'AMOUNT', 'PENALTY'],
      intro: 'The parties hereby fairly agree to this private used vehicle purchase and sale agreement under the clauses below.',
      clauses: enClauses,
      labels: {
        total: 'Total Price',
        sinal: 'Down Payment',
        parcelas: 'Installments',
        localDate: 'City/Date',
        companyLicense: 'Company License',
        cnh: "Driver's License (CNH)",
        endereco: 'Address',
        telefone: 'Phone',
      },
      signatures: ['Company (Seller)', 'Buyer', 'Guarantor', 'Carimbo (印鑑)'],
    },
  };

  return templates[language] || templates.pt;
}

function buildInstallmentRows(payment, locale) {
  return payment.installments
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.numero)}</td>
          <td>${escapeHtml(toDate(item.data, locale))}</td>
          <td class="text-right">${escapeHtml(formatCurrency(item.valor))}</td>
          <td>${escapeHtml(item.multa)}</td>
        </tr>
      `;
    })
    .join('');
}

function buildLanguageSection(template, payload, language, isLastLanguage, logoSrc) {
  const locale = LANGUAGE_LOCALES[language] || 'pt-BR';
  const generatedAt = new Date().toLocaleString(locale);
  const cliente = payload.cliente || {};

  const empresaNome = safeField(payload.configuracao?.nomeEmpresa || 'Hirata Cars Shop');
  const empresaTelefone = safeField(payload.configuracao?.telefone);
  const empresaLicenca = safeField(payload.configuracao?.numeroAutorizacao);
  const empresaEndereco = safeField(payload.configuracao?.endereco);
  const empresaNacionalidade = safeField(payload.configuracao?.nacionalidade);
  const empresaProfissao = safeField(payload.configuracao?.profissao);
  const empresaEstadoCivil = safeField(payload.configuracao?.estadoCivil);

  const compradorNome = safeField(cliente?.nome || payload.venda?.cliente_nome || 'Comprador');
  const compradorEndereco = safeField(cliente?.endereco);
  const compradorDoc = safeField(cliente?.cnh_number);
  const compradorTelefone = safeField(cliente?.telefone);
  const compradorNacionalidade = safeField(cliente?.nacionalidade);
  const compradorProfissao = safeField(cliente?.profissao);
  const compradorEstadoCivil = safeField(cliente?.estado_civil || cliente?.estadoCivil);
  const cidade = safeField(payload.configuracao?.cidadeContrato);

  const clausesHtml = template.clauses
    .map((clause) => {
      const paragraphs = clause.paragraphs
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');

      return `
        <section class="clause-block">
          <h3>${escapeHtml(clause.title)}</h3>
          ${paragraphs}
        </section>
      `;
    })
    .join('');

  const signaturesHtml = template.signatures
    .map((label) => {
      return `
        <div class="signature-item">
          <div class="signature-line"></div>
          <div class="signature-label">${escapeHtml(label)}</div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="contract-page ${isLastLanguage ? '' : 'page-break'}" lang="${escapeHtml(language)}">
      <header class="company-header">
        ${logoSrc ? `<img src="${logoSrc}" class="header-logo" alt="Hirata Cars" />` : ''}
        <h1>Hirata Cars Shop</h1>
        <p><strong>Telefone:</strong> ${escapeHtml(empresaTelefone)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>古物商許可:</strong> ${escapeHtml(empresaLicenca)}</p>
      </header>

      <h2 class="contract-title">${escapeHtml(template.title)}</h2>

      <section class="parties">
        <p><strong>${escapeHtml(template.sellerLabel)}:</strong> <strong>${escapeHtml(empresaNome)}</strong></p>
        <p><strong>${escapeHtml(empresaNacionalidade)}</strong> | <strong>${escapeHtml(empresaProfissao)}</strong> | <strong>${escapeHtml(empresaEstadoCivil)}</strong></p>
        <p>${escapeHtml(template.labels.companyLicense)}: <strong>${escapeHtml(empresaLicenca)}</strong> | ${escapeHtml(template.labels.endereco)}: <strong>${escapeHtml(empresaEndereco)}</strong></p>
        <p><strong>${escapeHtml(template.buyerLabel)}:</strong> <strong>${escapeHtml(compradorNome)}</strong></p>
        <p><strong>${escapeHtml(compradorNacionalidade)}</strong> | <strong>${escapeHtml(compradorProfissao)}</strong> | <strong>${escapeHtml(compradorEstadoCivil)}</strong></p>
        <p>${escapeHtml(template.labels.cnh)}: <strong>${escapeHtml(compradorDoc)}</strong> | ${escapeHtml(template.labels.endereco)}: <strong>${escapeHtml(compradorEndereco)}</strong></p>
        <p>${escapeHtml(template.labels.telefone)}: <strong>${escapeHtml(compradorTelefone)}</strong></p>
      </section>

      <p class="intro">${escapeHtml(template.intro)}</p>

      <section class="vehicle-box">
        <p><strong>Veículo:</strong> <strong>${escapeHtml(payload.veiculo.fabricante)}</strong> | <strong>${escapeHtml(payload.veiculo.modelo)}</strong> | <strong>${escapeHtml(payload.veiculo.ano)}</strong></p>
        <p><strong>Chassi:</strong> <strong>${escapeHtml(payload.veiculo.chassi)}</strong> &nbsp;&nbsp; <strong>Placa:</strong> <strong>${escapeHtml(payload.veiculo.placa)}</strong> &nbsp;&nbsp; <strong>KM:</strong> <strong>${escapeHtml(payload.veiculo.km)}</strong></p>
      </section>

      ${clausesHtml}

      <section class="payment-summary">
        <p><strong>${escapeHtml(template.labels.total)}:</strong> <strong>${escapeHtml(formatCurrency(payload.pagamento.total))}</strong></p>
        <p><strong>${escapeHtml(template.labels.sinal)}:</strong> <strong>${escapeHtml(formatCurrency(payload.pagamento.sinal))}</strong></p>
        <p><strong>${escapeHtml(template.labels.parcelas)}:</strong> <strong>${escapeHtml(payload.pagamento.totalParcelas)} x ${escapeHtml(formatCurrency(payload.pagamento.valorParcela))}</strong></p>
      </section>

      <table class="installments-table" aria-label="Tabela financeira de parcelas">
        <thead>
          <tr>
            ${template.paymentHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${buildInstallmentRows(payload.pagamento, locale)}
        </tbody>
      </table>

      <footer class="contract-footer">
        <p><strong>${escapeHtml(template.labels.localDate)}:</strong> ${escapeHtml(cidade)}, ${escapeHtml(toDate(new Date(), locale))}</p>
        <div class="signature-grid">
          ${signaturesHtml}
        </div>
        <p class="generated-at">${escapeHtml(template.generatedAtLabel)}: ${escapeHtml(generatedAt)}</p>
      </footer>
    </section>
  `;
}

function getLogoBase64() {
  try {
    const logoPath = path.resolve(__dirname, '../../../src/assets/Hirata Logo.svg');
    const base64 = fs.readFileSync(logoPath).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return '';
  }
}

function buildContractHtml({ idiomas = ['pt', 'ja'], payload }) {
  const selectedLanguages = Array.isArray(idiomas) && idiomas.length > 0 ? idiomas : ['pt', 'ja'];
  const logoSrc = getLogoBase64();

  const sections = selectedLanguages
    .map((language, index) => {
      const template = contractTemplateByLanguage(language);
      return buildLanguageSection(template, payload, language, index === selectedLanguages.length - 1, logoSrc);
    })
    .join('');

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
        <title>Contrato de Compra e Venda</title>
        <style>
          @page {
            size: A4;
            margin: 18mm 14mm 18mm 14mm;
          }

          * {
            box-sizing: border-box;
            font-family: 'Noto Sans JP', sans-serif !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            color: #111;
            font-size: 12px;
            line-height: 1.45;
            font-family: 'Noto Sans JP', 'Noto Sans CJK JP', 'Noto Sans', 'Segoe UI', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }

          .contract-page {
            width: 100%;
          }

          .page-break {
            page-break-after: always;
          }

          .company-header {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          .header-logo {
            height: 60px;
            width: auto;
            display: block;
            margin: 0 auto 15px auto;
          }

          .company-header h1 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 0.3px;
            font-weight: 700;
          }

          .company-header p {
            margin: 4px 0 0;
            font-size: 12px;
          }

          .contract-title {
            text-align: center;
            margin: 8px 0 12px;
            font-size: 17px;
            font-weight: 700;
          }

          .parties,
          .vehicle-box,
          .payment-summary {
            border: 1px solid #cbd5e1;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
          }

          .parties p,
          .vehicle-box p,
          .payment-summary p,
          .intro,
          .clause-block p,
          .contract-footer p {
            margin: 0 0 6px;
            text-align: justify;
          }

          .intro {
            margin-bottom: 10px;
          }

          .clause-block {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }

          .clause-block h3 {
            margin: 0 0 6px;
            font-size: 13px;
            font-weight: 700;
          }

          .installments-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }

          .installments-table th,
          .installments-table td {
            border: 1px solid #334155;
            padding: 6px;
            font-size: 11px;
            vertical-align: top;
          }

          .installments-table th {
            background: #e2e8f0;
            text-align: left;
            font-weight: 700;
          }

          .text-right {
            text-align: right;
          }

          .contract-footer {
            margin-top: 14px;
            page-break-inside: avoid;
          }

          .signature-grid {
            display: flex;
            gap: 10px;
            margin-top: 80px;
            flex-wrap: nowrap;
            align-items: flex-end;
          }

          .signature-item {
            flex: 1;
            min-width: 0;
            text-align: center;
          }

          .signature-line {
            border-top: 1px solid #111;
            margin-bottom: 8px;
          }

          .signature-label {
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
          }

          .generated-at {
            margin-top: 8px;
            font-size: 10px;
            color: #334155;
          }
        </style>
      </head>
      <body>
        ${sections}
      </body>
    </html>
  `;
}

function buildPuppeteerLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return {
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=medium',
    ],
  };
}

async function generateContractPdfBuffer({ idiomas = ['pt', 'ja'], venda, cliente, veiculo, configuracao }) {
  const payload = {
    venda,
    cliente: cliente || {},
    configuracao,
    veiculo: getVehicleData(venda, veiculo),
    pagamento: buildInstallments(venda),
  };

  const html = buildContractHtml({ idiomas, payload });
  const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '14mm',
        right: '10mm',
        bottom: '14mm',
        left: '10mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateContractPdfBuffer,
};
