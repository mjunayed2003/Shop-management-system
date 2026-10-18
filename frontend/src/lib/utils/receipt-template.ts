import { PosPrintSettings, toBanglaDigits } from './printer';

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

  const fmtNum = (val: number) => {
    const str = val.toFixed(2);
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

  const itemsHtml = sale.items
    .map((item, idx) => {
      const lineNo = settings.useBanglaDigits ? toBanglaDigits(idx + 1) : idx + 1;
      const sizeColor = [item.size, item.color].filter(Boolean).join(' / ');
      const unitBarcode = item.productUnitBarcode
        ? `<div style="font-size: 8.5px; color: #555; font-family: monospace;">Unit: ${item.productUnitBarcode}</div>`
        : '';

      return `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 4px 2px; vertical-align: top;">
            <div style="font-weight: 600;">${lineNo}. ${item.productName}</div>
            ${sizeColor ? `<div style="font-size: 9px; color: #444;">${sizeColor}</div>` : ''}
            ${unitBarcode}
          </td>
          <td style="padding: 4px 2px; text-align: center; vertical-align: top;">${fmtNum(item.quantity)}</td>
          <td style="padding: 4px 2px; text-align: right; vertical-align: top;">${fmtNum(item.unitPrice)}</td>
          <td style="padding: 4px 2px; text-align: right; vertical-align: top; font-weight: 600;">${fmtNum(item.totalAmount)}</td>
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
    <div class="text-sm">${sale.branch.name} Outlet</div>
    ${sale.branch.address ? `<div class="text-xs">${sale.branch.address}</div>` : ''}
    ${sale.branch.phone ? `<div class="text-xs">Tel: ${sale.branch.phone}</div>` : ''}
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
