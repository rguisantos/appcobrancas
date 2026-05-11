import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth-jwt'

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatFormaPagamento(fp: string) {
  const map: Record<string, string> = {
    'Periodo': 'Período (Valor Fixo)',
    'PercentualPagar': 'Percentual a Pagar',
    'PercentualReceber': 'Percentual a Receber',
  }
  return map[fp] || fp
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const cobranca = await db.cobranca.findFirst({
    where: { id, deletedAt: null },
    include: {
      cliente: true,
      produto: true,
      locacao: true,
      pagamentos: { orderBy: { createdAt: 'desc' as const } },
    },
  })

  if (!cobranca) return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })

  const receiptNumber = cobranca.id.substring(0, 8).toUpperCase()
  const descontos = (cobranca.descontoPartidasValor || 0) + (cobranca.descontoDinheiro || 0)
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const statusMap: Record<string, string> = {
    Pendente: 'Pendente',
    Pago: 'Pago',
    Parcial: 'Parcial',
    Atrasado: 'Atrasado',
  }

  const clienteNome = cobranca.cliente?.nomeExibicao || cobranca.clienteNome || '—'
  const clienteId = cobranca.cliente?.identificador || cobranca.clienteId.substring(0, 8)
  const clienteTelefone = cobranca.cliente?.telefonePrincipal || '—'
  const clienteEmail = cobranca.cliente?.email || '—'
  const clienteEndereco = [
    cobranca.cliente?.logradouro,
    cobranca.cliente?.numero,
    cobranca.cliente?.bairro,
    cobranca.cliente?.cidade,
    cobranca.cliente?.estado,
  ].filter(Boolean).join(', ') || '—'

  const produtoIdent = cobranca.produto?.identificador || cobranca.produtoIdentificador || '—'
  const produtoTipo = cobranca.produto?.tipoNome || '—'

  const pagamentosHtml = (cobranca.pagamentos || []).length > 0
    ? `
      <div class="section-title">Histórico de Pagamentos</div>
      <div class="payment-history">
        ${(cobranca.pagamentos || []).map((p: { dataPagamento: string; formaPagamento: string; valor: number; observacao: string | null }) => `
          <div class="payment-row">
            <span>${formatDate(p.dataPagamento)} — ${p.formaPagamento}${p.observacao ? ` (${p.observacao})` : ''}</span>
            <span>${formatCurrency(p.valor)}</span>
          </div>
        `).join('')}
      </div>
    `
    : ''

  const observacaoHtml = cobranca.observacao
    ? `<div class="observation"><strong>Observação:</strong> ${cobranca.observacao}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo - ${clienteNome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #1a1a2e; background: #f0f2f5; }
    .action-bar { position: sticky; top: 0; z-index: 100; background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .action-bar button { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 8px; transition: all 0.15s ease; }
    .btn-print { background: #059669; color: #fff; }
    .btn-print:hover { background: #047857; }
    .btn-close { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
    .btn-close:hover { background: #e5e7eb; }
    .receipt-container { max-width: 800px; margin: 24px auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #0d9488); color: #fff; padding: 28px 32px; }
    .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.85; }
    .receipt-number { text-align: center; font-size: 13px; color: #6b7280; margin: 20px 32px 0; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; }
    .content { padding: 24px 32px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; color: #374151; border-bottom: 2px solid #059669; padding-bottom: 6px; display: inline-block; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0 0; }
    .info-item { padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
    .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
    .info-value { font-size: 14px; font-weight: 500; color: #1a1a2e; margin-top: 2px; }
    .financial { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .financial-row { display: flex; justify-content: space-between; padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .financial-row:last-child { border-bottom: none; }
    .financial-total { font-weight: 700; font-size: 16px; background: #f0fdf4; color: #059669; border-top: 2px solid #059669; }
    .payment-history { margin-top: 8px; }
    .payment-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px dotted #d1d5db; }
    .observation { margin-top: 16px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 13px; color: #92400e; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding: 16px 32px; margin-top: 20px; }

    @media print {
      body { background: #fff; }
      .action-bar { display: none !important; }
      .receipt-container { box-shadow: none; border-radius: 0; margin: 0; max-width: 100%; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .info-item { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .financial-total { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-number { background: #fff !important; border: 1px solid #ccc !important; }
      .observation { background: #fff !important; border: 1px solid #ccc !important; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn-close" onclick="window.close()">✕ Fechar</button>
    <span style="margin-left: auto; font-size: 12px; color: #9ca3af;">Recibo Nº ${receiptNumber}</span>
  </div>

  <div class="receipt-container">
    <div class="header">
      <h1>App Cobranças</h1>
      <p>Recibo de Cobrança — ${dateStr}</p>
    </div>

    <div class="receipt-number">Recibo Nº ${receiptNumber}</div>

    <div class="content">
      <div class="section-title">Informações do Cliente</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nome</div>
          <div class="info-value">${clienteNome}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Identificador</div>
          <div class="info-value">${clienteId}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telefone</div>
          <div class="info-value">${clienteTelefone}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${clienteEmail}</div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div class="info-item" style="max-width: 100%;">
          <div class="info-label">Endereço</div>
          <div class="info-value">${clienteEndereco}</div>
        </div>
      </div>

      <div class="section-title">Produto / Locação</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Produto</div>
          <div class="info-value">${produtoIdent}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Tipo</div>
          <div class="info-value">${produtoTipo}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Forma de Pagamento</div>
          <div class="info-value">${formatFormaPagamento(cobranca.formaPagamento)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">% Empresa</div>
          <div class="info-value">${cobranca.percentualEmpresa}%</div>
        </div>
      </div>

      <div class="section-title">Período</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Data Início</div>
          <div class="info-value">${formatDate(cobranca.dataInicio)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data Fim</div>
          <div class="info-value">${formatDate(cobranca.dataFim)}</div>
        </div>
      </div>

      <div class="section-title">Leitura do Relógio</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Relógio Anterior</div>
          <div class="info-value">${cobranca.relogioAnterior}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Relógio Atual</div>
          <div class="info-value">${cobranca.relogioAtual}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fichas Rodadas</div>
          <div class="info-value">${cobranca.fichasRodadas}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Valor por Ficha</div>
          <div class="info-value">${formatCurrency(cobranca.valorFicha)}</div>
        </div>
      </div>

      <div class="section-title">Resumo Financeiro</div>
      <div class="financial">
        <div class="financial-row">
          <span>Total Bruto</span>
          <span>${formatCurrency(cobranca.totalBruto)}</span>
        </div>
        <div class="financial-row">
          <span>Descontos</span>
          <span style="color: #dc2626;">-${formatCurrency(descontos)}</span>
        </div>
        <div class="financial-row">
          <span>Subtotal após Descontos</span>
          <span>${formatCurrency(cobranca.subtotalAposDescontos)}</span>
        </div>
        <div class="financial-row">
          <span>Percentual Empresa (${cobranca.percentualEmpresa}%)</span>
          <span>${formatCurrency(cobranca.valorPercentual)}</span>
        </div>
        <div class="financial-row financial-total">
          <span>Total Cliente Paga</span>
          <span>${formatCurrency(cobranca.totalClientePaga)}</span>
        </div>
      </div>

      <div class="section-title">Pagamento</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Valor Recebido</div>
          <div class="info-value" style="color: #059669; font-weight: 700;">${formatCurrency(cobranca.valorRecebido)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">${statusMap[cobranca.status] || cobranca.status}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data Pagamento</div>
          <div class="info-value">${formatDate(cobranca.dataPagamento)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Saldo Devedor</div>
          <div class="info-value" style="color: ${cobranca.saldoDevedorGerado > 0 ? '#dc2626' : 'inherit'};">
            ${cobranca.saldoDevedorGerado > 0 ? formatCurrency(cobranca.saldoDevedorGerado) : '—'}
          </div>
        </div>
      </div>

      ${pagamentosHtml}
      ${observacaoHtml}
    </div>

    <div class="footer">
      <p>Documento gerado automaticamente pelo App Cobranças</p>
      <p>${dateStr}</p>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
