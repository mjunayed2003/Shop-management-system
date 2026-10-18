'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBranchStore } from '@/lib/store/branch-store';
import { useToast } from '@/components/feedback/ToastContext';

interface ExportButtonProps {
  exportUrl: string;
  filename: string;
  label?: string;
  requiredPermission?: string | string[];
  className?: string;
}

export function ExportButton({
  exportUrl,
  filename,
  label = 'Export CSV',
  requiredPermission,
  className,
}: ExportButtonProps) {
  const toast = useToast();
  const token = useAuthStore((s) => s.accessToken);
  const { currentBranchId } = useBranchStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [isExporting, setIsExporting] = useState(false);

  // Check permission
  if (requiredPermission) {
    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const allowed = perms.some((p) => hasPermission(p) || hasPermission('*'));
    if (!allowed) return null;
  }

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(currentBranchId ? { 'x-branch-id': currentBranchId } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('CSV export completed successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not export CSV data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isExporting}
      className={`text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800 font-semibold ${className || ''}`}
    >
      {isExporting ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
      ) : (
        <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
      )}
      <span>{label}</span>
    </Button>
  );
}
