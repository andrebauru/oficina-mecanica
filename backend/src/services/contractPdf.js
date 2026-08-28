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
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['Reserva de Domínio e Proibição de Repasse: Sob o Código Civil Japonês (Minpo), o veículo permanecerá alienado à Hirata Cars Shop até a quitação integral. É proibido revender, alugar ou repassar a terceiros antes da quitação.']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['Atualização de Dados: O COMPRADOR obriga-se a informar qualquer alteração em seus dados pessoais.']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['Condição e Garantia: Veículo vendido "usado". Garantia de 3 meses exclusivamente para motor e câmbio.']
    },
    {
      title: '引渡後の責任および交通法規の遵守 / Responsabilidade e Leis de Trânsito',
      paragraphs: ['Responsabilidade e Leis de Trânsito: O COMPRADOR assume total responsabilidade por multas, acidentes ou danos após a entrega.']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['Apreensão e Custos: Se apreendido por infrações, o COMPRADOR será responsável por todos os custos de liberação.']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['Manutenção, Impostos e Shaken: Manutenção, seguro obrigatório, vistorias e impostos são de inteira responsabilidade do COMPRADOR.']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['Seguro Obrigatório (Nini Hoken): O COMPRADOR compromete-se a manter apólice de seguro opcional ativa.']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['Perda Total: Perda total por acidente ou negligência não isenta o COMPRADOR de quitar a dívida restante.']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['Atraso e Retomada: Inadimplência superior a 3 meses garante à Hirata Cars Shop o direito de retomada do veículo sem devolução de valores.']
    }
  ];

  const jaClauses = [
    {
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['所有権留保および譲渡等の禁止: 日本国民法に基づき、本契約の対象車両の所有権は、全額の支払いが完了するまでHirata Cars Shopに留保されます。買主は、代金の完済前に、車両の転売、貸与、譲渡、第三者への引き渡し、または国外への持ち出しを行うことを固く禁じられます。']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['登録情報の変更通知: 買主は、住所等の個人情報に変更があった場合、直ちに通知する義務を負います。']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['車両の現状および保証: 本契約の対象車両は「中古車」として現状渡しで販売されます。引き渡し日から3ヶ月間、エンジンおよびトランスミッションの機能的欠陥に限定して保証を提供します。']
    },
    {
      title: '引渡後の責任および交通法規 of 遵守 / Responsabilidade e Leis de Trânsito', // Custom override
      paragraphs: ['引渡後の責任および交通法規の遵守: 買主は、車両引き渡し日以降、交通違反、事故、または損害について全責任を負います。']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['車両の差し押さえと費用負担: 買主の違反等により当局に車両が差し押さえられた場合、一切の費用は買主が全額負担します。']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['維持管理、税金および車検: 本日以降、予防的整備、自賠責保険、車検、自動車税は、買主が全責任を負います。']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['任意保険への加入義務: 買主は、分割払いの期間中、任意保険に加入し維持することを約束します。']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['事故や過失による全損: 事故や「全損」となった場合でも、買主の支払い義務は免除されません。']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['支払遅延および車両の引き揚げ: 支払いが3ヶ月以上滞った場合、Hirata Cars Shopは事前の通知なく直ちに車両を引き揚げる権利を有し、返金は一切行われません。']
    }
  ];

  const enClauses = [
    {
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['Retention of Title and Prohibition of Transfer: Under the Japanese Civil Code (Minpo), the ownership of the target vehicle is retained by Hirata Cars Shop until full payment is completed. The Buyer is strictly prohibited from reselling, leasing, transferring, delivering to third parties, or exporting the vehicle before full payment.']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['Notification of Registration Info Changes: The Buyer is obligated to immediately notify of any changes to personal information such as address.']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['Vehicle Condition and Warranty: The target vehicle of this contract is sold "as-is" as a "used car". A warranty is provided for 3 months from the delivery date, limited to engine and transmission functional defects.']
    },
    {
      title: '引渡後の責任および交通法規の遵守 / Responsabilidade e Leis de Trânsito',
      paragraphs: ['Responsibility and Traffic Regulation Compliance after Delivery: The Buyer assumes full responsibility for traffic violations, accidents, or damages after the vehicle delivery date.']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['Vehicle Seizure and Cost Burden: If the vehicle is seized by authorities due to Buyer\'s violations or other issues, all costs shall be fully borne by the Buyer.']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['Maintenance, Taxes, and Shaken: From this day forward, preventive maintenance, compulsory vehicle liability insurance, shaken (vehicle inspection), and automobile taxes are the sole responsibility of the Buyer.']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['Obligation to Join Voluntary Insurance: The Buyer promises to join and maintain active voluntary insurance (Nini Hoken) during the installment payment period.']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['Total Loss due to Accident or Negligence: Even in case of accident or "total loss", the Buyer\'s payment obligation is not waived.']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['Payment Delay and Vehicle Repossession: If payment is in arrears for 3 months or more, Hirata Cars Shop has the right to immediately repossess the vehicle without prior notice, and no refunds will be made.']
    }
  ];

  const filClauses = [
    {
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['Pagpapanatili ng Titulo at Pagbabawal sa Paglipat: Sa ilalim ng Japanese Civil Code (Minpo), ang pagmamay-ari ng sasakyan ay mananatili sa Hirata Cars Shop hanggang sa buong pagbabayad. Mahigpit na ipinagbabawal sa Mamimili ang muling pagbebenta, pagpapaupa, paglilipat, o pagdadala sa labas ng bansa bago ang quitação.']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['Abiso sa Pagbabago ng Impormasyon: Ang Mamimili ay obligadong ipagbigay-alam agad ang anumang pagbabago sa personal na impormasyon tulad ng address.']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['Kondisyon at Garantiya ng Sasakyan: Ang sasakyan ay ibinebenta nang "used" o gamit na. May garantiya na 3 buwan eksklusibo para sa makina at kambyo.']
    },
    {
      title: '引渡後の責任および交通法規の遵守 / Responsabilidade e Leis de Trânsito',
      paragraphs: ['Responsibilidad at Batas sa Trapiko: Ang Mamimili ay may buong responsibilidad sa mga multa, aksidente, o pinsala pagkatapos ng turnover.']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['Pagsamsam at Gastusin: Kung ang sasakyan ay samsamin ng mga awtoridad dahil sa mga paglabag ng Mamimili, ang lahat ng gastos ay babacatin ng Mamimili.']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['Pagpapanatili, Buwis, at Shaken: Ang pagpapanatili, compulsory insurance, shaken (inspeksyon), at mga buwis ay buong responsibilidad ng Mamimili.']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['Obligasyon sa Seguro (Nini Hoken): Ang Mamimili ay nangangakong kukuha at magpapanatili ng insurance (Nini Hoken) sa panahon ng paghuhulog.']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['Total Loss: Ang total loss dahil sa aksidente o kapabayaan ay hindi nagpapawalang-bisa sa obligasyon ng Mamimili na bayaran ang natitirang utang.']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['Pagkaantala at Pagsamsam: Ang pagkaantala ng 3 buwan o higit pa ay nagbibigay-daan sa Hirata Cars Shop na bawiin ang sasakyan nang walang abiso at walang ibabalik na bayad.']
    }
  ];

  const viClauses = [
    {
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['Bảo Lưu Quyền Sở Hữu và Cấm Chuyển Nhượng: Theo Bộ luật Dân sự Nhật Bản (Minpo), quyền sở hữu xe sẽ được bảo lưu cho Hirata Cars Shop cho đến khi thanh toán đầy đủ. Người mua nghiêm cấm bán lại, cho thuê, chuyển nhượng hoặc mang xe ra nước ngoài trước khi thanh toán xong.']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['Thông Báo Thay Đổi Thông Tin Đăng Ký: Người mua có nghĩa vụ thông báo ngay lập tức nếu có thay đổi về thông tin cá nhân như địa chỉ.']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['Tình Trạng Xe và Bảo Hành: Xe được bán dưới dạng "xe cũ" theo hiện trạng. Bảo hành 3 tháng kể từ ngày bàn giao, giới hạn ở lỗi chức năng động cơ và hộp số.']
    },
    {
      title: '引渡後の責任および交通法規の遵守 / Responsabilidade e Leis de Trânsito',
      paragraphs: ['Trách Nhiệm và Tuân Thủ Luật Giao Thông Sau Bàn Giao: Người mua chịu toàn bộ trách nhiệm về vi phạm giao thông, tai nạn hoặc thiệt hại sau ngày nhận xe.']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['Tịch Thu Xe và Chi Phí Phát Sinh: Nếu xe bị cơ quan chức năng tịch thu do vi phạm của người mua, người mua phải chịu toàn bộ chi phí giải phóng xe.']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['Bảo Dưỡng, Thuế và Shaken: Kể từ hôm nay, bảo dưỡng định kỳ, bảo hiểm bắt buộc, shaken và thuế ô tô hoàn toàn thuộc trách nhiệm của người mua.']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['Nghĩa Vụ Tham Gia Bảo Hiểm Tự Nguyện: Người mua cam kết duy trì bảo hiểm tự nguyện hoạt động trong suốt thời gian trả góp.']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['Tổn Thất Toàn Bộ do Tai Nạn hoặc Sơ Suất: Ngay cả khi xảy ra tai nạn hoặc "tổn thất toàn bộ", nghĩa vụ thanh toán của người mua vẫn không được miễn trừ.']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['Chậm Thanh Toán và Thu Hồi Xe: Nếu chậm thanh toán từ 3 tháng trở lên, Hirata Cars Shop có quyền thu hồi xe ngay lập tức mà không cần báo trước và không hoàn trả tiền.']
    }
  ];

  const idClauses = [
    {
      title: '所有権留保および譲渡等の禁止 / Reserva de Domínio e Proibição de Repasse',
      paragraphs: ['Reservasi Kepemilikan dan Larangan Pengalihan: Berdasarkan Hukum Perdata Jepang (Minpo), kepemilikan kendaraan tetap di bawah Hirata Cars Shop hingga pelunasan penuh. Pembeli dilarang keras menjual kembali, menyewakan, atau mengalihkan sebelum pelunasan.']
    },
    {
      title: '登録情報の変更通知 / Atualização de Dados',
      paragraphs: ['Pemberitahuan Perubahan Informasi: Pembeli wajib segera memberitahukan perubahan informasi pribadi seperti alamat.']
    },
    {
      title: '車両の現状および保証 / Condição e Garantia',
      paragraphs: ['Kondisi dan Garansi: Kendaraan dijual sebagai "mobil bekas" apa adanya. Garansi 3 bulan terbatas untuk mesin dan transmisi sejak serah terima.']
    },
    {
      title: '引渡後の責任および交通法規の遵守 / Responsabilidade e Leis de Trânsito',
      paragraphs: ['Tanggung Jawab dan Hukum Lalu Lintas: Pembeli bertanggung jawab penuh atas pelanggaran lalu lintas, kecelakaan, atau kerusakan setelah serah terima.']
    },
    {
      title: '車両の差し押さえと費用負担 / Apreensão e Custos',
      paragraphs: ['Penyitaan dan Biaya: Jika kendaraan disita oleh pihak berwenang karena pelanggaran Pembeli, semua biaya ditanggung oleh Pembeli.']
    },
    {
      title: '維持管理、税金および車検 / Manutenção, Impostos e Shaken',
      paragraphs: ['Pemeliharaan, Pajak, dan Shaken: Pemeliharaan, asuransi wajib, shaken (inspeksi), dan pajak kendaraan menjadi tanggung jawab penuh Pembeli.']
    },
    {
      title: '任意保険への加入義務 / Seguro Obrigatório (Nini Hoken)',
      paragraphs: ['Kewajiban Asuransi (Nini Hoken): Pembeli berjanji untuk memiliki asuransi opsional (Nini Hoken) selama periode cicilan.']
    },
    {
      title: '事故や過失による全損 / Perda Total',
      paragraphs: ['Kerugian Total: Kerugian total akibat kecelakaan atau kelalaian tidak membebaskan Pembeli dari kewajiban melunasi sisa utang.']
    },
    {
      title: '支払遅延および車両の引き揚げ / Atraso e Retomada',
      paragraphs: ['Keterlambatan dan Penarikan: Keterlambatan pembayaran selama 30 hari atau lebih memberikan hak kepada Hirata Cars Shop untuk menarik kendaraan tanpa pemberitahuan dan tanpa pengembalian uang.']
    }
  ];

  const templates = {
    pt: {
      locale: 'pt-BR',
      title: 'CONTRATO DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR',
      sellerLabel: 'Vendedor',
      buyerLabel: 'Comprador',
      generatedAtLabel: 'Gerado em',
      intro: 'Por estarem acordados, assinam o presente contrato particular sob as cláusulas abaixo.',
      clauses: basePtClauses,
      labels: {
        total: 'Valor Total',
        sinal: 'Entrada/Sinal',
        parcelas: 'Valor da Parcela',
        localDate: 'Cidade/Data',
        companyLicense: 'Licença da Empresa',
        cnh: 'CNH',
        endereco: 'Endereço',
        telefone: 'Telefone',
      },
    },
    ja: {
      locale: 'ja-JP',
      title: '自動車売買契約書',
      sellerLabel: '売主',
      buyerLabel: '買主',
      generatedAtLabel: '作成日時',
      intro: '当事者は、以下の条項に従い、自動車売買契約を締結します。',
      clauses: jaClauses,
      labels: {
        total: '売買総額',
        sinal: '頭金（支払済金額）',
        parcelas: '月々の支払額',
        localDate: '作成地/日付',
        companyLicense: '古物商許可',
        cnh: '運転免許証 (CNH)',
        endereco: '住所',
        telefone: '電話',
      },
    },
    en: {
      locale: 'en-US',
      title: 'VEHICLE PURCHASE AND SALE AGREEMENT',
      sellerLabel: 'Seller',
      buyerLabel: 'Buyer',
      generatedAtLabel: 'Generated at',
      intro: 'The parties hereby agree to this purchase and sale agreement under the clauses below.',
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
    },
    fil: {
      locale: 'fil-PH',
      title: 'KONTRATA NG BILIHAN NG SASAKYAN',
      sellerLabel: 'Nagbebenta',
      buyerLabel: 'Mamimili',
      generatedAtLabel: 'Nabuo noong',
      intro: 'Ang mga panig ay sumasang-ayon sa kontratang ito sa ilalim ng mga sugnay sa ibaba.',
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
    },
    vi: {
      locale: 'vi-VN',
      title: 'HỢP ĐỒNG MUA BÁN XE Ô TÔ',
      sellerLabel: 'Người bán',
      buyerLabel: 'Bên mua',
      generatedAtLabel: 'Tạo lúc',
      intro: 'Các bên thống nhất ký kết hợp đồng mua bán xe với các điều khoản dưới đây.',
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
    },
    id: {
      locale: 'id-ID',
      title: 'PERJANJIAN JUAL BELI MOBIL',
      sellerLabel: 'Penjual',
      buyerLabel: 'Pembeli',
      generatedAtLabel: 'Dibuat pada',
      intro: 'Para pihak sepakat menandatangani perjanjian jual beli mobil ini.',
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
    },
  };

  return templates[language] || templates.pt;
}

function buildInstallmentDetailList(pagamento, secLocale) {
  if (!pagamento?.installments?.length) return '';
  const rows = pagamento.installments.map((item) => {
    const rawDate = new Date(item.data);
    const yyyy = rawDate.getFullYear();
    const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
    const dd = String(rawDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}/${mm}/${dd}`;
    const value = formatCurrency(item.valor);
    return `
      <div class="installment-item-line" style="margin-bottom: 4px;">
        第${item.numero}回 / Parcela ${item.numero} - ${value} - 期日 / Venc.: ${dateStr}
      </div>`;
  }).join('');
  return `
    <div class="installment-detail" style="margin-top: 8px; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 4px;">
      ${rows}
    </div>`;
}

function buildBlankInstallmentLines() {
  const rows = [1, 2, 3].map((n) => `
      <div class="installment-item-line" style="margin-bottom: 4px;">
        第${n}回 / Parcela ${n} - ¥ ______________________ - 期日 / Venc.: ____/___/___
      </div>`).join('');
  return `
    <div class="installment-detail" style="margin-top: 8px; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 4px;">
      ${rows}
    </div>`;
}

function buildBilingualSection(jaTemplate, secTemplate, payload, isBlank, logoSrc) {
  const locale = secTemplate.locale || 'pt-BR';
  const generatedAt = new Date().toLocaleString(locale);
  const cliente = payload.cliente || {};

  const B = (v) => isBlank ? BLANK_FIELD : escapeHtml(safeField(v));

  const empresaNome = escapeHtml(safeField(payload.configuracao?.nomeEmpresa || 'Hirata Cars Shop'));
  const empresaTelefone = escapeHtml(safeField(payload.configuracao?.telefone));
  const empresaLicenca = escapeHtml(safeField(payload.configuracao?.numeroAutorizacao));
  const empresaEndereco = escapeHtml(safeField(payload.configuracao?.endereco));
  const cidade = escapeHtml(safeField(payload.configuracao?.cidadeContrato || 'Tsu'));

  const compradorNome = B(cliente?.nome || payload.venda?.cliente_nome);
  const compradorEndereco = B(cliente?.endereco || payload.venda?.cliente_endereco);
  const compradorDoc = B(cliente?.cnh_number || cliente?.cnh);
  const compradorTelefone = B(cliente?.telefone || payload.venda?.cliente_telefone);

  const v = payload.veiculo || {};
  const vFab = isBlank ? BLANK_FIELD : escapeHtml(v.fabricante || '');
  const vMod = isBlank ? BLANK_FIELD : escapeHtml(v.modelo || '');
  const vAno = isBlank ? BLANK_FIELD : escapeHtml(v.ano || '');
  const vChassi = isBlank ? BLANK_FIELD : escapeHtml(v.chassi || '');
  const vPlaca = isBlank ? BLANK_FIELD : escapeHtml(v.placa || '');
  const vKm = isBlank ? BLANK_FIELD : escapeHtml(v.km || '');

  const pag = payload.pagamento || {};
  const totalAmt = isBlank ? BLANK_FIELD : escapeHtml(formatCurrency(pag.total || 0));
  const sinalAmt = isBlank ? BLANK_FIELD : escapeHtml(formatCurrency(pag.sinal || 0));
  const nParcelas = isBlank ? '___' : escapeHtml(String(pag.totalParcelas || 0));
  const parcVal = isBlank ? BLANK_FIELD : escapeHtml(formatCurrency(pag.valorParcela || 0));

  const clausesHtml = jaTemplate.clauses.map((jaClause, idx) => {
    const secClause = secTemplate.clauses[idx] || jaClause;
    const jaParagraphs = jaClause.paragraphs.map(p => `<p class="ja-line">${escapeHtml(p)}</p>`).join('');
    const secParagraphs = secClause.paragraphs.map(p => `<p class="sec-line">${escapeHtml(p)}</p>`).join('');
    return `
      <section class="clause-block" style="margin-bottom: 12px; page-break-inside: avoid;">
        <h3 class="ja-line" style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700;">${escapeHtml(jaClause.title)}</h3>
        <h3 class="sec-line" style="margin: 0 0 6px 0; font-size: 11px; font-weight: 500; border-left: none; padding-left: 0;">${escapeHtml(secClause.title)}</h3>
        ${jaParagraphs}
        ${secParagraphs}
      </section>
    `;
  }).join('');

  const signaturesHtml = `
    <div class="signature-section" style="display: flex; justify-content: space-around; gap: 40px; margin-top: 40px;">
      <div class="signature-item-explicit" style="flex: 1; text-align: center;">
        <div class="signature-underline" style="border-bottom: 1px solid #111; width: 100%; height: 35px; margin-bottom: 8px;"></div>
        <p class="signature-label-bilingual">
          <span class="ja-line">販売者（署名・印鑑）</span><br/>
          <span class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">VENDEDOR (Assinatura e Carimbo)</span>
        </p>
      </div>
      <div class="signature-item-explicit" style="flex: 1; text-align: center;">
        <div class="signature-underline" style="border-bottom: 1px solid #111; width: 100%; height: 35px; margin-bottom: 8px;"></div>
        <p class="signature-label-bilingual">
          <span class="ja-line">買主（署名・印鑑）</span><br/>
          <span class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">COMPRADOR (Assinatura e Carimbo)</span>
        </p>
      </div>
    </div>
  `;

  const installmentDetail = isBlank
    ? buildBlankInstallmentLines()
    : buildInstallmentDetailList(pag, secTemplate.locale);

  return `
    <section class="contract-page">
      <div class="bilingual-title-block">
        <h1 class="contract-title ja-line">自動車売買契約書</h1>
        <h2 class="contract-title sec-line" style="border-left: none; padding-left: 0;">${escapeHtml(secTemplate.title)}</h2>
      </div>

      <!-- Section 1: Parties -->
      <section class="section">
        <div class="section-title">1. 契約当事者 / 1. PARTES CONTRATANTES</div>
        <div class="grid-2" style="display: flex; gap: 20px;">
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">売主 (Vendedor): <strong>${empresaNome}</strong></p>
              <p class="sec-line">Endereço: ${empresaEndereco} &nbsp;|&nbsp; Licença Kobutsu-sho: ${empresaLicenca} &nbsp;|&nbsp; Tel: ${empresaTelefone}</p>
            </div>
          </div>
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">買主 (Comprador): <strong>${compradorNome}</strong></p>
              <p class="sec-line">Endereço: ${compradorEndereco} &nbsp;|&nbsp; CNH: ${compradorDoc} &nbsp;|&nbsp; Tel: ${compradorTelefone}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Vehicle -->
      <section class="section">
        <div class="section-title">2. 売買物件 (車両) / 2. OBJETO DO CONTRATO (VEÍCULO)</div>
        <div class="grid-2" style="display: flex; gap: 20px;">
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">メーカー・モデル / Marca/Modelo: <strong>${vFab} ${vMod}</strong></p>
              <p class="ja-line">年式 / Ano: <strong>${vAno}</strong></p>
            </div>
          </div>
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">ナンバープレート / Placa: <strong>${vPlaca}</strong></p>
              <p class="ja-line">車台番号 / Chassi: <strong>${vChassi}</strong> &nbsp;|&nbsp; 走行距離 / KM: <strong>${vKm}</strong></p>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 3: Price & Payment -->
      <section class="section">
        <div class="section-title">3. 売買代金および支払方法 / 3. VALOR E FORMA DE PAGAMENTO</div>
        <div class="grid-2" style="display: flex; gap: 20px; margin-bottom: 8px;">
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">売買総額 / Valor Total: <strong>${totalAmt}</strong></p>
              <p class="ja-line">頭金（支払済金額） / Entrada/Sinal: <strong>${sinalAmt}</strong></p>
            </div>
          </div>
          <div class="grid-col" style="flex: 1;">
            <div class="info-row">
              <p class="ja-line">分割回数 / Parcelas: <strong>${nParcelas}</strong></p>
              <p class="ja-line">月々の支払額 / Valor da Parcela: <strong>${parcVal}</strong></p>
            </div>
          </div>
        </div>
        ${installmentDetail}
      </section>

      <!-- Section 4: Clauses -->
      <section class="section">
        <div class="section-title">4. 一般条項および特約事項 / 4. TERMOS E CONDIÇÕES GERAIS</div>
        ${clausesHtml}
      </section>

      <!-- Section 5: Signature / Date -->
      <section class="section" style="page-break-inside: avoid;">
        <div class="section-title">5. 署名捺印 / 5. FORO E ASSINATURAS</div>
        <div style="text-align: center; margin-bottom: 15px;">
          <p class="ja-line">両当事者は、上記の内容を正当に合意し同文の契約書を作成します。</p>
          <p class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">Por estarem de acordo, assinam o presente instrumento.</p>
        </div>
        <p><strong>作成地・日付 / Local e Data:</strong> ${cidade}, ${escapeHtml(toDate(new Date(), locale))}</p>
        ${signaturesHtml}
      </section>
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

function buildContractHtml({ idiomas = ['pt', 'ja'], payload, isBlank = false }) {
  const secondaryLang = (Array.isArray(idiomas) ? idiomas : [idiomas])
    .find((l) => l !== 'ja') || 'pt';

  const jaTemplate = contractTemplateByLanguage('ja');
  const secTemplate = contractTemplateByLanguage(secondaryLang);
  const logoSrc = getLogoBase64();
  const section = buildBilingualSection(jaTemplate, secTemplate, payload, isBlank, logoSrc);

  return `
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
        <title>Contrato de Compra e Venda</title>
        <style>
          @page {
            size: A4;
            margin: 25mm 14mm 20mm 14mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Noto Sans JP', sans-serif !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            color: #111;
            font-size: 11px;
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
          }
          .contract-page {
            width: 100%;
          }
          .bilingual-title-block {
            text-align: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .contract-title {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
          }
          .contract-title.sec-line {
            font-size: 13px;
            color: #374151;
            font-weight: 500;
            margin-top: 2px;
          }
          .section {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            page-break-inside: avoid;
          }
          .section-title {
            font-weight: 700;
            font-size: 12px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 6px;
            color: #1e293b;
          }
          .ja-line {
            font-weight: 600;
            color: #111;
            margin: 0 0 1px 0;
          }
          .sec-line {
            color: #4b5563;
            font-style: italic;
            margin: 0 0 4px 0;
            padding-left: 6px;
            border-left: 2px solid #cbd5e1;
          }
          .clause-block {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .clause-block p.ja-line {
            margin-bottom: 2px;
          }
          .clause-block p.sec-line {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        ${section}
      </body>
    </html>
  `;
}

// ─── Carnê de Parcelas ──────────────────────────────────────────────────────
/**
 * Gera o bloco HTML do carnê de parcelas.
 * Recebe um array de objetos { numero, data_vencimento (Date|string), valor }.
 * Retorna uma string HTML que começa com page-break-before:always para
 * ser concatenada diretamente ao HTML do contrato antes do </body>.
 */
function buildCarneHtml(parcelas, clienteNome, veiculoInfo) {
  if (!Array.isArray(parcelas) || parcelas.length === 0) return '';

  const currency = (v) =>
    new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(v || 0));

  const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('pt-BR');
  };

  const rows = parcelas
    .map(
      (p, i) => `
        <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : 'background:#fff;'}">
          <td style="padding:6px 8px; text-align:center; font-weight:700;">${p.numero}</td>
          <td style="padding:6px 8px; text-align:center;">${fmtDate(p.data_vencimento)}</td>
          <td style="padding:6px 8px; text-align:right; font-weight:600;">${currency(p.valor)}</td>
          <td style="padding:6px 8px; text-align:center;">
            <span style="
              display:inline-block;
              width:14px; height:14px;
              border:2px solid #374151;
              border-radius:2px;
              vertical-align:middle;
              margin-right:5px;
            "></span>
            Pago
          </td>
          <td style="padding:6px 8px;"></td>
        </tr>`
    )
    .join('');

  return `
    <div style="
      page-break-before: always;
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 11px;
      color: #111;
      padding: 0;
    ">
      <!-- Cabeçalho do Carnê -->
      <div style="
        text-align: center;
        border-bottom: 3px solid #1e293b;
        padding-bottom: 8px;
        margin-bottom: 14px;
      ">
        <p style="margin:0; font-size:16px; font-weight:700;">分割払い手帳 / Carnê de Parcelas</p>
        <p style="margin:4px 0 0; font-size:11px; color:#374151;">
          Cliente: <strong>${escapeHtml(clienteNome || '—')}</strong>
          &nbsp;|&nbsp;
          Veículo: <strong>${escapeHtml(veiculoInfo || '—')}</strong>
        </p>
      </div>

      <!-- Tabela de Parcelas -->
      <table style="
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        overflow: hidden;
      ">
        <thead>
          <tr style="background:#1e293b; color:#fff;">
            <th style="padding:7px 8px; text-align:center; font-size:11px;">Nº</th>
            <th style="padding:7px 8px; text-align:center; font-size:11px;">Vencimento / 支払期日</th>
            <th style="padding:7px 8px; text-align:right;  font-size:11px;">Valor / 金額</th>
            <th style="padding:7px 8px; text-align:center; font-size:11px;">Situação / 状況</th>
            <th style="padding:7px 8px; text-align:left;   font-size:11px;">Assinatura / 署名</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Rodapé do Carnê -->
      <p style="margin-top:14px; font-size:9px; color:#6b7280; text-align:center;">
        Este carnê é um documento auxiliar. O contrato de compra e venda prevalece em caso de divergência.
        / このカルネは補助書類です。相違がある場合は売買契約書が優先されます。
      </p>
    </div>
  `;
}
// ─────────────────────────────────────────────────────────────────────────────

function buildPuppeteerLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return {
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--font-render-hinting=medium',
    ],
  };
}

/**
 * @param {object} opts
 * @param {string[]}  opts.idiomas
 * @param {boolean}   opts.isBlank
 * @param {object}    opts.venda
 * @param {object}    opts.cliente
 * @param {object}    opts.documento
 * @param {object}    opts.veiculo
 * @param {object}    opts.configuracao
 * @param {Array}     [opts.parcelasParaCarne]  Array de { numero, data_vencimento, valor }
 *                                              Se fornecido e não-vazio, uma página extra de
 *                                              carnê será acrescentada ao PDF.
 */
async function generateContractPdfBuffer({ idiomas = ['pt', 'ja'], isBlank = false, venda, cliente, documento, veiculo, configuracao, parcelasParaCarne }) {
  const payload = {
    venda: venda || {},
    cliente: cliente || {},
    documento: documento || null,
    configuracao: configuracao || {},
    veiculo: isBlank
      ? { fabricante: '', modelo: '', ano: '', chassi: '', placa: '', km: '' }
      : getVehicleData(venda, veiculo),
    pagamento: isBlank
      ? { total: 0, sinal: 0, restante: 0, totalParcelas: 0, valorParcela: 0, installments: [] }
      : buildInstallments(venda),
  };

  // Monta HTML base do contrato e, se houver parcelas, injeta o carnê antes de </body>
  const contractHtml = buildContractHtml({ idiomas, payload, isBlank });
  const clienteNome   = cliente?.nome || venda?.cliente_nome || '';
  const veiculoInfo   = `${venda?.fabricante || veiculo?.marca || ''} ${venda?.modelo || veiculo?.modelo || ''} ${venda?.ano || veiculo?.ano || ''}`.trim();
  const carneBloco    = (!isBlank && Array.isArray(parcelasParaCarne) && parcelasParaCarne.length > 0)
    ? buildCarneHtml(parcelasParaCarne, clienteNome, veiculoInfo)
    : '';

  // Injeta o bloco do carnê imediatamente antes de </body>
  const html = carneBloco
    ? contractHtml.replace('</body>', `${carneBloco}</body>`)
    : contractHtml;
  const logoSrc = getLogoBase64();
  const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0 10mm; font-family: sans-serif;">
          <img src="${logoSrc}" style="max-height: 40px; width: auto;" />
          <span style="color: #666;">Hirata Cars Shop</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 9px; width: 100%; text-align: center; font-family: sans-serif; color: #444;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '20mm',
        right: '10mm',
        bottom: '15mm',
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
