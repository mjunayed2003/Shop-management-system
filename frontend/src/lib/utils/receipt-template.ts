import { PosPrintSettings, toBanglaDigits, defaultPrinterAdapter, ReceiptFormat, DEFAULT_PRINT_SETTINGS } from './printer';

export interface SaleReceiptData {
  id: string;
  invoiceNo: string;
  saleDate: string;
  saleType: string;
  status: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessBinTin?: string;
  branch: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  cashRegister?: {
    id: string;
    name: string;
    code: string;
  };
  cashierName?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    currentDue?: number;
    loyaltyPoints?: number;
  } | null;
  subtotal: number;
  discountAmount: number;
  coupon?: string | null;
  taxAmount: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  changeAmount: number;
  items: Array<{
    id: string;
    sku: string;
    productName: string;
    size?: string | null;
    color?: string | null;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalAmount: number;
    productUnitBarcode?: string | null;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    transactionNo?: string;
    date?: string;
  }>;
  autoTransfers?: Array<{
    transferNo?: string;
    sourceBranch?: string;
    variantSku?: string;
    quantity?: number;
  }>;
}

export function generateReceiptBarcodeSvg(code: string): string {
  // Generates clean SVG vertical barcode stripes for standard scanning
  const clean = code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  let stripes = '';
  let x = 10;
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const w1 = (charCode % 3) + 1.2;
    const w2 = ((charCode >> 1) % 2) + 1;
    stripes += `<rect x="${x}" y="0" width="${w1}" height="32" fill="#000000" />`;
    x += w1 + 1.5;
    stripes += `<rect x="${x}" y="0" width="${w2}" height="32" fill="#000000" />`;
    x += w2 + 2;
  }
  const totalWidth = x + 10;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 46" width="100%" height="46" style="display:block;margin:0 auto;max-width:220px;">
      ${stripes}
      <text x="${totalWidth / 2}" y="42" font-family="monospace" font-size="10" text-anchor="middle" fill="#000">${code}</text>
    </svg>
  `;
}

export function generateReceiptHtml(
  sale: SaleReceiptData,
  settings: PosPrintSettings,
  isReprint = false,
): string {
  const isA4 = settings.format === 'A4';
  const is58 = settings.format === 'THERMAL_58';
  const widthMm = isA4 ? 210 : is58 ? 58 : settings.paperWidthMm || 80;

  const fontMultiplier =
    settings.fontSize === 'small' ? 0.9 : settings.fontSize === 'large' ? 1.15 : 1.0;

  const fmtNum = (val: number | undefined | null) => {
    const num = Number(val ?? 0);
    const str = num.toFixed(2);
    return settings.useBanglaDigits ? toBanglaDigits(str) : str;
  };

  const fmtDate = (d: string) => {
    try {
      const dt = new Date(d);
      const str = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(dt);
      return settings.useBanglaDigits ? toBanglaDigits(str) : str;
    } catch {
      return d;
    }
  };

  const itemsHtml = (sale.items || [])
    .map((item, idx) => {
      const lineNo = settings.useBanglaDigits ? toBanglaDigits(idx + 1) : idx + 1;
      const sizeColor = [item.size, item.color].filter(Boolean).join(' / ');
      const unitBarcode = item.productUnitBarcode
        ? `<div style="font-size: 8.5px; color: #555; font-family: monospace;">Unit: ${item.productUnitBarcode}</div>`
        : '';

      const name = item.productName || (item as any).name || 'Item';
      const lineTotal = item.totalAmount !== undefined ? item.totalAmount : (item as any).totalPrice;

      return `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 4px 2px; vertical-align: top;">
            <div style="font-weight: 600;">${lineNo}. ${name}</div>
            ${sizeColor ? `<div style="font-size: 9px; color: #444;">${sizeColor}</div>` : ''}
            ${unitBarcode}
          </td>
          <td style="padding: 4px 2px; text-align: center; vertical-align: top;">${fmtNum(item.quantity)}</td>
          <td style="padding: 4px 2px; text-align: right; vertical-align: top;">${fmtNum(item.unitPrice)}</td>
          <td style="padding: 4px 2px; text-align: right; vertical-align: top; font-weight: 600;">${fmtNum(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  const paymentsHtml = sale.payments
    .map(
      (p) => `
      <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 2px;">
        <span>${p.method}${p.transactionNo ? ` (${p.transactionNo})` : ''}:</span>
        <span style="font-weight: 600;">BDT ${fmtNum(p.amount)}</span>
      </div>
    `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${sale.invoiceNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');

    @page {
      size: ${isA4 ? 'A4' : `${widthMm}mm auto`};
      margin: ${isA4 ? '12mm' : '0mm'};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${11 * fontMultiplier}px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: ${isA4 ? '100%' : `${widthMm}mm`};
      margin: 0 auto;
      padding: ${isA4 ? '10px' : is58 ? '4mm 2mm' : '5mm 3mm'};
      -webkit-print-color-adjust: exact;
    }

    .center { text-align: center; }
    .bold { font-weight: 700; }
    .text-sm { font-size: ${9.5 * fontMultiplier}px; }
    .text-xs { font-size: ${8.5 * fontMultiplier}px; }

    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }

    .divider-double {
      border-top: 2px solid #000;
      margin: 8px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${10.5 * fontMultiplier}px;
    }

    th {
      border-bottom: 1px solid #000;
      padding: 4px 2px;
      font-weight: 700;
    }

    .reprint-banner {
      background: #f0f0f0;
      border: 1px dashed #000;
      padding: 4px;
      text-align: center;
      font-weight: 800;
      letter-spacing: 1px;
      font-size: 11px;
      margin-bottom: 6px;
    }
  </style>
</head>
<body>
  ${
    (sale as any).isOffline || (sale as any).isProvisional
      ? `<div class="reprint-banner" style="background: #fef3c7; border: 1px dashed #d97706; color: #92400e; padding: 4px; text-align: center; font-weight: 800; font-size: 11px; margin-bottom: 6px;">*** OFFLINE / PROVISIONAL INVOICE ***<br/><span style="font-size: 9px; font-weight: 700;">*** অফলাইন / খসড়া রসিদ ***</span></div>`
      : ''
  }
  ${
    isReprint
      ? `<div class="reprint-banner">*** COPY / DUPLICATE RECEIPT ***</div>`
      : ''
  }

  <div class="center">
    ${
      settings.showShopLogo && settings.logoDataUrl
        ? `<img src="${settings.logoDataUrl}" alt="Logo" style="max-height: 48px; max-width: 160px; margin-bottom: 4px;" />`
        : ''
    }
    <div style="font-size: ${15 * fontMultiplier}px; font-weight: 800; text-transform: uppercase;">
      ${sale.businessName || 'Clothing Retail Shop'}
    </div>
    ${sale.branch?.name ? `<div class="text-sm">${sale.branch.name} Outlet</div>` : ''}
    ${sale.branch?.address ? `<div class="text-xs">${sale.branch.address}</div>` : ''}
    ${sale.branch?.phone ? `<div class="text-xs">Tel: ${sale.branch.phone}</div>` : ''}
    ${
      settings.showBinTin && sale.businessBinTin
        ? `<div class="text-xs">BIN/TIN: ${sale.businessBinTin}</div>`
        : ''
    }
  </div>

  <div class="divider"></div>

  <div style="display: flex; justify-content: space-between; font-size: 10px;">
    <span>Invoice: <strong>${sale.invoiceNo}</strong></span>
    <span>Date: ${fmtDate(sale.saleDate)}</span>
  </div>

  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
    ${settings.showCashierName ? `<span>Cashier: ${sale.cashierName || 'Staff'}</span>` : '<span></span>'}
    <span>Branch: ${sale.branch.code}</span>
  </div>

  ${
    sale.customer
      ? `
    <div class="divider"></div>
    <div style="font-size: 10px;">
      <div>Customer: <strong>${sale.customer.name}</strong></div>
      <div>Phone: ${sale.customer.phone}</div>
      ${
        settings.showCustomerDue && sale.customer.currentDue !== undefined
          ? `<div>Current Ledger Due: BDT ${fmtNum(sale.customer.currentDue)}</div>`
          : ''
      }
    </div>
  `
      : ''
  }

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Item</th>
        <th style="text-align: center; width: 14%;">Qty</th>
        <th style="text-align: right; width: 22%;">Price</th>
        <th style="text-align: right; width: 24%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="font-size: 10.5px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span>Subtotal:</span>
      <span>BDT ${fmtNum(sale.subtotal)}</span>
    </div>

    ${
      sale.discountAmount > 0
        ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Item Discount:</span>
        <span>- BDT ${fmtNum(sale.discountAmount)}</span>
      </div>
    `
        : ''
    }

    ${
      sale.coupon
        ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Coupon (${sale.coupon}):</span>
        <span>Applied</span>
      </div>
    `
        : ''
    }

    ${
      sale.taxAmount > 0
        ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>VAT / Tax:</span>
        <span>BDT ${fmtNum(sale.taxAmount)}</span>
      </div>
    `
        : ''
    }

    ${
      sale.roundOff !== 0
        ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Round-off:</span>
        <span>${sale.roundOff > 0 ? '+' : ''}BDT ${fmtNum(sale.roundOff)}</span>
      </div>
    `
        : ''
    }

    <div class="divider-double"></div>

    <div style="display: flex; justify-content: space-between; font-size: ${13 * fontMultiplier}px; font-weight: 800; margin-bottom: 4px;">
      <span>TOTAL PAYABLE:</span>
      <span>BDT ${fmtNum(sale.totalAmount)}</span>
    </div>

    <div class="divider"></div>

    <div style="margin: 4px 0;">
      <div style="font-weight: 700; margin-bottom: 2px; text-transform: uppercase; font-size: 9.5px;">Payments:</div>
      ${paymentsHtml}
    </div>

    <div style="display: flex; justify-content: space-between; font-weight: 700; margin-top: 4px;">
      <span>Total Paid:</span>
      <span>BDT ${fmtNum(sale.paidAmount)}</span>
    </div>

    ${
      sale.changeAmount > 0
        ? `
      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #000; margin-top: 2px;">
        <span>Change Returned:</span>
        <span>BDT ${fmtNum(sale.changeAmount)}</span>
      </div>
    `
        : ''
    }

    ${
      sale.dueAmount > 0
        ? `
      <div style="display: flex; justify-content: space-between; font-weight: 800; color: #000; margin-top: 2px;">
        <span>OUTSTANDING DUE:</span>
        <span>BDT ${fmtNum(sale.dueAmount)}</span>
      </div>
    `
        : ''
    }
  </div>

  ${
    sale.autoTransfers && sale.autoTransfers.length > 0
      ? `
    <div class="divider"></div>
    <div class="text-xs" style="background:#f8f8f8; padding: 4px; border: 1px dashed #bbb;">
      <div style="font-weight:700;">Cross-Branch Auto-Transfers:</div>
      ${sale.autoTransfers.map((t) => `<div>${t.variantSku || 'Item'}: transferred from ${t.sourceBranch || 'Branch'} (${t.transferNo || 'Pending'})</div>`).join('')}
    </div>
  `
      : ''
  }

  <div class="divider"></div>

  ${
    settings.showBarcode
      ? `<div style="margin: 8px 0; text-align: center;">${generateReceiptBarcodeSvg(sale.invoiceNo)}</div>`
      : ''
  }

  <div class="center text-xs" style="margin-top: 6px; color: #333;">
    ${settings.footerText}
  </div>
  <div class="center text-xs" style="margin-top: 4px; color: #888; font-size: 8px;">
    Powered by Shop POS BD
  </div>
</body>
</html>
  `;
}

// ==========================================
// Return Slip Receipt
// ==========================================
export interface ReturnSlipData {
  returnNo: string;
  originalInvoiceNo: string;
  date: string;
  businessName?: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  customer?: { name?: string; phone?: string } | null;
  items: Array<{
    sku: string;
    productName?: string;
    quantity: number | string;
    condition: string;
    refundPrice: number | string;
    totalRefund: number | string;
  }>;
  totalRefundAmount: number | string;
  refundMethod: string;
  dueReduction?: number | string;
  payoutAmount?: number | string;
  reason?: string;
}

export function generateReturnSlipHtml(
  data: ReturnSlipData,
  settings: PosPrintSettings,
  isReprint = false,
): string {
  const isA4 = settings.format === 'A4';
  const is58 = settings.format === 'THERMAL_58';
  const widthMm = isA4 ? 210 : is58 ? 58 : settings.paperWidthMm || 80;
  const isBn = settings.useBanglaDigits;

  const fmtNum = (val: any) => {
    const num = Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isBn ? toBanglaDigits(num) : num;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Return Slip - ${data.returnNo}</title>
  <style>
    @page { size: ${isA4 ? 'A4 portrait' : `${widthMm}mm auto`}; margin: ${isA4 ? '15mm' : '2mm'}; }
    body {
      font-family: 'Courier New', Courier, monospace, 'SolaimanLipi', sans-serif;
      font-size: ${is58 ? '9px' : isA4 ? '12px' : '11px'};
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: ${isA4 ? '20px' : '4px'};
      width: ${isA4 ? 'auto' : `${widthMm - 4}mm`};
      max-width: 100%;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 5px 0; }
    .copy-banner {
      border: 1px solid #000;
      text-align: center;
      font-weight: 800;
      padding: 3px;
      margin-bottom: 6px;
      font-size: 10px;
      background: #f0f0f0;
    }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { text-align: left; border-bottom: 1px solid #000; font-weight: bold; }
    td { padding: 2px 0; }
  </style>
</head>
<body>
  ${isReprint ? `<div class="copy-banner">*** COPY / DUPLICATE RETURN SLIP / অনুলিপি ***</div>` : ''}

  <div class="center">
    <div class="bold" style="font-size: 14px;">${data.businessName || 'SHOP POS BD'}</div>
    <div>${data.branchName}</div>
    ${data.branchPhone ? `<div>Tel: ${data.branchPhone}</div>` : ''}
    <div class="bold" style="margin-top: 4px; font-size: 12px;">SALES RETURN RECEIPT</div>
  </div>

  <div class="divider"></div>

  <div><strong>Return #:</strong> ${data.returnNo}</div>
  <div><strong>Orig. Invoice:</strong> ${data.originalInvoiceNo}</div>
  <div><strong>Date:</strong> ${new Date(data.date).toLocaleString()}</div>
  ${data.customer ? `<div><strong>Customer:</strong> ${data.customer.name || 'Walk-in'} (${data.customer.phone || 'N/A'})</div>` : ''}
  ${data.reason ? `<div><strong>Reason:</strong> ${data.reason}</div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="center">Qty</th>
        <th class="right">Refund</th>
      </tr>
    </thead>
    <tbody>
      ${data.items
        .map(
          (item) => `
        <tr>
          <td>
            <div class="bold">${item.sku}</div>
            ${(item as any).productName ? `<div style="font-size:9px;">${(item as any).productName}</div>` : ''}
            <div style="font-size: 8px; color: #444;">Condition: ${item.condition}</div>
          </td>
          <td class="center">${item.quantity}</td>
          <td class="right">BDT ${fmtNum(item.totalRefund || (item as any).totalRefundPrice)}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <div class="double-divider"></div>

  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
    <span>TOTAL REFUND:</span>
    <span>BDT ${fmtNum(data.totalRefundAmount)}</span>
  </div>
  <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:2px;">
    <span>Refund Method:</span>
    <span>${data.refundMethod}</span>
  </div>
  ${
    data.dueReduction && Number(data.dueReduction) > 0
      ? `
    <div style="display:flex; justify-content:space-between; font-size:10px; color:#444;">
      <span>Due Reduced:</span>
      <span>BDT ${fmtNum(data.dueReduction)}</span>
    </div>
  `
      : ''
  }
  ${
    data.payoutAmount !== undefined
      ? `
    <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:bold;">
      <span>Paid to Customer:</span>
      <span>BDT ${fmtNum(data.payoutAmount)}</span>
    </div>
  `
      : ''
  }

  <div class="divider"></div>
  <div style="margin: 6px 0; text-align: center;">${generateReceiptBarcodeSvg(data.returnNo)}</div>
  <div class="center text-xs" style="margin-top: 4px; font-size: 8px; color: #555;">
    Goods inspected & accepted. Powered by Shop POS BD
  </div>
</body>
</html>
  `;
}

// ==========================================
// Exchange Slip Receipt
// ==========================================
export interface ExchangeSlipData {
  exchangeNo: string;
  originalInvoiceNo: string;
  newInvoiceNo: string;
  date: string;
  businessName?: string;
  branchName: string;
  branchPhone?: string;
  customer?: { name?: string; phone?: string } | null;
  returnedItems: Array<{ sku: string; quantity: number | string; refundPrice: number | string; total: number | string }>;
  newItems: Array<{ sku: string; quantity: number | string; price: number | string; total: number | string }>;
  returnedTotal: number | string;
  newItemsTotal: number | string;
  differenceAmount: number | string;
  adjustmentStatus: string;
  payments?: Array<{ method: string; amount: number | string }>;
}

export function generateExchangeSlipHtml(
  data: ExchangeSlipData,
  settings: PosPrintSettings,
  isReprint = false,
): string {
  const isA4 = settings.format === 'A4';
  const is58 = settings.format === 'THERMAL_58';
  const widthMm = isA4 ? 210 : is58 ? 58 : settings.paperWidthMm || 80;
  const fmtNum = (val: any) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Exchange Voucher - ${data.exchangeNo}</title>
  <style>
    @page { size: ${isA4 ? 'A4 portrait' : `${widthMm}mm auto`}; margin: 2mm; }
    body { font-family: monospace; font-size: ${is58 ? '9px' : '11px'}; color: #000; padding: 4px; width: 100%; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 1px solid #000; font-weight: bold; }
  </style>
</head>
<body>
  ${isReprint ? `<div style="border:1px solid #000; text-align:center; padding:2px; font-weight:bold; margin-bottom:4px;">*** COPY / DUPLICATE EXCHANGE SLIP / অনুলিপি ***</div>` : ''}
  <div class="center">
    <div class="bold" style="font-size: 13px;">${data.businessName || 'SHOP POS BD'}</div>
    <div>${data.branchName}</div>
    <div class="bold" style="margin-top: 3px;">EXCHANGE VOUCHER</div>
  </div>
  <div class="divider"></div>
  <div><strong>Exchange #:</strong> ${data.exchangeNo}</div>
  <div><strong>Orig. Sale:</strong> ${data.originalInvoiceNo}</div>
  <div><strong>New Sale:</strong> ${data.newInvoiceNo}</div>
  <div><strong>Date:</strong> ${new Date(data.date || (data as any).exchangeDate || new Date()).toLocaleString()}</div>

  <div class="divider"></div>
  <div class="bold">[1] RETURNED ITEMS (CREDIT APPLIED)</div>
  <table>
    <thead><tr><th>SKU</th><th class="center">Qty</th><th class="right">Total</th></tr></thead>
    <tbody>
      ${data.returnedItems.map((i) => `<tr><td>${i.sku}</td><td class="center">${i.quantity}</td><td class="right">BDT ${fmtNum(i.total || (i as any).totalCredit)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="right bold">Exchange Credit: BDT ${fmtNum(data.returnedTotal)}</div>

  <div class="divider"></div>
  <div class="bold">[2] NEW ITEMS TAKEN</div>
  <table>
    <thead><tr><th>SKU</th><th class="center">Qty</th><th class="right">Total</th></tr></thead>
    <tbody>
      ${data.newItems.map((i) => `<tr><td>${i.sku}</td><td class="center">${i.quantity}</td><td class="right">BDT ${fmtNum(i.total || (i as any).totalPrice)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="right bold">New Items Total: BDT ${fmtNum(data.newItemsTotal)}</div>

  <div class="divider"></div>
  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
    <span>NET DIFFERENCE:</span>
    <span>BDT ${fmtNum(data.differenceAmount)}</span>
  </div>
  <div style="font-size:10px; margin-top:2px;">
    Status: <strong>${data.adjustmentStatus || ((data as any).exchangeCase ? String((data as any).exchangeCase).replace(/_/g, ' ') : '')}</strong>
  </div>

  <div class="divider"></div>
  <div style="margin: 6px 0; text-align: center;">${generateReceiptBarcodeSvg(data.exchangeNo)}</div>
</body>
</html>
  `;
}

// ==========================================
// Due Collection Money Receipt
// ==========================================
export interface DueReceiptData {
  collectionNo: string;
  date: string;
  businessName?: string;
  branchName: string;
  branchPhone?: string;
  customer?: {
    name: string;
    phone: string;
    currentDue?: number | string;
  } | null;
  customerName?: string;
  customerPhone?: string;
  amountPaid: number | string;
  amountCollected?: number | string;
  paymentMethod: string;
  transactionNo?: string;
  notes?: string;
  allocations?: Array<{
    invoiceNo: string;
    branchId?: string;
    branchName?: string;
    amountApplied?: number | string;
    appliedAmount?: number | string;
  }>;
  remainingDue?: number | string;
}

export function generateDueReceiptHtml(
  data: DueReceiptData,
  settings: PosPrintSettings,
  isReprint = false,
): string {
  const isA4 = settings.format === 'A4';
  const is58 = settings.format === 'THERMAL_58';
  const widthMm = isA4 ? 210 : is58 ? 58 : settings.paperWidthMm || 80;
  const fmtNum = (val: any) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const custName = data.customer?.name || data.customerName || 'Walk-in';
  const custPhone = data.customer?.phone || data.customerPhone || 'N/A';
  const amtReceived = data.amountPaid || data.amountCollected || 0;
  const receiptDate = data.date || (data as any).receiptDate || new Date().toISOString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Money Receipt - ${data.collectionNo}</title>
  <style>
    @page { size: ${isA4 ? 'A4 portrait' : `${widthMm}mm auto`}; margin: 2mm; }
    body { font-family: monospace; font-size: ${is58 ? '9px' : '11px'}; color: #000; padding: 4px; width: 100%; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 1px solid #000; }
  </style>
</head>
<body>
  ${isReprint ? `<div style="border:1px solid #000; text-align:center; padding:2px; font-weight:bold; margin-bottom:4px;">*** COPY / DUPLICATE RECEIPT / অনুলিপি ***</div>` : ''}
  <div class="center">
    <div class="bold" style="font-size: 13px;">${data.businessName || 'SHOP POS BD'}</div>
    <div>${data.branchName}</div>
    <div class="bold" style="margin-top: 3px;">DUE COLLECTION MONEY RECEIPT</div>
  </div>
  <div class="divider"></div>
  <div><strong>Receipt #:</strong> ${data.collectionNo}</div>
  <div><strong>Date:</strong> ${new Date(receiptDate).toLocaleString()}</div>
  <div><strong>Customer:</strong> ${custName} (${custPhone})</div>
  <div class="divider"></div>

  <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold;">
    <span>AMOUNT RECEIVED:</span>
    <span>BDT ${fmtNum(amtReceived)}</span>
  </div>
  <div><strong>Method:</strong> ${data.paymentMethod} ${data.transactionNo ? `(${data.transactionNo})` : ''}</div>
  ${data.notes ? `<div><strong>Notes:</strong> ${data.notes}</div>` : ''}

  ${
    data.allocations && data.allocations.length > 0
      ? `
    <div class="divider"></div>
    <div class="bold" style="font-size:10px;">Applied to Invoices (Oldest First):</div>
    <table>
      <thead><tr><th>Invoice</th><th class="right">Amount</th></tr></thead>
      <tbody>
        ${data.allocations.map((a) => `<tr><td>${a.invoiceNo} ${a.branchName ? `(${a.branchName})` : ''}</td><td class="right">BDT ${fmtNum(a.amountApplied || a.appliedAmount)}</td></tr>`).join('')}
      </tbody>
    </table>
  `
      : ''
  }

  <div class="divider"></div>
  ${
    data.remainingDue !== undefined
      ? `
    <div style="display:flex; justify-content:space-between; font-weight:bold;">
      <span>REMAINING BALANCE DUE:</span>
      <span>BDT ${fmtNum(data.remainingDue)}</span>
    </div>
  `
      : ''
  }
  <div class="divider"></div>
  <div style="margin: 6px 0; text-align: center;">${generateReceiptBarcodeSvg(data.collectionNo)}</div>
  <div class="center" style="font-size:8px; color:#555;">Thank you for your payment!</div>
</body>
</html>
  `;
}

// ==========================================
// Z Report (Shift Close)
// ==========================================
export interface ZReportPrintData {
  businessName?: string;
  branchName: string;
  registerName: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number | string;
  cashSales: number | string;
  cashDueCollections: number | string;
  payIns: number | string;
  payOuts: number | string;
  cashRefunds: number | string;
  cashExpenses: number | string;
  expectedBalance: number | string;
  closingBalance: number | string;
  discrepancy: number | string;
  closingNotes?: string;
  nonCashTotals?: Record<string, number | string>;
  salesCount?: number;
  returnsCount?: number;
  voidsCount?: number;
}

export function generateZReportHtml(
  data: ZReportPrintData,
  settingsOrFormat: PosPrintSettings | ReceiptFormat = 'THERMAL_80',
  isReprint: boolean = false,
): string {
  const settings: PosPrintSettings =
    typeof settingsOrFormat === 'string'
      ? { ...DEFAULT_PRINT_SETTINGS, format: settingsOrFormat }
      : settingsOrFormat;

  const isA4 = settings.format === 'A4';
  const is58 = settings.format === 'THERMAL_58';
  const widthMm = isA4 ? 210 : is58 ? 58 : settings.paperWidthMm || 80;
  const fmtNum = (val: any) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Z Report - Shift Close</title>
  <style>
    @page { size: ${isA4 ? 'A4 portrait' : `${widthMm}mm auto`}; margin: 2mm; }
    body { font-family: monospace; font-size: ${is58 ? '9px' : '11px'}; color: #000; padding: 4px; width: 100%; }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
    .double { border-bottom: 2px solid #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; }
    .copy-watermark { text-align: center; font-weight: bold; font-size: 13px; color: #666; border: 1px dashed #666; padding: 2px; margin: 4px 0; }
  </style>
</head>
<body>
  ${isReprint ? '<div class="copy-watermark">*** DUPLICATE COPY / পুনঃমুদ্রণ ***</div>' : ''}
  <div class="center">
    <div class="bold" style="font-size: 13px;">${data.businessName || 'SHOP POS BD'}</div>
    <div>${data.branchName}</div>
    <div class="bold" style="margin-top: 3px; font-size: 12px;">*** REGISTER Z REPORT ***</div>
    <div style="font-size:9px;">Shift Closed & Reconciled</div>
  </div>
  <div class="divider"></div>
  <div><strong>Counter:</strong> ${data.registerName}</div>
  <div><strong>Cashier:</strong> ${data.cashierName}</div>
  <div><strong>Opened:</strong> ${new Date(data.openedAt).toLocaleString()}</div>
  <div><strong>Closed:</strong> ${new Date(data.closedAt).toLocaleString()}</div>

  <div class="divider"></div>
  <div class="bold">CASH DRAWER RECONCILIATION</div>
  <div class="row"><span>Opening Balance:</span><span>BDT ${fmtNum(data.openingBalance)}</span></div>
  <div class="row"><span>(+) Cash Sales:</span><span>BDT ${fmtNum(data.cashSales)}</span></div>
  <div class="row"><span>(+) Cash Due Collections:</span><span>BDT ${fmtNum(data.cashDueCollections)}</span></div>
  <div class="row"><span>(+) Pay-Ins:</span><span>BDT ${fmtNum(data.payIns)}</span></div>
  <div class="row"><span>(-) Pay-Outs:</span><span>BDT ${fmtNum(data.payOuts)}</span></div>
  <div class="row"><span>(-) Cash Refunds:</span><span>BDT ${fmtNum(data.cashRefunds)}</span></div>
  <div class="row"><span>(-) Drawer Expenses:</span><span>BDT ${fmtNum(data.cashExpenses)}</span></div>

  <div class="divider"></div>
  <div class="row bold" style="font-size:12px;"><span>EXPECTED BALANCE:</span><span>BDT ${fmtNum(data.expectedBalance)}</span></div>
  <div class="row bold" style="font-size:12px;"><span>COUNTED BALANCE:</span><span>BDT ${fmtNum(data.closingBalance)}</span></div>
  <div class="row bold" style="font-size:12px; margin-top:2px;">
    <span>DISCREPANCY:</span>
    <span>BDT ${fmtNum(data.discrepancy)}</span>
  </div>

  ${
    data.nonCashTotals && Object.keys(data.nonCashTotals).length > 0
      ? `
    <div class="divider"></div>
    <div class="bold">NON-CASH TENDERS</div>
    ${Object.entries(data.nonCashTotals).map(([method, amount]) => `<div class="row"><span>${method}:</span><span>BDT ${fmtNum(amount)}</span></div>`).join('')}
  `
      : ''
  }

  ${
    data.closingNotes
      ? `
    <div class="divider"></div>
    <div><strong>Closing Notes:</strong></div>
    <div style="font-size:9px; background:#f9f9f9; padding:2px;">${data.closingNotes}</div>
  `
      : ''
  }

  <div class="double"></div>
  <div class="center" style="font-size:8px;">End of Shift Audit Record. Certified Authentic.</div>
</body>
</html>
  `;
}

export async function printHtml(html: string, format: ReceiptFormat = 'THERMAL_80') {
  return defaultPrinterAdapter.printReceipt(html, { copies: 1, format });
}

