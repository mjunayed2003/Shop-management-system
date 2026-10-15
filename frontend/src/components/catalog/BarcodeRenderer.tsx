'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { resolveBarcodeFormat } from '@/lib/utils/barcode';

interface BarcodeRendererProps {
  value: string;
  format?: 'EAN13' | 'CODE128';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
}

export function BarcodeRenderer({
  value,
  format = 'CODE128',
  width = 1.5,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = '',
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value || value.trim().length === 0) return;

    try {
      const safeFormat = resolveBarcodeFormat(value.trim(), format);

      JsBarcode(svgRef.current, value.trim(), {
        format: safeFormat,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 2,
        margin: 4,
        background: 'transparent',
        lineColor: '#000000',
      });
    } catch {
      // In case of any unexpected rendering issue, fallback to basic CODE128
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, value.trim(), {
            format: 'CODE128',
            width,
            height,
            displayValue,
            fontSize,
            margin: 4,
          });
        }
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) {
    return <div className="text-[10px] text-slate-400 italic">No barcode</div>;
  }

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
}
