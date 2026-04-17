/**
 * Gerador de Contrato PDF Multi-Idioma
 * Contrato de Venda de Veículo com 7 Cláusulas Legais
 * 
 * Idiomas Suportados: Português (pt), Vietnamita (vi), Tagalog (fil), Japonês (ja)
 * 
 * Funcionalidades:
 * - Geração de PDF com marca d'água (40% opacidade)
 * - Cabeçalho com dados da empresa (nome, registro, telefone)
 * - Rodapé com data e numeração de página
 * - Preenchimento automático de dados do banco de dados
 * - Suporte multi-idioma (pt, vi, fil, ja)
 * - 7 Cláusulas legais com sub-parágrafos
 */

import html2pdf from 'html2pdf.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Cliente {
  client_id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cnh_number?: string;
}

export interface Veiculo {
  veiculo_id: string;
  marca: string;
  modelo: string;
  placa: string;
  ano: number;
  data_venda?: string;
  nova_placa?: string;
  data_transferencia?: string;
}

export interface ConfiguracaoEmpresa {
  nome: string;
  telefone: string;
  numeroAutorizacao: string;
  endereco?: string;
}

export interface DadosContrato {
  cliente: Cliente;
  veiculo: Veiculo;
  preco: number;
  sinal: number;
  parcelas: number;
  empresa: ConfiguracaoEmpresa;
  dataEmissao: string;
  idioma: 'pt' | 'vi' | 'fil' | 'ja';
}

// ============================================================================
// CLÁUSULAS LEGAIS - PORTUGUÊS
// ============================================================================

const clausulasPT = {
  titulo: 'CONTRATO DE VENDA DE VEÍCULO',
  
  clausula1: {
    numero: 'CLÁUSULA 1ª',
    titulo: 'DO OBJETO',
    conteudo: `
      O presente contrato tem por objeto a compra e venda de um veículo usado. 
      O Comprador declara estar ciente que o veículo é usado e está em perfeitas condições de uso.
      O Vendedor certifica estar autorizado para a venda deste veículo.
    `,
  },

  clausula2: {
    numero: 'CLÁUSULA 2ª',
    titulo: 'DAS RESPONSABILIDADES E GARANTIA',
    conteudo: `
      O Vendedor oferece garantia de 3 (três) meses sobre o motor e transmissão.
      Ficam excluídas da garantia: pneus, bateria, vidros, faróis, buzina, palhetas e itens de desgaste normal.
      A garantia será nula se constatadas alterações não autorizadas no veículo.
      Qualquer defeito deverá ser comunicado em até 7 (sete) dias da entrega.
    `,
  },

  clausula3: {
    numero: 'CLÁUSULA 3ª',
    titulo: 'DOS DEVERES DO ADQUIRENTE',
    conteudo: `
      O Comprador obriga-se a inspecionar completamente o veículo antes de assinar este contrato.
      Qualquer defeito encontrado deverá ser substituído pelo Vendedor, dentro de 7 (sete) dias, sem custo adicional.
      Após esse prazo, o Comprador será responsável por qualquer manutenção e reparos necessários.
    `,
  },

  clausula4: {
    numero: 'CLÁUSULA 4ª',
    titulo: 'DO PREÇO E PAGAMENTO',
    conteudo: `
      O preço é fixo e irrevogável, não sofrendo alterações por nenhuma razão.
      O pagamento será efetuado conforme as datas e valores acordados.
      Atraso superior a 30 (trinta) dias ensejará a rescisão deste contrato.
    `,
  },

  clausula5: {
    numero: 'CLÁUSULA 5ª',
    titulo: 'DA MANUTENÇÃO',
    conteudo: `
      Qualquer anomalia identificada deverá ser imediatamente comunicada ao Vendedor.
      A manutenção preventiva e corretiva é de total responsabilidade do Comprador.
      A garantia será nula se constatados reparos não autorizados realizados em oficinas terceirizadas.
    `,
  },

  clausula6: {
    numero: 'CLÁUSULA 6ª',
    titulo: 'DA TRANSFERÊNCIA',
    conteudo: `
      A transferência do veículo será formalizada após o pagamento integral do preço.
      O Vendedor fornecerá todos os documentos necessários para a transferência no prazo de 30 (trinta) dias.
      Até a transferência oficial, o Vendedor permanece como responsável legal do veículo.
      Custos com transferência correm por conta do Comprador.
    `,
  },

  clausula7: {
    numero: 'CLÁUSULA 7ª',
    titulo: 'DO FORO',
    conteudo: `
      As partes elegem o foro da comarca do domicílio do Vendedor para dirimir qualquer dúvida.
      Este contrato é vinculante e obrigatório para ambas as partes.
      Qualquer alteração deve ser feita por escrito e assinada por ambas as partes.
      O não cumprimento de qualquer cláusula ensejará ação legal.
    `,
  },
};

// ============================================================================
// CLÁUSULAS LEGAIS - JAPONÊS
// ============================================================================

const clausulasJA = {
  titulo: '車両売買契約書',
  
  clausula1: {
    numero: '第1条',
    titulo: '契約の対象',
    conteudo: `
      本契約は、中古車両の買売を目的とします。
      買主は、本車両が中古であること、および完全に使用可能な状態にあることを確認しています。
      売主は、本車両の売却について適切な権限を有していることを証明します。
    `,
  },

  clausula2: {
    numero: '第2条',
    titulo: '責任及び保証',
    conteudo: `
      売主は、本契約発行日から3ヶ月間、エンジンおよびトランスミッションについて保証を提供します。
      保証対象外：タイヤ、バッテリー、ガラス、ヘッドライト、ホーン、ワイパー、および通常の摩耗品。
      未承認の改造が検出された場合、保証は無効となります。
      欠陥は、納入から7日以内に報告される必要があります。
    `,
  },

  clausula3: {
    numero: '第3条',
    titulo: '購入者の義務',
    conteudo: `
      買主は、本契約に署名する前に車両を完全に検査する義務があります。
      発見された欠陥は、売主により7日以内に追加費用なしで交換されます。
      この期限を過ぎると、買主は必要なメンテナンスと修理の全責任を負います。
    `,
  },

  clausula4: {
    numero: '第4条',
    titulo: '価格および支払い',
    conteudo: `
      価格は固定で不変であり、いかなる理由によっても変更されません。
      支払いは合意された日付と金額に従って行われます。
      30日を超える遅延は、本契約の解除を招きます。
    `,
  },

  clausula5: {
    numero: '第5条',
    titulo: 'メンテナンス',
    conteudo: `
      識別されたあらゆる異常は、直ちに売主に報告される必要があります。
      予防的および修正的メンテナンスは、買主の全責任です。
      未承認の修理が第三者の工場で行われた場合、保証は無効となります。
    `,
  },

  clausula6: {
    numero: '第6条',
    titulo: '譲渡',
    conteudo: `
      車両の譲渡は、価格の全額支払い後に正式化されます。
      売主は、30日以内に譲渡に必要なすべての書類を提供します。
      公式譲渡まで、売主は車両の法定責任者として残ります。
      譲渡の費用は買主が負担します。
    `,
  },

  clausula7: {
    numero: '第7条',
    titulo: '管轄権',
    conteudo: `
      当事者は、売主の居住地の管轄地裁判所を選択します。
      本契約は、双方を拘束し義務付けるものです。
      変更は書面で行われ、双方により署名される必要があります。
      いかなる条項の不履行も、法的措置を招きます。
    `,
  },
};

// ============================================================================
// CLÁUSULAS LEGAIS - VIETNAMITA
// ============================================================================

const clausulasVI = {
  titulo: 'HỢP ĐỒNG BÁN XE',
  
  clausula1: {
    numero: 'ĐIỀU 1',
    titulo: 'ĐỐI TƯỢNG HỢP ĐỒNG',
    conteudo: `
      Hợp đồng này nhằm mục đích mua bán một chiếc xe đã sử dụng.
      Người mua xác nhận rằng chiếc xe đã sử dụng và ở tình trạng hoàn hảo để sử dụng.
      Người bán chứng minh rằng được phép bán chiếc xe này.
    `,
  },

  clausula2: {
    numero: 'ĐIỀU 2',
    titulo: 'TRÁCH NHIỆM VÀ BẢO HÀNH',
    conteudo: `
      Người bán cung cấp bảo hành 3 (ba) tháng cho động cơ và hộp số.
      Không bao gồm bảo hành: lốp, pin, kính, đèn pha, còi, gạt mưa và các bộ phận mài mòn thông thường.
      Bảo hành sẽ vô hiệu nếu phát hiện sửa đổi không được phép trên chiếc xe.
      Mọi khiếm khuyết phải được báo cáo trong vòng 7 (bảy) ngày kể từ lúc nhận hàng.
    `,
  },

  clausula3: {
    numero: 'ĐIỀU 3',
    titulo: 'NGHĨA VỤ CỦA NGƯỜI MUA',
    conteudo: `
      Người mua có trách nhiệm kiểm tra toàn bộ chiếc xe trước khi ký hợp đồng.
      Mọi khiếm khuyết phát hiện sẽ được thay thế bởi người bán trong vòng 7 (bảy) ngày, không tính thêm chi phí.
      Sau kỳ hạn này, người mua sẽ chịu trách nhiệm về mọi bảo trì và sửa chữa cần thiết.
    `,
  },

  clausula4: {
    numero: 'ĐIỀU 4',
    titulo: 'GIÁ CẢ VÀ THANH TOÁN',
    conteudo: `
      Giá cố định và không đổi, không thay đổi vì bất kỳ lý do gì.
      Thanh toán sẽ được thực hiện theo đúng ngày tháng và số tiền đã thỏa thuận.
      Độ trễ vượt quá 30 (ba mươi) ngày sẽ dẫn đến hủy bỏ hợp đồng.
    `,
  },

  clausula5: {
    numero: 'ĐIỀU 5',
    titulo: 'BẢO TRÌ',
    conteudo: `
      Mọi bất thường được phát hiện phải được báo cáo ngay cho người bán.
      Bảo trì phòng ngừa và bảo trì sửa chữa là trách nhiệm hoàn toàn của người mua.
      Bảo hành sẽ vô hiệu nếu phát hiện sửa chữa không được phép được thực hiện tại các cửa hàng bên thứ ba.
    `,
  },

  clausula6: {
    numero: 'ĐIỀU 6',
    titulo: 'CHUYỂN NHƯỢNG',
    conteudo: `
      Việc chuyển nhượng xe sẽ được chính thức hóa sau khi thanh toán đầy đủ giá cả.
      Người bán sẽ cung cấp tất cả các tài liệu cần thiết để chuyển nhượng trong vòng 30 (ba mươi) ngày.
      Cho đến khi chuyển nhượng chính thức, người bán vẫn là người chịu trách nhiệm pháp lý về chiếc xe.
      Chi phí chuyển nhượng được thanh toán bởi người mua.
    `,
  },

  clausula7: {
    numero: 'ĐIỀU 7',
    titulo: 'THẨM QUYỀN',
    conteudo: `
      Các bên lựa chọn tòa án tại nơi cư trú của người bán.
      Hợp đồng này có tính ràng buộc và bắt buộc đối với cả hai bên.
      Mọi thay đổi phải được thực hiện bằng văn bản và ký tên bởi cả hai bên.
      Việc không tuân thủ bất kỳ điều khoản nào sẽ dẫn đến hành động pháp lý.
    `,
  },
};

// ============================================================================
// CLÁUSULAS LEGAIS - TAGALOG (FILIPINO)
// ============================================================================

const clausulasFIL = {
  titulo: 'KONTRATA SA PAGBEBENTA NG SASAKYAN',
  
  clausula1: {
    numero: 'KLAWSULA 1',
    titulo: 'LAYUNIN NG KONTRATA',
    conteudo: `
      Ang kontratang ito ay naglalayong bumili at magbenta ng isang ginamit na sasakyan.
      Kinikilala ng Mamimili na ang sasakyan ay ginamit at nasa perpektong kondisyon para sa paggamit.
      Inaasikaso ng Nagbebenta na may kapangyarihan na magbenta ng sasakyang ito.
    `,
  },

  clausula2: {
    numero: 'KLAWSULA 2',
    titulo: 'RESPONSIBILIDAD AT WARRANTY',
    conteudo: `
      Nag-aalok ang Nagbebenta ng 3 (tatlong) buwan na warranty sa motor at transmission.
      Hindi kasama sa warranty: gulong, baterya, baso, headlights, klaxon, wiper at mga bahaging napapagod.
      Ang warranty ay magiging boid kung makita ang hindi awtorisadong pagbabago sa sasakyan.
      Ang anumang depekto ay dapat iugnay sa loob ng 7 (pitong) araw mula sa paghahatid.
    `,
  },

  clausula3: {
    numero: 'KLAWSULA 3',
    titulo: 'OBLIGASYON NG BUMIBILI',
    conteudo: `
      Ang Mamimili ay obligadong suriin nang buo ang sasakyan bago pumirma sa kontratang ito.
      Ang anumang nakitang defekto ay papalitan ng Nagbebenta sa loob ng 7 (pitong) araw, nang walang karagdagang bayad.
      Pagkatapos ng panahong ito, ang Mamimili ay magiging responsable sa anumang maintenance at repairs.
    `,
  },

  clausula4: {
    numero: 'KLAWSULA 4',
    titulo: 'PRESYO AT PAGBABAYAD',
    conteudo: `
      Ang presyo ay nakaayos at hindi nagbabago, hindi nagbabago para sa anumang dahilan.
      Ang pagbabayad ay igsasagawa ayon sa napakitaang petsa at halaga.
      Ang pagkaantala na higit sa 30 (tatlumpung) araw ay magdudulot sa pagbabawi ng kontrata.
    `,
  },

  clausula5: {
    numero: 'KLAWSULA 5',
    titulo: 'PAGPAPANATILI',
    conteudo: `
      Ang anumang hindi pangkaraniwang kahina-hinaan ay dapat iugnay kaagad sa Nagbebenta.
      Ang preventive at corrective maintenance ay ganap na responsibilidad ng Mamimili.
      Ang warranty ay magiging void kung makita ang hindi awtorisadong repair na isinagawa sa third-party shops.
    `,
  },

  clausula6: {
    numero: 'KLAWSULA 6',
    titulo: 'PAGLIPAT',
    conteudo: `
      Ang paglipat ng sasakyan ay magiging pormal pagkatapos ng buo na pagbabayad ng presyo.
      Magbibigay ang Nagbebenta ng lahat ng kinakailangang dokumento para sa paglipat sa loob ng 30 (tatlumpung) araw.
      Hanggang sa opisyal na paglipat, ang Nagbebenta ay nananatiling may legal na responsibilidad sa sasakyan.
      Ang gastos sa paglipat ay babayaran ng Mamimili.
    `,
  },

  clausula7: {
    numero: 'KLAWSULA 7',
    titulo: 'HURISDIKSYON',
    conteudo: `
      Pinipili ng mga partido ang korte sa lugar kung saan nakatira ang Nagbebenta.
      Ang kontratang ito ay nakabibi at pangalagaan para sa parehong partido.
      Ang anumang pagbabago ay dapat gawin sa pagsusulat at pirmahan ng parehong partido.
      Ang hindi pagsunod sa anumang klawsula ay magdudulot ng legal na aksyon.
    `,
  },
};


// ============================================================================
// FUNÇÃO DE GERAÇÃO HTML
// ============================================================================

function gerarHTMLContrato(dados: DadosContrato): string {
  let clausulas;
  
  switch (dados.idioma) {
    case 'pt':
      clausulas = clausulasPT;
      break;
    case 'vi':
      clausulas = clausulasVI;
      break;
    case 'fil':
      clausulas = clausulasFIL;
      break;
    case 'ja':
      clausulas = clausulasJA;
      break;
    default:
      clausulas = clausulasPT;
  }
  
  const fonte = dados.idioma === 'ja' ? "'Segoe UI', 'Noto Sans JP', Arial" : "'Arial', sans-serif";
  
  const valorParcela = ((dados.preco - dados.sinal) / dados.parcelas).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${clausulas.titulo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: ${fonte};
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          padding: 20mm;
          margin: 10mm auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        
        /* Marca d'água */
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 100px;
          font-weight: bold;
          color: rgba(0, 0, 0, 0.1);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
          width: 200%;
          text-align: center;
        }
        
        /* Cabeçalho */
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 15px;
          position: relative;
          z-index: 1;
        }
        
        .header h1 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .header p {
          font-size: 10px;
          margin: 2px 0;
        }
        
        /* Conteúdo */
        .content {
          position: relative;
          z-index: 1;
          font-size: 11px;
        }
        
        .title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          margin: 15px 0;
          text-decoration: underline;
        }
        
        .section {
          margin: 12px 0;
        }
        
        .clause-header {
          font-weight: bold;
          font-size: 11px;
          margin-top: 10px;
          margin-bottom: 4px;
        }
        
        .clause-content {
          text-align: justify;
          margin: 4px 0 8px 10px;
          font-size: 10px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .data-table {
          width: 100%;
          margin: 8px 0;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .data-table td {
          padding: 4px;
          border: 1px solid #ddd;
        }
        
        .data-table strong {
          font-weight: bold;
        }
        
        /* Assinaturas */
        .signatures {
          margin-top: 25px;
          display: flex;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }
        
        .signature-block {
          width: 45%;
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          margin: 25px 0 5px 0;
          min-height: 40px;
        }
        
        .signature-label {
          font-size: 9px;
          margin-top: 4px;
        }
        
        /* Rodapé */
        .footer {
          position: fixed;
          bottom: 10mm;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 8px;
          color: #666;
          z-index: 1;
          padding: 0 10mm;
          display: flex;
          justify-content: space-between;
        }
      </style>
    </head>
    <body>
      <div class="watermark">${dados.idioma === 'pt' ? 'CÓPIA' : 'コピー'}</div>
      
      <div class="page">
        <!-- Cabeçalho -->
        <div class="header">
          <h1>${dados.empresa.nome}</h1>
          <p>${dados.idioma === 'pt' ? 'Registro:' : '登録番号：'} ${dados.empresa.numeroAutorizacao}</p>
          <p>${dados.idioma === 'pt' ? 'Telefone:' : '電話：'} ${dados.empresa.telefone}</p>
          <p>${dados.idioma === 'pt' ? 'Data de Emissão:' : '発行日：'} ${dados.dataEmissao}</p>
        </div>

        <!-- Conteúdo -->
        <div class="content">
          <div class="title">${clausulas.titulo}</div>

          <!-- Dados dos Envolvidos -->
          <div class="section">
            <table class="data-table">
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Vendedor:' : '売主：'}</strong></td>
                <td>${dados.empresa.nome}</td>
              </tr>
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Comprador:' : '買主：'}</strong></td>
                <td>${dados.cliente.nome}</td>
              </tr>
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'CNH:' : '運転免許証：'}</strong></td>
                <td>${dados.cliente.cnh_number || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <!-- Dados do Veículo -->
          <div class="section">
            <table class="data-table">
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Marca:' : 'ブランド：'}</strong></td>
                <td>${dados.veiculo.marca}</td>
                <td><strong>${dados.idioma === 'pt' ? 'Modelo:' : 'モデル：'}</strong></td>
                <td>${dados.veiculo.modelo}</td>
              </tr>
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Placa:' : 'ナンバープレート：'}</strong></td>
                <td>${dados.veiculo.placa}</td>
                <td><strong>${dados.idioma === 'pt' ? 'Ano:' : '年式：'}</strong></td>
                <td>${dados.veiculo.ano}</td>
              </tr>
            </table>
          </div>

          <!-- Dados Financeiros -->
          <div class="section">
            <table class="data-table">
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Preço Total:' : '総価格：'}</strong></td>
                <td>R$ ${dados.preco.toFixed(2)}</td>
                <td><strong>${dados.idioma === 'pt' ? 'Sinal:' : '頭金：'}</strong></td>
                <td>R$ ${dados.sinal.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>${dados.idioma === 'pt' ? 'Parcelas:' : '分割払い：'}</strong></td>
                <td>${dados.parcelas}x R$ ${valorParcela}</td>
                <td></td>
                <td></td>
              </tr>
            </table>
          </div>

          <!-- Cláusulas -->
          <div class="section">
            <div class="clause-header">${clausulas.clausula1.numero} - ${clausulas.clausula1.titulo}</div>
            <div class="clause-content">${clausulas.clausula1.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula2.numero} - ${clausulas.clausula2.titulo}</div>
            <div class="clause-content">${clausulas.clausula2.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula3.numero} - ${clausulas.clausula3.titulo}</div>
            <div class="clause-content">${clausulas.clausula3.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula4.numero} - ${clausulas.clausula4.titulo}</div>
            <div class="clause-content">${clausulas.clausula4.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula5.numero} - ${clausulas.clausula5.titulo}</div>
            <div class="clause-content">${clausulas.clausula5.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula6.numero} - ${clausulas.clausula6.titulo}</div>
            <div class="clause-content">${clausulas.clausula6.conteudo}</div>
          </div>

          <div class="section">
            <div class="clause-header">${clausulas.clausula7.numero} - ${clausulas.clausula7.titulo}</div>
            <div class="clause-content">${clausulas.clausula7.conteudo}</div>
          </div>

          <!-- Assinaturas -->
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-label">${dados.idioma === 'pt' ? 'Vendedor' : '売主'}</div>
              <div class="signature-line"></div>
              <div class="signature-label">${dados.empresa.nome}</div>
            </div>
            <div class="signature-block">
              <div class="signature-label">${dados.idioma === 'pt' ? 'Comprador' : '買主'}</div>
              <div class="signature-line"></div>
              <div class="signature-label">${dados.cliente.nome}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé -->
      <div class="footer">
        <span>${dados.dataEmissao}</span>
        <span>${dados.idioma === 'pt' ? 'Página 1 de 1' : 'ページ 1 / 1'}</span>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE GERAÇÃO DE PDF
// ============================================================================

export async function generateContratoPDF(
  cliente: Cliente,
  veiculo: Veiculo,
  preco: number,
  sinal: number,
  parcelas: number,
  empresa: ConfiguracaoEmpresa,
  idioma: 'pt' | 'vi' | 'fil' | 'ja' = 'pt'
): Promise<void> {
  const dataEmissao = new Date().toISOString().split('T')[0];
  
  const dados: DadosContrato = {
    cliente,
    veiculo,
    preco,
    sinal,
    parcelas,
    dataEmissao,
    empresa,
    idioma,
  };

  const htmlContent = gerarHTMLContrato(dados);
  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const opt = {
    margin: 0,
    filename: `contrato-${cliente.client_id}-${dataEmissao}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  // html2pdf retorna uma Promise sem type definitivo
  const pdf = html2pdf();
  pdf
    .set(opt)
    .from(element)
    .save();
}

export default generateContratoPDF;
