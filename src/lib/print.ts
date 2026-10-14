import { fmtBRL, fmtDate } from './format';
import { today } from './dates';
import type { DadosRecibo } from '@/features/folha/RecibosFolhaDialog';

export interface DadosEmpreiteiroImpressao {
  empreiteiroNome: string;
  empreiteiroCpf?: string;
  empreiteiroTelefone?: string;
  empreiteiroPix?: string;
  tipo: string;
  inicio: string;
  fim: string;
  dataEmissao?: string;
  itens: Array<{
    nome: string;
    funcao: string;
    diasTrabalhados: number;
    diaria: number;
    total: number;
    isEmpreiteiroProprio?: boolean;
  }>;
  totalGeral: number;
}

/**
 * Imprime HTML diretamente através de um iframe isolado de alta performance.
 * - Não afeta o DOM da aplicação React principal
 * - Não trava a thread da UI nem causa recálculos pesados de layout
 * - Não sofre com timeouts prematuros durante o diálogo do navegador
 * - 100% compatível com iOS Safari, Android Chrome e Desktop
 */
export function imprimirHtmlIframe(conteudoHtml: string, tituloDoc: string = 'Recibo de Pagamento CONSTRUTEC') {
  // Remove qualquer iframe de impressão antigo pendente
  const antigo = document.getElementById('construtec-print-iframe');
  if (antigo) {
    try {
      antigo.remove();
    } catch {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'construtec-print-iframe';
  iframe.setAttribute('style', 'position:fixed;right:-9999px;bottom:-9999px;width:10px;height:10px;opacity:0;pointer-events:none;border:none;');

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const css = `
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #fff;
      color: #000;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-page {
      width: 100%;
      box-sizing: border-box;
      padding: 8mm 9mm;
      border: 1.5px solid #000;
      border-radius: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      background: #fff;
      margin-bottom: 24px;
    }
    .receipt-page:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
    }
    .company-title {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1;
    }
    .company-sub {
      font-size: 10px;
      text-transform: uppercase;
      color: #4b5563;
      margin-top: 2px;
    }
    .company-meta {
      font-size: 9.5px;
      color: #374151;
      font-weight: 500;
      margin-top: 1px;
    }
    .header-meta {
      text-align: right;
      font-size: 10px;
    }
    .tag-num {
      display: inline-block;
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .meta-line {
      margin-top: 2px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      background: #f9fafb;
      border: 1px solid #9ca3af;
      border-radius: 4px;
      padding: 8px;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: bold;
      color: #4b5563;
      display: block;
    }
    .info-val {
      font-weight: 600;
      color: #111827;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #9ca3af;
      font-size: 10px;
      margin-bottom: 8px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #d1d5db;
      padding: 5px 8px;
    }
    table.data-table th {
      background: #f3f4f6;
      font-weight: bold;
      text-align: left;
    }
    table.data-table tfoot td {
      background: #f3f4f6;
      font-weight: bold;
      border-top: 1.5px solid #000;
      font-size: 11px;
    }
    .termo-quitacao {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 8px;
      border-radius: 4px;
      font-size: 9.5px;
      color: #1f2937;
      line-height: 1.35;
      margin-bottom: 16px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      text-align: center;
      font-size: 10px;
      padding-top: 8px;
    }
    .sig-line {
      border-top: 1px solid #000;
      padding-top: 4px;
      width: 220px;
      margin: 0 auto;
      font-weight: bold;
    }
    .sig-sub {
      font-size: 9px;
      color: #4b5563;
      margin-top: 2px;
    }
    @media screen {
      body {
        padding: 20px;
        background: #e5e7eb;
      }
      .receipt-page {
        margin: 0 auto 20px auto;
        max-width: 210mm;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      }
    }
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${tituloDoc}</title>
        <style>${css}</style>
      </head>
      <body>
        ${conteudoHtml}
      </body>
    </html>
  `);
  doc.close();

  const disparar = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Erro ao acionar impressão no iframe, tentando window.print:', err);
      window.print();
    }
  };

  // Garante renderização e decodificação das imagens antes de abrir o diálogo
  const imagens = Array.from(doc.images);
  if (imagens.length === 0) {
    setTimeout(disparar, 60);
  } else {
    Promise.all(
      imagens.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve(true);
            else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            }
          })
      )
    ).then(() => {
      setTimeout(disparar, 60);
    });
  }
}

/**
 * Converte a lista de recibos individuais em HTML ultra leve para impressão instantânea.
 */
export function gerarHtmlRecibosIndividuais(recibos: DadosRecibo[]): string {
  const dataAtual = today();

  return recibos
    .map((r) => {
      const obrasStr = r.obrasNomes.length > 0 ? r.obrasNomes.join(', ') : 'Sede / Matriz';
      const ajustesRows = (r.ajustes || [])
        .map(
          (aj) => `
          <tr>
            <td>${aj.descricao}</td>
            <td style="text-align:center;">-</td>
            <td style="text-align:right;">${aj.valor >= 0 ? `+${fmtBRL(aj.valor)}` : fmtBRL(aj.valor)}</td>
          </tr>
        `
        )
        .join('');

      return `
        <div class="receipt-page">
          <div class="header-box">
            <div class="header-brand">
              <img src="/logo-emblema-trim.png" alt="CONSTRUTEC" class="logo-img" />
              <div>
                <div class="company-title">CONSTRUTEC</div>
                <div class="company-sub">Construção Civil & Reformas em Geral</div>
                <div class="company-meta">CNPJ: 35.477.198/0001-83 • Petrolina - PE</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="tag-num">RECIBO DE PAGAMENTO #${r.id.slice(-6).toUpperCase()}</div>
              <div class="meta-line"><strong>Emissão:</strong> ${fmtDate(r.dataEmissao || dataAtual)}</div>
              <div class="meta-line"><strong>Período:</strong> ${fmtDate(r.inicio)} a ${fmtDate(r.fim)}</div>
              <div class="meta-line"><strong>Regime:</strong> ${r.tipo.toUpperCase()}</div>
            </div>
          </div>

          <div class="info-grid">
            <div>
              <span class="info-label">Colaborador / Beneficiário:</span>
              <span class="info-val" style="font-size:11px;">${r.funcionarioNome}</span>
            </div>
            <div>
              <span class="info-label">Função / Regime:</span>
              <span class="info-val">${r.funcionarioFuncao} (${r.funcionarioRegime})</span>
            </div>
            <div>
              <span class="info-label">Telefone / Chave Pix:</span>
              <span class="info-val">${r.funcionarioTelefone || 'Não informado'}</span>
            </div>
            <div>
              <span class="info-label">Canteiro(s) Atuado(s):</span>
              <span class="info-val">${obrasStr}</span>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Discriminação das Diárias e Serviços</th>
                <th style="text-align:center;width:120px;">Referência</th>
                <th style="text-align:right;width:110px;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Remuneração Base apurada no período (${r.tipo})</td>
                <td style="text-align:center;font-weight:600;">${r.diasTrabalhados} dias trabalhados</td>
                <td style="text-align:right;font-weight:600;">${fmtBRL(r.valorBase)}</td>
              </tr>
              ${ajustesRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="text-align:right;text-transform:uppercase;">VALOR LÍQUIDO A RECEBER:</td>
                <td style="text-align:right;font-weight:900;font-size:12px;">${fmtBRL(r.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="termo-quitacao">
            Declaro que recebi da empresa <strong>CONSTRUTEC</strong> a quantia líquida de 
            <strong>${fmtBRL(r.total)}</strong> discriminada neste comprovante, correspondente à quitação integral
            dos serviços e diárias prestados no período de <strong>${fmtDate(r.inicio)} a ${fmtDate(r.fim)}</strong>, 
            dando plena, rasa e irrevogável quitação.
          </div>

          <div class="signatures-grid">
            <div>
              <div class="sig-line">${r.funcionarioNome}</div>
              <div class="sig-sub">Assinatura do Colaborador</div>
            </div>
            <div>
              <div class="sig-line">CONSTRUTEC</div>
              <div class="sig-sub">Encarregado / Responsável Financeiro</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Converte os dados do empreiteiro em HTML otimizado para impressão A4 sem travamentos.
 */
export function gerarHtmlReciboEmpreiteiro(dados: DadosEmpreiteiroImpressao): string {
  const dataAtual = today();

  const itensRows = dados.itens
    .map(
      (item) => `
      <tr>
        <td style="font-weight:600;">${item.nome} ${item.isEmpreiteiroProprio ? '(Empreiteiro)' : ''}</td>
        <td>${item.funcao}</td>
        <td style="text-align:center;font-weight:bold;">${item.diasTrabalhados}</td>
        <td style="text-align:right;">${fmtBRL(item.diaria)}</td>
        <td style="text-align:right;font-weight:bold;">${fmtBRL(item.total)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="receipt-page">
      <div class="header-box">
        <div class="header-brand">
          <img src="/logo-emblema-trim.png" alt="CONSTRUTEC" class="logo-img" />
          <div>
            <div class="company-title">CONSTRUTEC</div>
            <div class="company-sub">Construção Civil & Reformas em Geral</div>
            <div class="company-meta">CNPJ: 35.477.198/0001-83 • Petrolina - PE</div>
          </div>
        </div>
        <div class="header-meta">
          <div class="tag-num">RECIBO CONSOLIDADO DO EMPREITEIRO (${dados.tipo.toUpperCase()})</div>
          <div class="meta-line"><strong>Emissão:</strong> ${fmtDate(dados.dataEmissao || dataAtual)}</div>
          <div class="meta-line"><strong>Período:</strong> ${fmtDate(dados.inicio)} a ${fmtDate(dados.fim)}</div>
        </div>
      </div>

      <div class="info-grid">
        <div>
          <span class="info-label">Empreiteiro Responsável:</span>
          <span class="info-val" style="font-size:11px;">${dados.empreiteiroNome}</span>
        </div>
        <div>
          <span class="info-label">CPF / CNPJ:</span>
          <span class="info-val">${dados.empreiteiroCpf || 'Não informado'}</span>
        </div>
        <div>
          <span class="info-label">Telefone / WhatsApp:</span>
          <span class="info-val">${dados.empreiteiroTelefone || 'Não informado'}</span>
        </div>
        <div>
          <span class="info-label">Chave Pix para Repasse:</span>
          <span class="info-val">${dados.empreiteiroPix || 'Não informada'}</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Nome do Colaborador</th>
            <th>Função</th>
            <th style="text-align:center;width:60px;">Dias</th>
            <th style="text-align:right;width:95px;">Diária (R$)</th>
            <th style="text-align:right;width:105px;">Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${itensRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align:right;text-transform:uppercase;">VALOR TOTAL CONSOLIDADO PARA REPASSE:</td>
            <td style="text-align:right;font-weight:900;font-size:12px;">${fmtBRL(dados.totalGeral)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="termo-quitacao">
        Declaro que recebi da empresa <strong>CONSTRUTEC</strong> a quantia total consolidada de 
        <strong>${fmtBRL(dados.totalGeral)}</strong> discriminada neste comprovante, correspondente
        ao repasse integral de diárias e serviços prestados pela equipe sob minha coordenação no período de 
        <strong>${fmtDate(dados.inicio)} a ${fmtDate(dados.fim)}</strong>, dando plena, rasa e irrevogável quitação.
      </div>

      <div class="signatures-grid">
        <div>
          <div class="sig-line">${dados.empreiteiroNome}</div>
          <div class="sig-sub">Assinatura do Empreiteiro</div>
        </div>
        <div>
          <div class="sig-line">CONSTRUTEC</div>
          <div class="sig-sub">Construtora / Responsável Financeiro</div>
        </div>
      </div>
    </div>
  `;
}
