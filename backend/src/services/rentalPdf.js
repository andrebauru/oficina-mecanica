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

function getLogoBase64() {
  try {
    const logoPath = path.resolve(__dirname, '../../../src/assets/Hirata Logo.svg');
    const base64 = fs.readFileSync(logoPath).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return '';
  }
}

const RENTAL_LANGUAGES = {
  pt: {
    locale: 'pt-BR',
    title: 'CERTIFICADO DE LOCAÇÃO DE VEÍCULO E TERMOS DE USO',
    userTitle: '1. DADOS DO LOCATÁRIO E DO USUÁRIO',
    vehTitle: '2. DADOS DO VEÍCULO E DA LOCAÇÃO',
    termsTitle: '3. TERMOS E CONDIÇÕES',
    signatureTitle: '4. CONFIRMAÇÃO E ASSINATURAS',
    labels: {
      name: 'Nome',
      address: 'Endereço',
      phone: 'Telefone',
      cnh: 'Nº Habilitação',
      model: 'Modelo',
      plate: 'Placa',
      exitDate: 'Data/Hora Saída',
      returnDate: 'Data/Hora Retorno',
      km: 'Km',
      fuel: 'Combustível',
      signatureClient: 'Assinatura do Cliente',
      signatureHirata: 'Hirata Cars Shop (Assinatura e Carimbo)',
    },
    terms: [
      {
        jp: '本証の携行: 貸渡中は必ず本証をご携帯ください。',
        sec: 'Porte Obrigatório: Este certificado deve ser mantido no veículo durante a locação e apresentado se solicitado.',
      },
      {
        jp: 'ノンオペレーションチャージ (NOC): 万一事故を起こされ車両が使用できなくなった場合は、休業補償として以下の金額をご請求させていただきます。自走可能で店舗へ返却された場合：5万円。自走不可能となった場合（レッカー移動等）：10万円。',
        sec: 'Taxa de Não Operação (NOC): Em caso de acidente que impossibilite o uso do veículo, será cobrado: Se puder rodar até a loja: ¥ 50.000. Se não puder rodar (guincho): ¥ 100.000.',
      },
      {
        jp: '事故時の対応: 事故発生時は速やかに警察及び当社への連絡をお願いします (090-4255-0003)。',
        sec: 'Procedimento em Acidentes: Em caso de acidente, contate imediatamente a Polícia e a nossa loja.',
      },
      {
        jp: '保険の優先適用: お客様ご加入の自動車保険（他車運転危険担保特約）にて賠償を優先させていただきます。',
        sec: 'Prioridade de Seguro: Caso possua seguro automotivo próprio com cláusula de "condução de veículos de terceiros", este será acionado prioritariamente.',
      },
      {
        jp: '補償の適用外: 故意の事故、タイヤ単独の損害（パンク・バースト）、車内装備の汚損、第三者への又貸し等は補償対象外です。',
        sec: 'Exclusões: Não cobrimos danos intencionais, furos em pneus, sujeira/danos no interior e sublocação a terceiros.',
      },
      {
        jp: '駐車違反金: 放置駐車違反の標章を取り付けられた場合、直ちに管轄警察署へ出頭し反則金をお支払いください。',
        sec: 'Multas de Estacionamento: Caso seja autuado por estacionamento proibido, apresente-se à delegacia indicada e pague a multa imediatamente.',
      }
    ],
    agreement: {
      jp: '以上の内容、および車両の現状を確認し、同意のうえ車両を借受けます。',
      sec: 'Ao assinar abaixo, concordo com os Termos e Condições e confirmo as condições do veículo.',
    }
  },
  en: {
    locale: 'en-US',
    title: 'VEHICLE RENTAL CERTIFICATE AND TERMS OF USE',
    userTitle: '1. DADOS DO LOCATÁRIO E DO USUÁRIO / 1. LESSEE & USER INFORMATION',
    vehTitle: '2. DADOS DO VEÍCULO E DA LOCAÇÃO / 2. VEHICLE & RENTAL DETAILS',
    termsTitle: '3. TERMOS E CONDIÇÕES / 3. TERMS & CONDITIONS',
    signatureTitle: '4. CONFIRMAÇÃO E ASSINATURAS / 4. CONFIRMATION & SIGNATURES',
    labels: {
      name: 'Nome / Name',
      address: 'Endereço / Address',
      phone: 'Telefone / Phone',
      cnh: 'Nº Habilitação / License No.',
      model: 'Modelo / Model',
      plate: 'Placa / License Plate',
      exitDate: 'Data/Hora Saída / Departure Date & Time',
      returnDate: 'Data/Hora Retorno / Return Date & Time',
      km: 'Km / Mileage',
      fuel: 'Combustível / Fuel Level',
      signatureClient: 'Assinatura do Cliente / Lessee Signature',
      signatureHirata: 'Hirata Cars Shop (Signature & Hanko)',
    },
    terms: [
      {
        jp: '本証の携行: 貸渡中は必ず本証をご携帯ください。',
        sec: 'Obligatory Carrying: This certificate must be kept in the vehicle during the rental period and presented if requested.',
      },
      {
        jp: 'ノンオペレーションチャージ (NOC): 万一事故を起こされ車両が使用できなくなった場合は、休業補償として以下の金額をご請求させていただきます。自走可能で店舗へ返却された場合：5万円。自走不可能となった場合（レッカー移動等）：10万円。',
        sec: 'Non-Operation Charge (NOC): In case of an accident that makes the vehicle unusable, the following compensation will be charged: If the vehicle can be driven back to the shop: ¥ 50,000. If it cannot be driven (towing required): ¥ 100,000.',
      },
      {
        jp: '事故時の対応: 事故発生時は速やかに警察及び当社への連絡をお願いします (090-4255-0003)。',
        sec: 'Accident Procedure: In case of an accident, contact the Police and our shop immediately.',
      },
      {
        jp: '保険の優先適用: お客様ご加入の自動車保険（他車運転危険担保特約）にて賠償を優先させていただきます。',
        sec: 'Insurance Priority: If you have your own auto insurance with a "driving third-party vehicles" clause, this will be primary.',
      },
      {
        jp: '補償の適用外: 故意の事故、タイヤ単独の損害（パンク・バースト）、車内装備の汚損、第三者への又貸し等は補償対象外です。',
        sec: 'Exclusions: We do not cover intentional damage, tire punctures/bursts, interior staining/damage, and subleasing to third parties.',
      },
      {
        jp: '駐車違反金: 放置駐車違反 of 標章を取り付けられた場合、直ちに管轄警察署へ出頭し反則金をお支払いください。',
        sec: 'Parking Violations: If you receive a parking violation notice, immediately report to the designated police station and pay the fine.',
      }
    ],
    agreement: {
      jp: '以上の内容、および車両の現状を確認し、同意のうえ車両を借受けます。',
      sec: 'By signing below, I agree to the Terms & Conditions and confirm the condition of the vehicle.',
    }
  },
  fil: {
    locale: 'fil-PH',
    title: 'SERTIPIKO NG PAG-ARKILA NG SASAKYAN AT TERMOS NG PAGGAMIT',
    userTitle: '1. DADOS DO LOCATÁRIO E DO USUÁRIO / 1. DETALYE NG NANGUNGUPA AT GAGAMIT',
    vehTitle: '2. DADOS DO VEÍCULO E DA LOCAÇÃO / 2. DETALYE NG SASAKYAN AT PAG-ARKILA',
    termsTitle: '3. TERMOS E CONDIÇÕES / 3. MGA TUNTUNIN AT KONDISYON',
    signatureTitle: '4. CONFIRMAÇÃO E ASSINATURAS / 4. PAGKUMPIRMA AT MGA LAGDA',
    labels: {
      name: 'Nome / Pangalan',
      address: 'Endereço / Address',
      phone: 'Telefone / Telepono',
      cnh: 'Nº Habilitação / Numero ng Lisensya',
      model: 'Modelo / Model',
      plate: 'Placa / Plaka',
      exitDate: 'Data/Hora Saída / Petsa/Oras ng Pag-alis',
      returnDate: 'Data/Hora Retorno / Petsa/Oras ng Pagbabalik',
      km: 'Km / Kilometrahe',
      fuel: 'Combustível / Antas ng Gasolina',
      signatureClient: 'Assinatura do Cliente / Lagda ng Nangungupa',
      signatureHirata: 'Hirata Cars Shop (Lagda at Inkan)',
    },
    terms: [
      {
        jp: '本証の携行: 貸渡中は必ず本証をご携帯ください。',
        sec: 'Obligatoryong Pagdadala: Ang sertipikong ito ay dapat panatilihin sa sasakyan habang nag-aarkila at ipakita kung hihilingin.',
      },
      {
        jp: 'ノンオペレーションチャージ (NOC): 万一事故を起こされ車両が使用できなくなった場合は、休業補償として以下の金額をご請求させていただきます。自走可能で店舗へ返却された場合：5万円。自走不可能となった場合（レッカー移動等）：10万円。',
        sec: 'Non-Operation Charge (NOC): Sa kaso ng aksidente na hindi magagamit ang sasakyan, sisingilin ang sumusunod na kompensasyon: Kung kayang imaneho pabalik sa shop: ¥ 50,000. Kung hindi kayang imaneho (kailangan ng guincho): ¥ 100,000.',
      },
      {
        jp: '事故時の対応: 事故発生時は速やかに警察及び当社への連絡をお願いします (090-4255-0003)。',
        sec: 'Pamamaraan sa Aksidente: Sa kaso ng aksidente, makipag-ugnayan agad sa Pulisya at sa aming shop.',
      },
      {
        jp: '保険の優先適用: お客様ご加入の自動車保険（他車運転危険担保特約）にて賠償を優先させていただきます。',
        sec: 'Prioridad ng Seguro: Kung mayroon kang sariling insurance sa kotse na may sugnay na "pagmamaneho ng sasakyan ng iba", ito ang uunahing gamitin.',
      },
      {
        jp: '補償の適用外: 故意の事故、タイヤ単独の損害（パンク・バースト）、車内装備の汚損、第三者への又貸し等は補償対象外です。',
        sec: 'Mga Eksklusyon: Hindi sakop ang sinadyang pinsala, butas sa gulong, dumi/pinsala sa loob, at sublocating sa iba.',
      },
      {
        jp: '駐車違反金: 放置駐車違反の標章を取り付けられた場合、直ちに管轄警察署へ出頭し反則金をお支払いください。',
        sec: 'Mga Multa sa Paradahan: Kung nabigyan ng parking violation ticket, pumunta agad sa tinukoy na istasyon ng pulisya at bayaran ang multa.',
      }
    ],
    agreement: {
      jp: '以上の内容、および車両の現状を確認し、同意のうえ車両を借受けます。',
      sec: 'Sa paglagda sa ibaba, sumasang-ayon ako sa mga Tuntunin at Kondisyon at kinukumpirma ang kondisyon ng sasakyan.',
    }
  },
  vi: {
    locale: 'vi-VN',
    title: 'CHỨNG NHẬN THUÊ XE VÀ ĐIỀU KHOẢN SỬ DỤNG',
    userTitle: '1. DADOS DO LOCATÁRIO E DO USUÁRIO / 1. THÔNG TIN KHÁCH THUÊ & NGƯỜI SỬ DỤNG',
    vehTitle: '2. DADOS DO VEÍCULO E DA LOCAÇÃO / 2. THÔNG TIN XE & THUÊ XE',
    termsTitle: '3. TERMOS E CONDIÇÕES / 3. ĐIỀU KHOẢN VÀ ĐIỀU KIỆN',
    signatureTitle: '4. CONFIRMAÇÃO E ASSINATURAS / 4. XÁC NHẬN VÀ CHỮ KÝ',
    labels: {
      name: 'Nome / Họ và Tên',
      address: 'Endereço / Địa chỉ',
      phone: 'Telefone / Số điện thoại',
      cnh: 'Nº Habilitação / Số GPLX',
      model: 'Modelo / Dòng xe',
      plate: 'Placa / Biển số',
      exitDate: 'Data/Hora Saída / Ngày/Giờ Nhận',
      returnDate: 'Data/Hora Retorno / Ngày/Giờ Trả',
      km: 'Km / Số công tơ mét',
      fuel: 'Combustível / Mức nhiên liệu',
      signatureClient: 'Assinatura do Cliente / Chữ ký khách thuê',
      signatureHirata: 'Hirata Cars Shop (Chữ ký và Đóng dấu)',
    },
    terms: [
      {
        jp: '本証の携行: 貸渡中は必ず本証をご携帯ください。',
        sec: 'Mang Theo Bắt Buộc: Chứng nhận này phải được giữ trong xe trong suốt thời gian thuê và xuất trình nếu có yêu cầu.',
      },
      {
        jp: 'ノンオペレーションチャージ (NOC): 万一事故を起こされ車両が使用できなくなった場合は、休業補償として以下の金額をご請求させていただきます。自走可能で店舗へ返却された場合：5万円。自走不可能となった場合（レッカー移動等）：10万円。',
        sec: 'Phí Không Vận Hành (NOC): Trong trường hợp xảy ra tai nạn khiến xe không thể sử dụng được, chúng tôi sẽ tính phí bồi thường sau: Nếu xe có thể tự lái về cửa hàng: ¥ 50.000. Nếu không thể tự lái (cần cứu hộ): ¥ 100.000.',
      },
      {
        jp: '事故時の対応: 事故発生時は速やかに警察及び当社への連絡をお願いします (090-4255-0003)。',
        sec: 'Quy Trình Khi Xảy Ra Tai Nạn: Trong trường hợp xảy ra tai nạn, hãy liên hệ ngay với Cảnh sát và cửa hàng của chúng tôi.',
      },
      {
        jp: '保険の優先適用: お客様ご加入の自動車保険（他車運転危険担保特約）にて賠償を優先させていただきます。',
        sec: 'Ưu Tiên Bảo Hiểm: Nếu quý khách có bảo hiểm xe hơi riêng với điều khoản "lái xe của bên thứ ba", bảo hiểm này sẽ được kích hoạt ưu tiên.',
      },
      {
        jp: '補償の適用外: 故意の事故、タイヤ単独の損害（パンク・バースト）、車内装備の汚損、第三者への又貸し等は補償対象外です。',
        sec: 'Loại Trừ: Chúng tôi không bảo hiểm cho các thiệt hại cố ý, thủng lốp, bẩn/hỏng nội thất và cho bên thứ ba thuê lại.',
      },
      {
        jp: '駐車違反金: 放置駐車違反の標章を取り付けられた場合、直ちに管轄警察署へ出頭し反則金をお支払いください。',
        sec: 'Phạt Đỗ Xe Trái Quy Định: Nếu bị phạt đỗ xe trái quy định, hãy đến ngay đồn cảnh sát được chỉ định và nộp phạt.',
      }
    ],
    agreement: {
      jp: '以上の内容、および車両の現状を確認し、同意のうえ車両を借受けます。',
      sec: 'Bằng cách ký tên dưới đây, tôi đồng ý với các Điều khoản & Điều kiện và xác nhận tình trạng xe.',
    }
  },
  id: {
    locale: 'id-ID',
    title: 'SERTIFIKAT SEWA KENDARAAN DAN SYARAT PENGGUNAAN',
    userTitle: '1. DADOS DO LOCATÁRIO E DO USUÁRIO / 1. INFORMASI PENYEWA & PENGGUNA',
    vehTitle: '2. DADOS DO VEÍCULO E DA LOCAÇÃO / 2. DETAIL KENDARAAN & SEWA',
    termsTitle: '3. TERMOS E CONDIÇÕES / 3. SYARAT & KETENTUAN',
    signatureTitle: '4. CONFIRMAÇÃO E ASSINATURAS / 4. KONFIRMASI & TANDA TANGAN',
    labels: {
      name: 'Nome / Nama',
      address: 'Endereço / Alamat',
      phone: 'Telefone / Telepon',
      cnh: 'Nº Habilitação / No. SIM',
      model: 'Modelo / Model',
      plate: 'Placa / Pelat Nomor',
      exitDate: 'Data/Hora Saída / Tanggal/Jam Keluar',
      returnDate: 'Data/Hora Retorno / Tanggal/Jam Kembali',
      km: 'Km / Jarak Tempuh',
      fuel: 'Combustível / Tingkat Bahan Bakar',
      signatureClient: 'Assinatura do Cliente / Tanda Tangan Penyewa',
      signatureHirata: 'Hirata Cars Shop (Tanda Tangan & Cap)',
    },
    terms: [
      {
        jp: '本証の携行: 貸渡中は必ず本証をご携帯ください。',
        sec: 'Wajib Membawa: Sertifikat ini harus disimpan di dalam kendaraan selama masa sewa dan ditunjukkan jika diminta.',
      },
      {
        jp: 'ノンオペレーションチャージ (NOC): 万一事故を起こされ車両が使用できなくなった場合は、休業補償として以下の金額をご請求させていただきます。自走可能で店舗へ返却された場合：5万円。自走不可能となった場合（レッカー移動等）：10万円。',
        sec: 'Biaya Non-Operasi (NOC): Jika terjadi kecelakaan yang menyebabkan kendaraan tidak dapat digunakan, kompensasi berikut akan dikenakan: Jika dapat dikemudikan kembali ke toko: ¥ 50.000. Jika tidak dapat dikemudikan (perlu derek): ¥ 100.000.',
      },
      {
        jp: '事故時の対応: 事故発生時は速やかに警察及び当社への連絡をお願いします (090-4255-0003)。',
        sec: 'Prosedur Kecelakaan: Jika terjadi kecelakaan, segera hubungi Polisi dan toko kami.',
      },
      {
        jp: '保険の優先適用: お客様ご加入の自動車保険（他車運転危険担保特約）にて賠償を優先させていただきます。',
        sec: 'Prioritas Asuransi: Jika Anda memiliki asuransi mobil sendiri dengan klausul "mengendarai kendaraan pihak ketiga", asuransi ini akan diprioritaskan.',
      },
      {
        jp: '補償の適用外: 故意の事故、タイヤ単独の損害（パンク・バースト）、車内装備の汚損、第三者への又貸し等は補償対象外です。',
        sec: 'Pengecualian: Kami tidak menanggung kerusakan yang disengaja, ban bocor/pecah, interior kotor/rusak, dan penyewaan kembali kepada pihak ketiga.',
      },
      {
        jp: '駐車違反金: 放置駐車違反の標章を取り付けられた場合、直ちに管轄警察署へ出頭し反則金をお支払いください。',
        sec: 'Denda Parkir: Jika Anda ditilang karena parkir liar, segera melapor ke kantor polisi yang ditunjuk dan bayar dendanya.',
      }
    ],
    agreement: {
      jp: '以上の内容、および車両の現状を確認し、同意のうえ車両を借受けます。',
      sec: 'Dengan menandatangani di bawah ini, saya menyetujui Syarat & Ketentuan dan mengonfirmasi kondisi kendaraan.',
    }
  }
};

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

function buildRentalHtml({ lang = 'pt', isBlank = false, client, veiculo, rentalData }) {
  const template = RENTAL_LANGUAGES[lang] || RENTAL_LANGUAGES.pt;
  const logoSrc = getLogoBase64();
  
  const B = (v) => isBlank ? BLANK_FIELD : escapeHtml(safeField(v));

  const cNome = B(client?.nome);
  const cEndereco = B(client?.endereco);
  const cTelefone = B(client?.telefone);
  const cCnh = B(client?.cnh_number || client?.cnh);

  const vModelo = B(veiculo?.modelo);
  const vPlaca = B(veiculo?.placa);
  const vKm = B(rentalData?.km_saida || veiculo?.kilometragem);
  const vCombustivel = B(rentalData?.combustivel_saida);

  const rExit = B(rentalData?.data_saida);
  const rReturn = B(rentalData?.data_retorno);

  const termsHtml = template.terms.map((item, idx) => `
    <div class="term-block">
      <p class="ja-line"><strong>${idx + 1}. ${escapeHtml(item.jp.split(': ')[0] || '')}</strong>: ${escapeHtml(item.jp.split(': ').slice(1).join(': ') || item.jp)}</p>
      <p class="sec-line"><strong>${escapeHtml(item.sec.split(': ')[0] || '')}</strong>: ${escapeHtml(item.sec.split(': ').slice(1).join(': ') || item.sec)}</p>
    </div>
  `).join('');

  return `
    <!doctype html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap" rel="stylesheet">
        <title>Certificado de Locação</title>
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
            border-left: none;
            padding-left: 0;
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
          .grid-2 {
            display: flex;
            gap: 20px;
          }
          .grid-col {
            flex: 1;
          }
          .info-row {
            margin-bottom: 4px;
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
          .term-block {
            margin-bottom: 8px;
            page-break-inside: avoid;
          }
          .term-block .sec-line {
            margin-bottom: 0;
          }
          .damage-diagram-section {
            page-break-inside: avoid;
          }
          .signatures-block {
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .signature-agreement {
            text-align: center;
            font-weight: 600;
            margin-bottom: 15px;
          }
          .signature-grid {
            display: flex;
            justify-content: space-around;
            gap: 40px;
            margin-top: 30px;
          }
          .signature-item {
            flex: 1;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #111;
            margin-bottom: 4px;
            width: 100%;
            height: 1px;
          }
          .signature-label {
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="contract-page">
          <div class="bilingual-title-block">
            <h1 class="contract-title">自動車貸渡証および利用規約</h1>
            <h2 class="contract-title sec-line">${escapeHtml(template.title)}</h2>
          </div>

          <!-- Section 1: Lessee & User Info -->
          <section class="section">
            <div class="section-title">1. 借受人および使用者情報 / ${escapeHtml(template.userTitle.split(' / ').slice(1).join(' / ') || template.userTitle)}</div>
            <div class="grid-2">
              <div class="grid-col">
                <div class="info-row">
                  <p class="ja-line">氏名: <strong>${cNome}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.name)}: <strong>${cNome}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">住所: <strong>${cEndereco}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.address)}: <strong>${cEndereco}</strong></p>
                </div>
              </div>
              <div class="grid-col">
                <div class="info-row">
                  <p class="ja-line">電話番号: <strong>${cTelefone}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.phone)}: <strong>${cTelefone}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">運転免許証番号: <strong>${cCnh}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.cnh)}: <strong>${cCnh}</strong></p>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 2: Vehicle & Rental Info -->
          <section class="section">
            <div class="section-title">2. 貸渡車両および貸渡情報 / ${escapeHtml(template.vehTitle.split(' / ').slice(1).join(' / ') || template.vehTitle)}</div>
            <div class="grid-2">
              <div class="grid-col">
                <div class="info-row">
                  <p class="ja-line">車種・モデル: <strong>${vModelo}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.model)}: <strong>${vModelo}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">ナンバープレート: <strong>${vPlaca}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.plate)}: <strong>${vPlaca}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">走行距離 (KM): <strong>${vKm}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.km)}: <strong>${vKm}</strong></p>
                </div>
              </div>
              <div class="grid-col">
                <div class="info-row">
                  <p class="ja-line">貸出日時: <strong>${rExit}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.exitDate)}: <strong>${rExit}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">返却予定日時: <strong>${rReturn}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.returnDate)}: <strong>${rReturn}</strong></p>
                </div>
                <div class="info-row">
                  <p class="ja-line">燃料状態: <strong>${vCombustivel}</strong></p>
                  <p class="sec-line">${escapeHtml(template.labels.fuel)}: <strong>${vCombustivel}</strong></p>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 3: Terms & Conditions -->
          <section class="section">
            <div class="section-title">3. お客様へご注意（利用規約） / ${escapeHtml(template.termsTitle.split(' / ').slice(1).join(' / ') || template.termsTitle)}</div>
            ${termsHtml}
          </section>

          <!-- Damage Inspection Diagram SVG -->
          <section class="damage-diagram-section">
            <div style="text-align: center; margin-top: 15px; border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700;">キズ・ヘコミ等確認図 (Diagrama de Checagem de Danos)</h4>
              <svg viewBox="0 0 800 300" width="100%" height="210px" xmlns="http://www.w3.org/2000/svg">
                <text x="100" y="30" font-size="14" text-anchor="middle" font-weight="bold">前 (FRENTE)</text>
                <rect x="50" y="50" width="100" height="80" rx="10" fill="none" stroke="#333" stroke-width="2"/>
                <line x1="50" y1="90" x2="150" y2="90" stroke="#333" stroke-width="1" stroke-dasharray="4"/>
                <text x="250" y="30" font-size="14" text-anchor="middle" font-weight="bold">左 (LADO ESQ.)</text>
                <path d="M180,130 L200,80 L300,80 L320,130 L320,160 L180,160 Z" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="210" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="290" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
                <text x="450" y="30" font-size="14" text-anchor="middle" font-weight="bold">上 (TETO)</text>
                <rect x="380" y="50" width="140" height="110" rx="15" fill="none" stroke="#333" stroke-width="2"/>
                <rect x="400" y="60" width="100" height="90" rx="5" fill="none" stroke="#333" stroke-width="1"/>
                <text x="650" y="30" font-size="14" text-anchor="middle" font-weight="bold">右 (LADO DIR.)</text>
                <path d="M580,130 L600,80 L700,80 L720,130 L720,160 L580,160 Z" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="610" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
                <circle cx="690" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
                <text x="100" y="190" font-size="14" text-anchor="middle" font-weight="bold">後 (TRASEIRA)</text>
                <rect x="50" y="200" width="100" height="80" rx="10" fill="none" stroke="#333" stroke-width="2"/>
                <line x1="50" y1="240" x2="150" y2="240" stroke="#333" stroke-width="1"/>
              </svg>
            </div>
          </section>

          <!-- Section 4: Signature / Confirmation -->
          <section class="signatures-block">
            <div class="signature-agreement">
              <p class="ja-line">${escapeHtml(template.agreement.jp)}</p>
              <p class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">${escapeHtml(template.agreement.sec)}</p>
            </div>
            <div class="signature-grid">
              <div class="signature-item">
                <div class="signature-line"></div>
                <div class="signature-label">
                  <p class="ja-line">借受人署名</p>
                  <p class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">${escapeHtml(template.labels.signatureClient)}</p>
                </div>
              </div>
              <div class="signature-item">
                <div class="signature-line"></div>
                <div class="signature-label">
                  <p class="ja-line">貸出店・署名捺印</p>
                  <p class="sec-line" style="border-left: none; padding-left: 0; margin-bottom: 0;">${escapeHtml(template.labels.signatureHirata)}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </body>
    </html>
  `;
}

async function generateRentalPdfBuffer({ lang = 'pt', isBlank = false, client, veiculo, rentalData }) {
  const html = buildRentalHtml({ lang, isBlank, client, veiculo, rentalData });
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
          <span style="color: #666;">Hirata Cars Shop - Tel: 090-4255-0003</span>
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
  generateRentalPdfBuffer,
};
