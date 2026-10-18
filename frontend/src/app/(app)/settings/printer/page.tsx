'use client';

import React, { useState, useEffect } from 'react';
import {
  PosPrintSettings,
  ReceiptFormat,
  getPrintSettings,
  savePrintSettings,
  defaultPrinterAdapter,
} from '@/lib/utils/printer';
import {
  generateReceiptHtml,
  SaleReceiptData,
  generateReceiptBarcodeSvg,
} from '@/lib/utils/receipt-template';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Printer,
  Settings,
  Sliders,
  Check,
  FileText,
  Barcode,
  Terminal,
  Image as ImageIcon,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function PrinterSettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { business } = useAuthStore();
  const { currentBranch } = useBranchStore();

  const [settings, setSettings] = useState<PosPrintSettings>(getPrintSettings());
  const [logoPreview, setLogoPreview] = useState<string | undefined>(settings.logoDataUrl);

  useEffect(() => {
    setSettings(getPrintSettings());
  }, []);

  const handleUpdate = <K extends keyof PosPrintSettings>(
    key: K,
    value: PosPrintSettings[K],
  ) => {
    const updated = savePrintSettings({ [key]: value });
    setSettings(updated);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.error('Logo image must be smaller than 200KB for thermal printing.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      handleUpdate('logoDataUrl', dataUrl);
      handleUpdate('showShopLogo', true);
      toast.success('Printer logo updated');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(undefined);
    handleUpdate('logoDataUrl', undefined);
    handleUpdate('showShopLogo', false);
  };

  const sampleReceiptData: SaleReceiptData = {
    id: 'sample-sale-1',
    invoiceNo: 'INV-20261018-0001',
    saleDate: new Date().toISOString(),
    saleType: 'RETAIL',
    status: 'COMPLETED',
    businessName: business?.name || 'Shop POS BD Demo Boutique',
    businessAddress: 'House 12, Road 4, Banani, Dhaka-1213',
    businessPhone: '+8801700000000',
    businessBinTin: 'BIN: 001234567-0101',
    branch: {
      id: currentBranch?.id || 'branch-1',
      name: currentBranch?.name || 'Dhaka Flagship Outlet',
      code: currentBranch?.code || 'DHK-01',
      address: currentBranch?.address || 'Banani Road 11',
      phone: currentBranch?.phone || '01811112222',
    },
    cashRegister: {
      id: 'reg-1',
      name: 'Register 1',
      code: 'REG-1',
    },
    cashierName: 'Fatima Rahman',
    customer: {
      id: 'c-1',
      name: 'M. Tanvir Hasan',
      phone: '01712345678',
      currentDue: 0,
      loyaltyPoints: 120,
    },
    subtotal: 3200,
    discountAmount: 200,
    coupon: 'EID2026',
    taxAmount: 0,
    roundOff: 0,
    totalAmount: 3000,
    paidAmount: 3000,
    dueAmount: 0,
    changeAmount: 0,
    items: [
      {
        id: 'item-1',
        sku: 'SHIRT-OXF-BLU-L',
        productName: 'Classic Oxford Cotton Shirt (কটন শার্ট)',
        size: 'L',
        color: 'Navy Blue',
        quantity: 1,
        unitPrice: 1800,
        discountAmount: 100,
        totalAmount: 1700,
      },
      {
        id: 'item-2',
        sku: 'PANT-CHINO-KHK-34',
        productName: 'Slim Fit Stretch Chino Pant',
        size: '34',
        color: 'Khaki',
        quantity: 1,
        unitPrice: 1400,
        discountAmount: 100,
        totalAmount: 1300,
        productUnitBarcode: 'UNIT-CHINO-998',
      },
    ],
    payments: [
      {
        id: 'p-1',
        method: 'CASH',
        amount: 2000,
      },
      {
        id: 'p-2',
        method: 'BKASH',
        amount: 1000,
        transactionNo: '9G7A11XYZ',
      },
    ],
  };

  const handleTestPrintReceipt = async () => {
    const html = generateReceiptHtml(sampleReceiptData, settings, false);
    const success = await defaultPrinterAdapter.printReceipt(html, {
      copies: settings.copies,
      format: settings.format,
    });
    if (success) {
      toast.success('Test receipt sent to printer');
    } else {
      toast.error('Print preview failed');
    }
  };

  const handleTestPrintBarcode = async () => {
    const barcodeSvg = generateReceiptBarcodeSvg('SKU-TSHIRT-BLK-M');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Barcode Label Test</title>
        <style>
          @page { size: 50mm 30mm; margin: 0; }
          body { font-family: sans-serif; text-align: center; margin: 0; padding: 2mm; width: 50mm; }
          .title { font-size: 9px; font-weight: bold; overflow: hidden; white-space: nowrap; }
          .price { font-size: 11px; font-weight: 800; margin-top: 1px; }
        </style>
      </head>
      <body>
        <div class="title">Mens Casual Tee - Black / M</div>
        ${barcodeSvg}
        <div class="price">BDT 850.00</div>
      </body>
      </html>
    `;
    await defaultPrinterAdapter.printReceipt(html, {
      copies: 1,
    });
    toast.success('Test barcode label sent to printer');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" />
            <span>{t('pos.printerSettings')}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure local thermal roll paper dimensions, auto-print triggers, and Chrome kiosk mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestPrintBarcode}
            className="text-xs font-semibold gap-1.5"
          >
            <Barcode className="w-4 h-4 text-primary" />
            <span>{t('pos.testBarcodePrint')}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleTestPrintReceipt}
            className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{t('pos.testPrint')}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Settings Configuration */}
        <div className="md:col-span-2 space-y-6">
          {/* Format & Dimensions */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Paper Format & Sizing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  Receipt Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'THERMAL_80', label: '80mm Thermal Roll', desc: 'Standard POS printer' },
                    { value: 'THERMAL_58', label: '58mm Thermal Roll', desc: 'Compact portable receipt' },
                    { value: 'A4', label: 'A4 Invoice', desc: 'Full office laser sheet' },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => handleUpdate('format', fmt.value as ReceiptFormat)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        settings.format === fmt.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-bold text-foreground text-xs">{fmt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {settings.format === 'THERMAL_80' && (
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                  <div>
                    <label className="font-semibold text-foreground">
                      Paper Width Fine-tuning (mm)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Fine-tune if receipt margins clip on your specific hardware.
                    </p>
                  </div>
                  <Input
                    type="number"
                    value={settings.paperWidthMm || 80}
                    onChange={(e) => handleUpdate('paperWidthMm', Number(e.target.value))}
                    min={70}
                    max={85}
                    className="w-24 h-8 text-xs font-mono text-right"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <label className="font-semibold text-foreground">
                    Font Sizing
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Adjust text scaling for high-density thermal printer heads.
                  </p>
                </div>
                <select
                  value={settings.fontSize}
                  onChange={(e) => handleUpdate('fontSize', e.target.value as any)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary h-8"
                >
                  <option value="small">Compact (Small)</option>
                  <option value="medium">Standard (Medium)</option>
                  <option value="large">Large (High Legibility)</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <label className="font-semibold text-foreground">
                    Auto-print After Sale
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically trigger receipt print immediately upon checkout completion.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoPrint}
                  onChange={(e) => handleUpdate('autoPrint', e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <label className="font-semibold text-foreground">
                    Bangla Numbers (বাংলা সংখ্যা)
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Print prices and totals using Bangla numerals (e.g. ৳১৫০০.০০).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.useBanglaDigits}
                  onChange={(e) => handleUpdate('useBanglaDigits', e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Receipt Content & Branding */}
          <Card className="border-border">
            <CardHeader className="p-4 pb-2 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>Branding & Header / Footer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Logo upload */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Shop Header Logo (Data URL)
                </label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <div className="p-2 rounded-lg border border-border bg-white flex items-center gap-2">
                      <img src={logoPreview} alt="Logo" className="max-h-10 max-w-[120px]" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleLogoUpload}
                      className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use high-contrast monochrome black & white PNG for best thermal clarity. Max 200KB.
                </p>
              </div>

              {/* Footer text */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Receipt Policy & Thank You Note
                </label>
                <Input
                  value={settings.footerText}
                  onChange={(e) => handleUpdate('footerText', e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Chrome Kiosk Printing Guide */}
        <div className="space-y-6">
          <Card className="border-border bg-muted/20 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>{t('pos.kioskGuide')}</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enable silent, zero-click thermal printing without browser dialog prompts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
              <p>
                In high-volume retail, cashier speed is essential. You can configure Google Chrome or Microsoft Edge to bypass the print confirmation dialog:
              </p>

              <div className="space-y-1.5">
                <p className="font-bold text-foreground">Windows Shortcut Target Flag:</p>
                <div className="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] select-all break-all">
                  chrome.exe --kiosk --kiosk-printing
                </div>
              </div>

              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-[11px]">
                <li>Right-click your Google Chrome desktop shortcut and choose <strong>Properties</strong>.</li>
                <li>In the <strong>Target</strong> field, append <code>--kiosk-printing</code> at the very end.</li>
                <li>Set your 80mm or 58mm POS thermal printer as the <strong>Default Windows Printer</strong>.</li>
                <li>When the cashier taps &quot;Pay Now&quot;, the receipt immediately feeds without any modal prompt!</li>
              </ol>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200">
                <strong>PrinterAdapter Extensibility:</strong> The frontend utilizes an abstracted <code>PrinterAdapter</code> interface, enabling future native desktop wrappers (Electron, ESC/POS over USB/Raw BT) to plug in seamlessly.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
