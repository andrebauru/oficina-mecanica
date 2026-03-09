/**
 * Gerador de Contrato de Venda Multilíngue
 * Usa html2pdf.js para suporte completo a Unicode (incluindo japonês)
 * TypeScript | Oficina Mecânica
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import html2pdf from 'html2pdf.js';
import { DadosContratoCompleto } from '../types/vendas';
import { formatarMoeda, formatarDataBR } from './vendas';

export type IdiomaContrato = 'pt' | 'ja' | 'en' | 'fil' | 'vi';

// ─── Converte SVG/imagem URL para PNG base64 com opacidade pré-aplicada ───────
async function urlToTransparentPng(url: string, opacity: number): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('load failed'));
      img.src = url;
    });
    const W = 1200, H = Math.round(W * (img.naturalHeight / (img.naturalWidth || W) || 0.5));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H || 600;
    const ctx = canvas.getContext('2d')!;
    // Fundo transparente + logo com opacidade
    ctx.clearRect(0, 0, W, canvas.height);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, W, canvas.height);
    ctx.globalAlpha = 1;
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

// ─── Gera o HTML do contrato (SEM IMAGENS — apenas texto) ────────────────────
function gerarHTMLContrato(dados: DadosContratoCompleto, idioma: IdiomaContrato): string {
  const isJA = idioma === 'ja';
  const isEN = idioma === 'en';
  const isFIL = idioma === 'fil';
  const isVI = idioma === 'vi';

  // Rótulos de campos
  const L = {
    vendedor: isJA ? '販売者（企業）' : isEN ? 'SELLER (Company)' : isFIL ? 'NAGBEBENTA (Kumpanya)' : isVI ? 'NGƯỜI BÁN (Công ty)' : 'VENDEDOR (Empresa)',
    comprador: isJA ? '買主' : isEN ? 'BUYER' : isFIL ? 'MAMIMILI' : isVI ? 'NGƯỜI MUA' : 'COMPRADOR',
    nome: isJA ? '氏名' : 'Nome',
    endereco: isJA ? '住所' : isEN ? 'Address' : 'Endereço',
    licenca: isJA ? '古物商許可番号' : isEN ? 'Dealer License (Kobutsu-sho)' : 'Licença de Comerciante (Kobutsu-sho)',
    tel: isJA ? '電話番号' : isEN ? 'Phone' : 'Telefone',
    objeto: isJA ? '第2条 契約の目的及び売買代金' : isEN ? 'CLAUSE 2: OBJECT AND VALUE' : 'CLÁUSULA 2: DO OBJETO E VALOR',
    clausula: isJA ? '第' : isEN ? 'CLAUSE ' : 'CLÁUSULA ',
    data: isJA ? '日付' : isEN ? 'Date' : 'Data',
    assinaturaComprador: isJA ? '買主（署名・印鑑）' : isEN ? 'BUYER (Signature & Inkan)' : isFIL ? 'MAMIMILI (Lagda at Inkan)' : isVI ? 'NGƯỜI MUA (Chữ ký và Inkan)' : 'COMPRADOR (Assinatura e Inkan)',
    assinaturaVendedor: isJA ? '販売者代表（署名・印鑑）' : isEN ? 'SELLER Representative (Signature & Inkan)' : isFIL ? 'Kinatawan ng NAGBEBENTA (Lagda at Inkan)' : isVI ? 'Đại diện NGƯỜI BÁN (Chữ ký và Inkan)' : 'VENDEDOR (Representante Legal — Assinatura e Inkan)',
    observacoes: isJA ? '備考・追加条件' : isEN ? 'OBSERVATIONS / ADDITIONAL TERMS' : isFIL ? 'MGA OBSERBASYON / KARAGDAGANG TUNTUNIN' : isVI ? 'QUAN SÁT / ĐIỀU KHOẢN BỔ SUNG' : 'OBSERVAÇÕES / TERMOS ADICIONAIS',
    servicosRealizados: isJA ? '実施されたサービスとメンテナンス' : isEN ? 'Services and Maintenance Performed' : isFIL ? 'Mga Serbisyo at Pagpapanatili na Ginawa' : isVI ? 'Các Dịch Vụ và Bảo Dưỡng Đã Thực Hiện' : 'Serviços e Manutenções Realizados',
  };

  // Cláusulas PT
  const clausulasPT = [
    {
      num: 1,
      titulo: 'IDENTIFICAÇÃO DAS PARTES',
      corpo: `<div class="partes-grid">
  <div class="parte-bloco">
    <div class="parte-titulo">VENDEDOR (Empresa):</div>
    <div class="parte-linha"><span class="p-label">Nome:</span><span class="p-val">${dados.nomeEmpresa || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">Endereço:</span><span class="p-val">${dados.enderecoEmpresa || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">Lic. Kobutsu-sho:</span><span class="p-val">${dados.numeroAutorizacao || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">Telefone:</span><span class="p-val">${dados.telefoneEmpresa || '___________________________________'}</span></div>
  </div>
  <div class="parte-bloco">
    <div class="parte-titulo">COMPRADOR:</div>
    <div class="parte-linha"><span class="p-label">Nome:</span><span class="p-val">${dados.nomeComprador || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">Endereço:</span><span class="p-val">___________________________________</span></div>
    <div class="parte-linha"><span class="p-label">Telefone:</span><span class="p-val">___________________________________</span></div>
  </div>
</div>`
    },
    {
      num: 2,
      titulo: 'DO OBJETO E VALOR',
      corpo: `O Vendedor transfere a posse do veículo <strong>${dados.placa ? '[' + dados.placa + ']' : '___'}</strong>, Chassi <strong>${dados.chassi || '___'}</strong>, Placa <strong>${dados.placa || '___'}</strong>, pelo valor total de <strong>${formatarMoeda(dados.valor)}</strong>.
${dados.parcelas && dados.parcelas.length > 1 ? `<br/>Forma de pagamento: ${dados.parcelas.length} parcelas, com juros de ${dados.jurosPercentual}% ao ano.` : '<br/>Forma de pagamento: À vista.'}`
    },
    {
      num: 3,
      titulo: 'DOS JUROS DE MORA (ART. 404 e 419 DO CÓDIGO CIVIL)',
      corpo: 'Em caso de atraso no pagamento de qualquer parcela, o Comprador concorda com a aplicação de juros moratórios de <strong>14,6% ao ano</strong>, calculados diariamente sobre o saldo devedor, conforme o Artigo 419 do Código Civil Japonês (Minpō), respeitando o limite da Lei de Restrição de Juros (<em>Risoku Seigen-hō</em>).'
    },
    {
      num: 4,
      titulo: 'DA RESERVA DE DOMÍNIO (ART. 555 DO CÓDIGO CIVIL)',
      corpo: 'Fica estabelecido que a propriedade plena do veículo permanece com o Vendedor até que o valor total estipulado na Cláusula 2 seja integralmente quitado. O Comprador detém apenas a posse precária do bem para uso, sendo vedada a venda ou transferência a terceiros sem autorização expressa.'
    },
    {
      num: 5,
      titulo: 'DA RESCISÃO E DEVOLUÇÃO OBRIGATÓRIA (ART. 541 DO CÓDIGO CIVIL)',
      corpo: 'O atraso superior a <strong>30 dias</strong> no pagamento faculta ao Vendedor a rescisão unilateral do contrato.<br/>O Comprador será notificado (<em>Saikoku</em>) para quitar a dívida em até <strong>15 dias</strong>.<br/>Persistindo a inadimplência, o Comprador fica obrigado à devolução imediata do veículo, sob pena de busca e apreensão judicial conforme a Lei de Execução Civil (<em>Minji Shikkō-hō</em>).'
    },
    {
      num: 6,
      titulo: 'DAS PENALIDADES CRIMINAIS (ART. 252 e 246 DO CÓDIGO PENAL)',
      corpo: 'O Comprador declara estar ciente de que:<br/><br/><strong>Apropriação Indébita (Art. 252 — Keihō):</strong> A recusa na devolução do veículo após a rescisão configura crime, sujeitando o infrator a pena de prisão de até 5 anos.<br/><br/><strong>Fraude (Art. 246 — Keihō):</strong> O fornecimento de dados falsos ou a compra sem intenção de pagamento configura estelionato, com pena de até 10 anos.'
    },
    {
      num: 7,
      titulo: 'DA REMOÇÃO À FORÇA E BOLETIM DE OCORRÊNCIA',
      corpo: 'Caso o veículo não seja devolvido voluntariamente após a rescisão:<br/>• O Vendedor registrará um Boletim de Ocorrência (<em>Higai Todoke</em>) junto à Polícia local.<br/>• O Vendedor poderá solicitar ao Tribunal Distrital a Execução Direta (<em>Chokusetsu Shikkō</em>), autorizando oficiais de justiça a remover o veículo do endereço do Comprador, arcando o Comprador com todos os custos e multas judiciais.'
    },
    {
      num: 8,
      titulo: 'FORO',
      corpo: `As partes elegem o Tribunal Distrital de <strong>${dados.foroPagamento || 'Tsu'}</strong> para dirimir quaisquer controvérsias oriundas deste contrato.`
    }
  ];

  // Cláusulas JA
  const clausulasJA = [
    {
      num: 1,
      titulo: '当事者の特定',
      corpo: `<div class="partes-grid">
  <div class="parte-bloco">
    <div class="parte-titulo">販売者（企業）:</div>
    <div class="parte-linha"><span class="p-label">氏名:</span><span class="p-val">${dados.nomeEmpresa || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">住所:</span><span class="p-val">${dados.enderecoEmpresa || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">古物商許可番号:</span><span class="p-val">${dados.numeroAutorizacao || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">電話番号:</span><span class="p-val">${dados.telefoneEmpresa || '___________________________________'}</span></div>
  </div>
  <div class="parte-bloco">
    <div class="parte-titulo">買主:</div>
    <div class="parte-linha"><span class="p-label">氏名:</span><span class="p-val">${dados.nomeComprador || '___________________________________'}</span></div>
    <div class="parte-linha"><span class="p-label">住所:</span><span class="p-val">___________________________________</span></div>
    <div class="parte-linha"><span class="p-label">電話番号:</span><span class="p-val">___________________________________</span></div>
  </div>
</div>`
    },
    {
      num: 2,
      titulo: '契約の目的及び売買代金',
      corpo: `販売者は、ナンバープレート <strong>${dados.placa || '___'}</strong>、車台番号 <strong>${dados.chassi || '___'}</strong> の自動車の占有を総額 <strong>${formatarMoeda(dados.valor)}</strong> にて買主へ移転します。`
    },
    {
      num: 3,
      titulo: '遅延損害金（民法第404条・第419条）',
      corpo: '支払いが遅延した場合、買主は未払い残高に対して年利 <strong>14.6%</strong> の遅延損害金を、利息制限法（Risoku Seigen-hō）の上限を遵守しつつ、日割り計算で支払うことに同意します。'
    },
    {
      num: 4,
      titulo: '所有権留保（民法第555条）',
      corpo: '第2条に定める代金が完済されるまで、当該自動車の完全な所有権は販売者に留保されます。買主は使用のための占有のみを有し、販売者の書面による承認なしに第三者への譲渡・転売を行うことはできません。'
    },
    {
      num: 5,
      titulo: '解除及び返還義務（民法第541条）',
      corpo: '<strong>30日</strong>を超える支払い遅延が生じた場合、販売者は契約を一方的に解除する権利を有します。<br/>買主は <strong>15日</strong> 以内に残債務を清算するよう催告（Saikoku）されます。<br/>不履行が継続する場合、買主は民事執行法（Minji Shikkō-hō）に従い強制執行による自動車の即時返還義務を負います。'
    },
    {
      num: 6,
      titulo: '刑事上の制裁（刑法第252条・第246条）',
      corpo: '買主は以下の事項を認識の上、本契約を締結します：<br/><br/><strong>横領罪（刑法第252条）：</strong>契約解除後に自動車の返還を拒否した場合、5年以下の懲役に処せられる可能性があります。<br/><br/><strong>詐欺罪（刑法第246条）：</strong>虚偽の情報提供または支払い意思のない購入は詐欺を構成し、10年以下の懲役に処せられる可能性があります。'
    },
    {
      num: 7,
      titulo: '強制執行及び被害届',
      corpo: '解除後に自動車が任意返還されない場合：<br/>• 販売者は地元警察署に被害届（Higai Todoke）を提出します。<br/>• 販売者は地方裁判所に直接執行（Chokusetsu Shikkō）を申請する権利を有し、司法執行官及び警察が買主の住所その他所在地から自動車を回収することを許可します。これに要する全費用及び司法上の罰金は買主の負担となります。'
    },
    {
      num: 8,
      titulo: '裁判管轄',
      corpo: `本契約から生じる一切の紛争については、<strong>${dados.foroPagamento || 'Tsu'}</strong>地方裁判所を専属的合意管轄裁判所とします。`
    }
  ];

  // Cláusulas EN
  const clausulasEN = [
    { num: 1, titulo: 'IDENTIFICATION OF PARTIES', corpo: `<div class="partes-grid"><div class="parte-bloco"><div class="parte-titulo">SELLER (Company):</div><div class="parte-linha"><span class="p-label">Name:</span><span class="p-val">${dados.nomeEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Address:</span><span class="p-val">${dados.enderecoEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Dealer License:</span><span class="p-val">${dados.numeroAutorizacao || '___'}</span></div><div class="parte-linha"><span class="p-label">Phone:</span><span class="p-val">${dados.telefoneEmpresa || '___'}</span></div></div><div class="parte-bloco"><div class="parte-titulo">BUYER:</div><div class="parte-linha"><span class="p-label">Name:</span><span class="p-val">${dados.nomeComprador || '___'}</span></div><div class="parte-linha"><span class="p-label">Address:</span><span class="p-val">___</span></div><div class="parte-linha"><span class="p-label">Phone:</span><span class="p-val">___</span></div></div></div>` },
    { num: 2, titulo: 'OBJECT AND VALUE', corpo: `The Seller transfers possession of vehicle plate <strong>${dados.placa||'___'}</strong>, Chassis <strong>${dados.chassi||'___'}</strong>, for total value of <strong>${formatarMoeda(dados.valor)}</strong>.` },
    { num: 3, titulo: 'LATE PAYMENT INTEREST (Art. 404 & 419 Civil Code)', corpo: 'In case of late payment, the Buyer agrees to pay interest of <strong>14.6% per annum</strong> calculated daily on the outstanding balance.' },
    { num: 4, titulo: 'RETENTION OF TITLE (Art. 555 Civil Code)', corpo: 'Full ownership of the vehicle remains with the Seller until the total amount is paid. The Buyer holds only precarious possession and may not sell or transfer to third parties without written consent.' },
    { num: 5, titulo: 'RESCISSION AND MANDATORY RETURN (Art. 541 Civil Code)', corpo: 'Delay exceeding <strong>30 days</strong> entitles the Seller to unilaterally rescind. Buyer will be notified to pay within <strong>15 days</strong>. Failure to comply requires immediate vehicle return under civil enforcement law.' },
    { num: 6, titulo: 'CRIMINAL PENALTIES (Art. 252 & 246 Penal Code)', corpo: '<strong>Misappropriation (Art. 252):</strong> Refusing to return the vehicle after rescission constitutes embezzlement, punishable by up to 5 years imprisonment.<br/><br/><strong>Fraud (Art. 246):</strong> Providing false information or buying without intent to pay constitutes fraud, punishable by up to 10 years.' },
    { num: 7, titulo: 'FORCED REPOSSESSION AND POLICE REPORT', corpo: 'If vehicle is not voluntarily returned: A police report (Higai Todoke) will be filed. The Seller may request Direct Enforcement (Chokusetsu Shikkō), authorizing officers to repossess the vehicle from wherever it may be found.' },
    { num: 8, titulo: 'JURISDICTION', corpo: `The parties elect the District Court of <strong>${dados.foroPagamento||'Tsu'}</strong> to settle any disputes.` }
  ];

  // Cláusulas FIL (Filipino/Tagalog)
  const partesFIL = `<div class="partes-grid"><div class="parte-bloco"><div class="parte-titulo">NAGBEBENTA (Kumpanya):</div><div class="parte-linha"><span class="p-label">Pangalan:</span><span class="p-val">${dados.nomeEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Address:</span><span class="p-val">${dados.enderecoEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Lisensya (Kobutsu-sho):</span><span class="p-val">${dados.numeroAutorizacao || '___'}</span></div><div class="parte-linha"><span class="p-label">Telepono:</span><span class="p-val">${dados.telefoneEmpresa || '___'}</span></div></div><div class="parte-bloco"><div class="parte-titulo">MAMIMILI:</div><div class="parte-linha"><span class="p-label">Pangalan:</span><span class="p-val">${dados.nomeComprador || '___'}</span></div><div class="parte-linha"><span class="p-label">Address:</span><span class="p-val">___</span></div><div class="parte-linha"><span class="p-label">Telepono:</span><span class="p-val">___</span></div></div></div>`;
  const clausulasFIL = [
    { num: 1, titulo: 'PAGKAKAKILANLAN NG MGA PARTIDO', corpo: partesFIL },
    { num: 2, titulo: 'LAYUNIN AT HALAGA', corpo: `Inililipat ng Nagbebenta ang pag-aari ng sasakyan plate <strong>${dados.placa||'___'}</strong>, Chassis <strong>${dados.chassi||'___'}</strong>, sa kabuuang halaga ng <strong>${formatarMoeda(dados.valor)}</strong>.` },
    { num: 3, titulo: 'LATE PAYMENT NA INTERES (Art. 404 at 419 Civil Code)', corpo: 'Sa kaso ng delayed na bayad, ang Mamimili ay sumasang-ayon na magbayad ng interes na <strong>14.6% bawat taon</strong>, kinakalkula araw-araw sa natitirang balanse, alinsunod sa Batas sa Paghihigpit ng Interes (Risoku Seigen-hō).' },
    { num: 4, titulo: 'PAGPAPANATILI NG TITULO (Art. 555 Civil Code)', corpo: 'Ang buong pagmamay-ari ng sasakyan ay nananatili sa Nagbebenta hanggang mabayaran ang kabuuang halaga. Ang Mamimili ay mayroon lamang pansamantalang pag-aari para sa paggamit at hindi maaaring ibenta o ilipat sa ibang tao nang walang nakasulat na pahintulot.' },
    { num: 5, titulo: 'PAGWAWAKAS AT SAPILITANG PAGBABALIK (Art. 541 Civil Code)', corpo: 'Ang pagkaantala na higit sa <strong>30 araw</strong> ay nagbibigay sa Nagbebenta ng karapatang unilaterally na wakasan ang kontrata. Ang Mamimili ay aabisuhan (Saikoku) na bayaran ang utang sa loob ng <strong>15 araw</strong>. Kung hindi susundin, ang Mamimili ay obligadong ibalik ang sasakyan kaagad sa ilalim ng civil enforcement law (Minji Shikkō-hō).' },
    { num: 6, titulo: 'KRIMINAL NA PARUSA (Art. 252 at 246 Penal Code)', corpo: '<strong>Misappropriation (Art. 252 — Keihō):</strong> Ang pagtanggi na ibalik ang sasakyan pagkatapos ng pagwawakas ng kontrata ay bumubuo ng krimen, nararapat sa hanggang 5 taon ng pagkabilanggo.<br/><br/><strong>Fraud (Art. 246 — Keihō):</strong> Ang pagbibigay ng maling impormasyon o pagbili nang walang intensyon na magbayad ay bumubuo ng estafa, nararapat sa hanggang 10 taon.' },
    { num: 7, titulo: 'SAPILITANG PAG-RECOVER AT POLICE REPORT', corpo: 'Kung ang sasakyan ay hindi boluntaryong ibabalik: Isang police report (Higai Todoke) ang ihaharap sa lokal na pulisya. Maaaring humiling ang Nagbebenta ng Direct Enforcement (Chokusetsu Shikkō) sa Hukuman, na nagpapahintulot sa mga opisyal na bawiin ang sasakyan saan man ito naroroon, at ang lahat ng gastos ay sasagutin ng Mamimili.' },
    { num: 8, titulo: 'HURISDIKSYON', corpo: `Pinipili ng mga partido ang District Court ng <strong>${dados.foroPagamento||'Tsu'}</strong> upang malutas ang anumang hindi pagkakaunawaan.` }
  ];

  // Cláusulas VI (Vietnamese)
  const partesVI = `<div class="partes-grid"><div class="parte-bloco"><div class="parte-titulo">NGƯỜI BÁN (Công ty):</div><div class="parte-linha"><span class="p-label">Tên:</span><span class="p-val">${dados.nomeEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Địa chỉ:</span><span class="p-val">${dados.enderecoEmpresa || '___'}</span></div><div class="parte-linha"><span class="p-label">Giấy phép (Kobutsu-sho):</span><span class="p-val">${dados.numeroAutorizacao || '___'}</span></div><div class="parte-linha"><span class="p-label">Điện thoại:</span><span class="p-val">${dados.telefoneEmpresa || '___'}</span></div></div><div class="parte-bloco"><div class="parte-titulo">NGƯỜI MUA:</div><div class="parte-linha"><span class="p-label">Tên:</span><span class="p-val">${dados.nomeComprador || '___'}</span></div><div class="parte-linha"><span class="p-label">Địa chỉ:</span><span class="p-val">___</span></div><div class="parte-linha"><span class="p-label">Điện thoại:</span><span class="p-val">___</span></div></div></div>`;
  const clausulasVI = [
    { num: 1, titulo: 'XÁC ĐỊNH CÁC BÊN', corpo: partesVI },
    { num: 2, titulo: 'ĐỐI TƯỢNG VÀ GIÁ TRỊ', corpo: `Người Bán chuyển giao quyền sở hữu xe biển số <strong>${dados.placa||'___'}</strong>, số khung <strong>${dados.chassi||'___'}</strong>, với tổng giá trị <strong>${formatarMoeda(dados.valor)}</strong>.` },
    { num: 3, titulo: 'LÃI SUẤT TRẢ CHẬM (Điều 404 và 419 Bộ luật Dân sự)', corpo: 'Trong trường hợp trả chậm, Người Mua đồng ý trả lãi suất <strong>14,6% mỗi năm</strong>, tính theo ngày trên số dư chưa thanh toán, theo quy định của Luật Hạn chế Lãi suất (Risoku Seigen-hō).' },
    { num: 4, titulo: 'BẢO LƯU QUYỀN SỞ HỮU (Điều 555 Bộ luật Dân sự)', corpo: 'Quyền sở hữu đầy đủ của xe vẫn thuộc về Người Bán cho đến khi tổng số tiền được thanh toán đầy đủ. Người Mua chỉ có quyền chiếm hữu tạm thời để sử dụng và không được bán hoặc chuyển nhượng cho bên thứ ba mà không có sự đồng ý bằng văn bản.' },
    { num: 5, titulo: 'HỦY HỢP ĐỒNG VÀ TRẢ LẠI BẮT BUỘC (Điều 541 Bộ luật Dân sự)', corpo: 'Chậm trễ hơn <strong>30 ngày</strong> cho phép Người Bán đơn phương hủy hợp đồng. Người Mua sẽ được thông báo (Saikoku) để thanh toán trong vòng <strong>15 ngày</strong>. Nếu không tuân thủ, Người Mua có nghĩa vụ trả lại xe ngay lập tức theo luật thi hành dân sự (Minji Shikkō-hō).' },
    { num: 6, titulo: 'CHẾ TÀI HÌNH SỰ (Điều 252 và 246 Bộ luật Hình sự)', corpo: '<strong>Chiếm đoạt tài sản (Điều 252 — Keihō):</strong> Từ chối trả lại xe sau khi hủy hợp đồng cấu thành tội phạm, có thể bị phạt tù lên đến 5 năm.<br/><br/><strong>Gian lận (Điều 246 — Keihō):</strong> Cung cấp thông tin sai lệch hoặc mua mà không có ý định thanh toán cấu thành tội lừa đảo, có thể bị phạt tù lên đến 10 năm.' },
    { num: 7, titulo: 'CƯỠNG CHẾ THU HỒI VÀ BÁO CÁO CẢNH SÁT', corpo: 'Nếu xe không được tự nguyện trả lại: Một báo cáo cảnh sát (Higai Todoke) sẽ được nộp. Người Bán có thể yêu cầu Tòa án Thi hành trực tiếp (Chokusetsu Shikkō), cho phép nhân viên tư pháp thu hồi xe bất kể xe ở đâu, và Người Mua phải chịu mọi chi phí và phạt tòa án.' },
    { num: 8, titulo: 'THẨM QUYỀN', corpo: `Các bên chọn Tòa án Quận <strong>${dados.foroPagamento||'Tsu'}</strong> để giải quyết mọi tranh chấp phát sinh từ hợp đồng này.` }
  ];

  const clausulasAtivas = isJA ? clausulasJA : isFIL ? clausulasFIL : isVI ? clausulasVI : isEN ? clausulasEN : clausulasPT;

  // Parcelas HTML
  const parcelasHTML = dados.parcelas && dados.parcelas.length > 1 ? `
    <div class="section">
      <div class="section-title">${isJA ? '分割払いスケジュール' : isFIL ? 'Iskedyul ng Hulugan' : isVI ? 'Lịch Trả Góp' : isEN ? 'Installment Schedule' : 'Cronograma de Parcelas'}</div>
      <table class="table">
        <thead><tr>
          <th>Nº</th>
          <th style="text-align:right">${isJA ? '金額' : 'Valor'}</th>
          <th style="text-align:center">${isJA ? '期日' : 'Vencimento'}</th>
          <th style="text-align:center">${isJA ? '状態' : 'Status'}</th>
        </tr></thead>
        <tbody>
          ${dados.parcelas.map(p => `<tr>
            <td>${p.numero}</td>
            <td style="text-align:right">${formatarMoeda(p.valor)}</td>
            <td style="text-align:center;font-family:monospace">${formatarDataBR(p.dataVencimento)}</td>
            <td style="text-align:center">${p.status === 'pago' ? '✓' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const servicosHTML = dados.servicosRealizados && dados.servicosRealizados.length > 0 ? `
    <div class="section">
      <div class="section-title">${L.servicosRealizados}</div>
      <table class="table">
        <thead><tr>
          <th>${isJA ? '内容' : 'Descrição'}</th>
          <th style="text-align:right">${isJA ? '金額' : 'Valor'}</th>
          <th style="text-align:center">${isJA ? '日付' : 'Data'}</th>
        </tr></thead>
        <tbody>
          ${dados.servicosRealizados.map(s => `<tr>
            <td>${s.descricao}</td>
            <td style="text-align:right">${formatarMoeda(s.valor)}</td>
            <td style="text-align:center">${s.data ? formatarDataBR(s.data) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const observacoesHTML = dados.observacoes ? `
    <div class="obs-box">
      <div class="obs-titulo">${L.observacoes}</div>
      <div class="obs-texto">${dados.observacoes}</div>
    </div>` : '';

  const prefixoClausula = isJA ? '第' : isFIL ? 'ARTIKULO' : isVI ? 'ĐIỀU' : isEN ? 'CLAUSE' : 'CLÁUSULA';
  const sufixoClausula = isJA ? '条' : '';
  const clausulasHTML = clausulasAtivas.map(cl => `
    <div class="clausula">
      <div class="clausula-titulo">${prefixoClausula} ${cl.num}${sufixoClausula}: ${cl.titulo}</div>
      <div class="clausula-corpo">${cl.corpo}</div>
    </div>`).join('');

  const anoAtual = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="${idioma}">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: Arial, 'Noto Sans JP', 'MS Gothic', 'Hiragino Kaku Gothic Pro', sans-serif;
  font-size: 10pt;
  color: #111;
  background: #fff;
  line-height: 1.5;
}
.doc {
  width: 185mm;
  margin: 0 auto;
  padding: 10mm 0 15mm 0;
}
/* CABEÇALHO */
.header {
  border-bottom: 3px solid #1a237e;
  padding-bottom: 10px;
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.header-left h1 {
  font-size: 17pt;
  color: #1a237e;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.header-left p {
  font-size: 8.5pt;
  color: #555;
  margin-top: 2px;
}
.header-right {
  text-align: right;
  font-size: 8pt;
  color: #555;
  min-width: 120px;
}
.header-right .doc-num {
  font-size: 9pt;
  font-weight: bold;
  color: #1a237e;
}
/* TÍTULO */
.titulo {
  text-align: center;
  margin: 14px 0 18px 0;
  padding: 10px;
  border: 2px solid #1a237e;
  border-radius: 4px;
  background: #e8eaf6;
}
.titulo-ja {
  font-size: 14pt;
  font-weight: 800;
  color: #1a237e;
  display: block;
}
.titulo-sub {
  font-size: 10pt;
  color: #333;
  display: block;
  margin-top: 3px;
}
/* CLÁUSULAS */
.clausula {
  margin-bottom: 14px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.clausula-titulo {
  font-weight: 700;
  font-size: 10pt;
  color: #1a237e;
  background: #e8eaf6;
  padding: 4px 8px;
  margin-bottom: 6px;
  border-left: 4px solid #1a237e;
}
.clausula-corpo {
  font-size: 9.5pt;
  color: #222;
  line-height: 1.75;
  text-align: justify;
  padding: 0 4px;
}
/* PARTES (cláusula 1) */
.partes-grid {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}
.parte-bloco {
  flex: 1;
  border: 1px solid #c5cae9;
  border-radius: 4px;
  padding: 8px 10px;
  background: #f8f9ff;
}
.parte-titulo {
  font-weight: 700;
  font-size: 9.5pt;
  color: #1a237e;
  margin-bottom: 5px;
  border-bottom: 1px solid #c5cae9;
  padding-bottom: 3px;
}
.parte-linha {
  display: flex;
  gap: 6px;
  margin-bottom: 3px;
  font-size: 9pt;
}
.p-label { font-weight: 600; min-width: 100px; color: #444; }
.p-val { color: #111; border-bottom: 1px solid #aaa; flex: 1; }
/* TABELAS */
.section { margin-bottom: 14px; }
.section-title {
  font-weight: 700;
  font-size: 10pt;
  color: #1a237e;
  border-bottom: 2px solid #1a237e;
  padding-bottom: 3px;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.table { width:100%; border-collapse:collapse; font-size:9pt; }
.table th { background:#1a237e; color:#fff; padding:5px 8px; text-align:left; }
.table td { padding:4px 8px; border-bottom:1px solid #e0e0e0; }
.table tr:nth-child(even) td { background:#f5f6ff; }
/* OBSERVAÇÕES */
.obs-box {
  background: #fffde7;
  border: 1px solid #f9a825;
  border-left: 4px solid #f9a825;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 14px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.obs-titulo { font-weight:700; color:#e65100; font-size:9.5pt; margin-bottom:4px; }
.obs-texto { font-size:9pt; color:#333; line-height:1.65; white-space:pre-wrap; }
/* ASSINATURAS */
.assinaturas {
  margin-top: 36px;
  display: flex;
  gap: 24px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.ass-bloco {
  flex: 1;
  text-align: center;
}
.ass-linha {
  border-top: 2px solid #333;
  margin-top: 48px;
  padding-top: 6px;
  font-size: 9pt;
  font-weight: 600;
}
.ass-data {
  font-size: 9pt;
  color: #555;
  margin-top: 8px;
}
/* FOOTER */
.footer {
  margin-top: 20px;
  text-align: center;
  font-size: 7.5pt;
  color: #888;
  border-top: 1px solid #ddd;
  padding-top: 6px;
}
</style>
</head>
<body>
<div class="doc">

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <h1>${dados.nomeEmpresa || 'HIRATA CARS'}</h1>
      ${dados.enderecoEmpresa ? `<p>📍 ${dados.enderecoEmpresa}</p>` : ''}
      ${dados.telefoneEmpresa ? `<p>📞 ${dados.telefoneEmpresa}</p>` : ''}
    </div>
    <div class="header-right">
      <div class="doc-num">Nº ${dados.numeroVenda}</div>
      <div>${formatarDataBR(dados.dataVenda)}</div>
    </div>
  </div>

  <!-- TÍTULO -->
  <div class="titulo">
    <span class="titulo-ja">自動車売買契約書</span>
    <span class="titulo-sub">${isJA ? '' : isEN ? 'Vehicle Purchase and Sale Contract' : isFIL ? 'Kasunduan sa Pagbili at Pagbebenta ng Sasakyan' : isVI ? 'Hợp Đồng Mua Bán Xe' : 'Contrato de Compra e Venda de Veículo'}</span>
  </div>

  <!-- CLÁUSULAS -->
  ${clausulasHTML}

  <!-- SERVIÇOS -->
  ${servicosHTML}

  <!-- PARCELAS -->
  ${parcelasHTML}

  <!-- OBSERVAÇÕES -->
  ${observacoesHTML}

  <!-- ASSINATURAS -->
  <div class="assinaturas">
    <div class="ass-bloco">
      <div class="ass-linha">${L.assinaturaVendedor}</div>
      <div class="ass-data">${L.data} _____ / _____ / ${anoAtual}</div>
    </div>
    <div class="ass-bloco">
      <div class="ass-linha">${L.assinaturaComprador}</div>
      <div class="ass-data">${L.data} _____ / _____ / ${anoAtual}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${dados.nomeEmpresa || ''} ${dados.enderecoEmpresa ? ' | ' + dados.enderecoEmpresa : ''} ${dados.telefoneEmpresa ? ' | ' + dados.telefoneEmpresa : ''}
  </div>

</div>
</body>
</html>`;
}

// ─── Converte HTML em PDF Blob, adicionando watermark via jsPDF ────────────
async function htmlToBlob(html: string, watermarkPng?: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  return new Promise<Blob>((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument!;
        const content = doc.body;

        const opt = {
          margin: [10, 10, 14, 10] as [number, number, number, number],
          filename: 'contrato.pdf',
          image: { type: 'jpeg' as const, quality: 0.93 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 794,
          },
          jsPDF: {
            unit: 'mm' as const,
            format: 'a4' as const,
            orientation: 'portrait' as const,
          },
          pagebreak: { mode: ['css', 'legacy'] as string[] },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob: Blob = await (html2pdf as any)()
          .set(opt)
          .from(content)
          .toPdf()
          .get('pdf')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then(async (pdf: any) => {
            const totalPages = pdf.internal.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Adicionar watermark PNG transparente em cada página
            if (watermarkPng) {
              const wmW = pageWidth * 0.55;
              const wmH = wmW * 0.55;
              const wmX = (pageWidth - wmW) / 2;
              const wmY = (pageHeight - wmH) / 2;

              for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                try {
                  pdf.addImage(watermarkPng, 'PNG', wmX, wmY, wmW, wmH);
                } catch (_e) {
                  // ignore se falhar
                }
              }
            }

            // Números de página
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.setFontSize(7);
              pdf.setTextColor(140, 140, 140);
              pdf.text(
                `Página ${i} / ${totalPages}`,
                pageWidth / 2,
                pageHeight - 4,
                { align: 'center' }
              );
            }

            return pdf.output('blob');
          });

        document.body.removeChild(iframe);
        resolve(blob);
      } catch (err) {
        document.body.removeChild(iframe);
        reject(err);
      }
    };
    iframe.srcdoc = html;
  });
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function gerarContratoPDFAsync(
  dados: DadosContratoCompleto,
  idioma: IdiomaContrato = 'pt'
): Promise<Blob> {
  const html = gerarHTMLContrato(dados, idioma);

  let watermarkPng: string | undefined;
  if (dados.logoUrl) {
    const png = await urlToTransparentPng(dados.logoUrl, 0.15);
    if (png) watermarkPng = png;
  }

  return htmlToBlob(html, watermarkPng);
}

export async function gerarContratosMultiplos(
  dados: DadosContratoCompleto,
  idiomaExtra?: IdiomaContrato
): Promise<Array<{ idioma: IdiomaContrato; blob: Blob; nome: string }>> {
  const resultados: Array<{ idioma: IdiomaContrato; blob: Blob; nome: string }> = [];

  const blobPT = await gerarContratoPDFAsync(dados, 'pt');
  resultados.push({ idioma: 'pt', blob: blobPT, nome: gerarNomeArquivoContrato(dados.nomeComprador, dados.numeroVenda, 'pt') });

  const blobJA = await gerarContratoPDFAsync(dados, 'ja');
  resultados.push({ idioma: 'ja', blob: blobJA, nome: gerarNomeArquivoContrato(dados.nomeComprador, dados.numeroVenda, 'ja') });

  if (idiomaExtra && idiomaExtra !== 'pt' && idiomaExtra !== 'ja') {
    const blobExtra = await gerarContratoPDFAsync(dados, idiomaExtra);
    resultados.push({ idioma: idiomaExtra, blob: blobExtra, nome: gerarNomeArquivoContrato(dados.nomeComprador, dados.numeroVenda, idiomaExtra) });
  }

  return resultados;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function gerarContratoPDF(_dados: DadosContratoCompleto, _idioma: 'pt' | 'en' = 'pt'): Blob {
  console.warn('gerarContratoPDF() é legado. Use gerarContratoPDFAsync()');
  return new Blob([''], { type: 'application/pdf' });
}

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

export function gerarNomeArquivoContrato(
  nomeCliente: string,
  numeroVenda: string,
  idioma: string = 'pt'
): string {
  const nomeLimpo = nomeCliente.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const data = new Date().toISOString().split('T')[0];
  return `contrato_${idioma}_${numeroVenda}_${nomeLimpo}_${data}.pdf`;
}

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
