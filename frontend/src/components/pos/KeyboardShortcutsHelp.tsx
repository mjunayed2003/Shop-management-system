'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard, Command } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'F2', action: 'Focus Scanner & Product Search Input' },
  { key: 'F4', action: 'Open Customer Selection Modal' },
  { key: 'F8', action: 'Hold Active Cart with Reference Note' },
  { key: 'F9', action: 'List & Retrieve Held Sales' },
  { key: 'F10 / Ctrl+Enter', action: 'Open Payment & Split Tender Modal' },
  { key: '+ / -', action: 'Increment or Decrement Quantity on Selected Line' },
  { key: 'Del / Delete', action: 'Remove Selected Line from Cart' },
  { key: 'Esc', action: 'Close Modal or Cancel Action' },
];

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card shadow-2xl">
        <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base font-bold">
              {t('pos.shortcuts')}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Designed for high-speed cashier checkout without touching the mouse.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-2">
          {SHORTCUTS.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-xs transition-colors"
            >
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="px-2.5 py-1 text-[11px] font-bold font-mono rounded bg-muted border border-border shadow-xs text-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
