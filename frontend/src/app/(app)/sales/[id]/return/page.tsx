'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RotateCcw, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function SalesReturnPlaceholderPage() {
  const router = useRouter();
  const params = useParams();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 dark:border-slate-800 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <RotateCcw className="w-7 h-7" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Sale Return & Exchange
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Customer product returns, condition inspection, exchanges and refund vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Coming in Phase F5: Returns, Exchange & Shifts</span>
            </div>
            <p>
              Barcode scanner-driven item returns, restockable condition categorization, refund voucher issuance, and exchange cart balancing will be available in Phase F5.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Link href="/sales">View Sales History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
