'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Barcode, Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function BarcodeInput({
  onScan,
  isLoading = false,
  placeholder = 'Scan barcode or type and press Enter...',
  autoFocus = true,
  className = '',
}: BarcodeInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyTimeRef = useRef<number>(Date.now());
  const fastKeystrokeCountRef = useRef<number>(0);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = value.trim();
    if (clean) {
      onScan(clean);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const diff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    // Detect fast scanner keystrokes (< 45ms between strokes)
    if (diff < 45) {
      fastKeystrokeCountRef.current += 1;
    } else {
      fastKeystrokeCountRef.current = 0;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center gap-1.5 pointer-events-none">
          <Barcode className="w-4 h-4 text-primary" />
        </div>

        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className="pl-9 pr-8 text-sm h-10 font-mono"
        />

        {value && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="h-10 px-4 gap-1.5"
      >
        <Search className="w-4 h-4" />
        <span>Lookup</span>
      </Button>
    </form>
  );
}
