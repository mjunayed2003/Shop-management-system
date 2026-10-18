// POS Printing Subsystem: PrinterAdapter interface, BrowserPrintAdapter (hidden iframe),
// print settings persistence, and receipt styling.

export type ReceiptFormat = 'THERMAL_58' | 'THERMAL_80' | 'A4';

export interface PosPrintSettings {
  format: ReceiptFormat;
  autoPrint: boolean;
  copies: number;
  footerText: string;
  showShopLogo: boolean;
  logoDataUrl?: string;
  showBinTin: boolean;
  showCashierName: boolean;
  showCustomerDue: boolean;
  showLoyaltyPoints: boolean;
  showBarcode: boolean;
  useBanglaDigits: boolean;
  fontSize: 'small' | 'medium' | 'large';
  paperWidthMm?: number;
}

export const DEFAULT_PRINT_SETTINGS: PosPrintSettings = {
  format: 'THERMAL_80',
  autoPrint: true,
  copies: 1,
  footerText: 'Thank you for shopping with us! Please keep this receipt for exchanges within 7 days.',
  showShopLogo: false,
  showBinTin: true,
  showCashierName: true,
  showCustomerDue: true,
  showLoyaltyPoints: true,
  showBarcode: true,
  useBanglaDigits: false,
  fontSize: 'medium',
  paperWidthMm: 80,
};

const PRINT_SETTINGS_KEY = 'pos_device_print_settings';

export function getPrintSettings(): PosPrintSettings {
  if (typeof window === 'undefined') return DEFAULT_PRINT_SETTINGS;
  try {
    const raw = localStorage.getItem(PRINT_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PRINT_SETTINGS;
}

export function savePrintSettings(settings: Partial<PosPrintSettings>): PosPrintSettings {
  const updated = { ...getPrintSettings(), ...settings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}

export function toBanglaDigits(val: string | number): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => banglaDigits[Number(d)]);
}

export interface PrintJobOptions {
  copies?: number;
  format?: ReceiptFormat;
}

export interface PrinterAdapter {
  printReceipt(htmlContent: string, options?: PrintJobOptions): Promise<boolean>;
}

export class BrowserPrintAdapter implements PrinterAdapter {
  public async printReceipt(
    htmlContent: string,
    options?: PrintJobOptions,
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    return new Promise((resolve) => {
      try {
        let iframe = document.getElementById(
          '__pos_print_iframe__',
        ) as HTMLIFrameElement | null;

        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = '__pos_print_iframe__';
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          iframe.style.visibility = 'hidden';
          document.body.appendChild(iframe);
        }

        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          resolve(false);
          return;
        }

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Allow fonts and resources to render before calling print
        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus();
            const copies = options?.copies || 1;
            for (let c = 0; c < copies; c++) {
              iframe?.contentWindow?.print();
            }
            resolve(true);
          } catch {
            resolve(false);
          }
        }, 200);
      } catch {
        resolve(false);
      }
    });
  }
}

export const defaultPrinterAdapter: PrinterAdapter = new BrowserPrintAdapter();
