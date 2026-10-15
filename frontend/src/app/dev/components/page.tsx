'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';

import { DataTable, Column } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { FormFieldWrapper } from '@/components/shared/FormFieldWrapper';
import { PermissionGate, usePermission } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  Component,
  ShieldCheck,
  Phone,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SampleProduct {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
}

const sampleData: SampleProduct[] = [
  { id: '1', name: 'প্রিমিয়াম সুতি পাঞ্জাবি', category: 'পাঞ্জাবি', sku: 'PJ-001', price: 2450, stock: 45, status: 'ACTIVE' },
  { id: '2', name: 'কাতান জামদানি শাড়ি', category: 'শাড়ি', sku: 'SR-042', price: 7800, stock: 12, status: 'ACTIVE' },
  { id: '3', name: 'কটন ক্যাজুয়াল শার্ট', category: 'শার্ট', sku: 'SH-105', price: 1650, stock: 0, status: 'INACTIVE' },
  { id: '4', name: 'স্লিম ফিট ডেনিম জিন্স', category: 'প্যান্ট', sku: 'DN-089', price: 2200, stock: 28, status: 'ACTIVE' },
  { id: '5', name: 'এমব্রয়ডারি থ্রি-পিস', category: 'থ্রি-পিস', sku: 'TP-201', price: 3400, stock: 18, status: 'TRIAL' },
];

export default function ComponentDocsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  // SearchInput demo state
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // PhoneInput demo state
  const [phoneVal, setPhoneVal] = useState('01711223344');

  // DataTable demo state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // FormFieldWrapper demo state
  const [hasError, setHasError] = useState(false);

  // PermissionGate demo state
  const [simulatedPerm, setSimulatedPerm] = useState(true);

  // ConfirmDialog demo states
  const [isNormalConfirmOpen, setIsNormalConfirmOpen] = useState(false);
  const [isReasonConfirmOpen, setIsReasonConfirmOpen] = useState(false);
  const [submittedReason, setSubmittedReason] = useState<string | null>(null);

  // Button loading demo state
  const [isBtnLoading, setIsBtnLoading] = useState(false);

  const columns: Column<SampleProduct>[] = [
    {
      key: 'name',
      header: 'পোশাকের নাম',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
          <p className="text-xs font-mono text-slate-400">{item.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'ক্যাটাগরি',
      sortable: true,
    },
    {
      key: 'price',
      header: 'মূল্য (৳)',
      sortable: true,
      render: (item) => <span className="font-mono font-medium">৳ {item.price.toLocaleString()}</span>,
    },
    {
      key: 'stock',
      header: 'মজুদ (স্টক)',
      sortable: true,
      render: (item) => (
        <span className={`font-mono ${item.stock === 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
          {item.stock} পিস
        </span>
      ),
    },
    {
      key: 'status',
      header: 'অবস্থা',
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ডিজাইন সিস্টেম ও কম্পোনেন্ট লাইব্রেরি</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Component className="w-8 h-8 text-emerald-600" />
          <span>পুনর্ব্যবহারযোগ্য UI কম্পোনেন্টস (/dev/components)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          প্রজেক্টের সকল কোর UI কম্পোনেন্টের ইন্টারঅ্যাক্টিভ ডেমো ও কার্যপদ্ধতি নির্দেশিকা।
        </p>
      </div>

      {/* 1. DataTable Demo */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ১. DataTable (সার্ভার-সাইড পেজিনেশন, সর্টিং ও রেসপন্সিভ)
          </h2>
          <p className="text-xs text-slate-500">
            সার্ভার সাইড পেজিনেশন, কলাম সর্টিং, লোডিং স্কেলিটন ও খালি অবস্থার হ্যান্ডলিং করে।
          </p>
        </div>

        <DataTable
          columns={columns}
          data={sampleData}
          totalRows={sampleData.length}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(col, order) => {
            setSortBy(col);
            setSortOrder(order);
            toast.info(`সর্টিং: ${col} (${order})`);
          }}
        />
      </section>

      {/* 2. SearchInput with Debounce */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ২. SearchInput (Debounce সহ সার্চ ফিল্ড)
          </h2>
          <p className="text-xs text-slate-500">
            টাইপিংয়ের সময় অতিরিক্ত রিকোয়েস্ট রোধ করতে ৩৫০ms ডিবউন্স কার্যকর থাকে।
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SearchInput
            placeholder="টাইপ করে ডিবউন্স পরীক্ষা করুন..."
            onChange={setDebouncedSearch}
          />
          <div className="text-xs text-slate-600 dark:text-slate-400 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border">
            ডিবউন্সড ভ্যালু: <strong className="font-mono text-emerald-600">{debouncedSearch || '(খালি)'}</strong>
          </div>
        </div>
      </section>

      {/* 3. PhoneInput with Bangladesh Normalization */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ৩. PhoneInput (বাংলাদেশি মোবাইল নম্বর ফরম্যাটার)
          </h2>
          <p className="text-xs text-slate-500">
            01XXXXXXXXX, +8801..., 8801... ইনপুট গ্রহণ করে এবং স্বয়ংক্রিয়ভাবে ১১-ডিজিটের স্থানীয় ফরম্যাটে নরমালাইজ করে।
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <PhoneInput
            value={phoneVal}
            onChange={setPhoneVal}
          />
          <p className="text-xs text-slate-500">
            ভ্যালু টাইপ করুন: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">+8801711223344</code> বা <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">88018...</code>
          </p>
        </div>
      </section>

      {/* 4. FormFieldWrapper with Error Mapping */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              ৪. FormFieldWrapper (সার্ভার এরর ম্যাপিং)
            </h2>
            <p className="text-xs text-slate-500">
              ক্লায়েন্ট বা সার্ভারের ৪২২ ভ্যালিডেশন এরর বার্তা সুন্দরভাবে ফিল্ডের নিচে ম্যাপিং করে।
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setHasError(!hasError)}>
            এরর স্টেট টগল করুন
          </Button>
        </div>

        <div className="max-w-md">
          <FormFieldWrapper
            id="demo-email"
            label="দোকানের ইমেইল ঠিকানা"
            required
            error={hasError ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে (৪২২ Error)' : undefined}
            hint="আপনার প্রাতিষ্ঠানিক যোগাযোগ ইমেইল"
          >
            <Input id="demo-email" placeholder="shop@domain.com" isError={hasError} />
          </FormFieldWrapper>
        </div>
      </section>

      {/* 5. PermissionGate & usePermission */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              ৫. PermissionGate ও usePermission হুক
            </h2>
            <p className="text-xs text-slate-500">
              অনুমতি না থাকলে বাটন লুকানো বা ডিসেবল করে রাখে।
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSimulatedPerm(!simulatedPerm)}>
            অনুমতি টগল: {simulatedPerm ? 'অনুমোদিত' : 'অননুমোদিত'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border">
          {simulatedPerm ? (
            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>[PermissionGate] এই বাটনটি শুধুমাত্র &apos;sales:void&apos; অনুমতি থাকলে দৃশ্যমান হয়</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>অনুমতি নেই — এলিমেন্ট সম্পূর্ণ লুকানো বা নিষ্ক্রিয়</span>
            </div>
          )}
        </div>
      </section>

      {/* 6. StatusBadge Variants */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ৬. StatusBadge (সক্রিয়/নিষ্ক্রিয়/স্থগিত ব্যাজ)
          </h2>
          <p className="text-xs text-slate-500">
            বুলিয়ান বা স্ট্রিং স্ট্যাটাসের ওপর ভিত্তি করে কালার-কোডেড ব্যাজ।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={true} />
          <StatusBadge status={false} />
          <StatusBadge status="ACTIVE" />
          <StatusBadge status="TRIAL" />
          <StatusBadge status="SUSPENDED" />
          <StatusBadge status="PAYMENT_DUE" />
        </div>
      </section>

      {/* 7. ConfirmDialog (Standard & Mandatory Reason Variant) */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ৭. ConfirmDialog (সাধারণ ও বাধ্যতামূলক কারণ ভ্যারিয়েন্ট)
          </h2>
          <p className="text-xs text-slate-500">
            গুরুত্বপূর্ণ অ্যাকশন কনফার্মেশন ও অডিট ট্রেইলের জন্য কারণ প্রদানের ভ্যারিয়েন্ট।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => setIsNormalConfirmOpen(true)}>
            সাধারণ কনফার্ম ডায়ালগ খুলুন
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              setSubmittedReason(null);
              setIsReasonConfirmOpen(true);
            }}
          >
            বাধ্যতামূলক কারণ (Reason Variant) ডায়ালগ খুলুন
          </Button>
        </div>

        {submittedReason && (
          <p className="text-xs text-emerald-600 font-medium">
            সংগৃহীত কারণ: &quot;{submittedReason}&quot;
          </p>
        )}
      </section>

      {/* 8. Button Loading State */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ৮. Buttons ও সাবমিশন ইন-ফ্লাইট লোডিং
          </h2>
          <p className="text-xs text-slate-500">
            রিকোয়েস্ট চলাকালীন বাটন স্বয়ংক্রিয়ভাবে নিষ্ক্রিয় থাকে যাতে ডবল সাবমিশন না হয়।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            isLoading={isBtnLoading}
            loadingText="রিকোয়েস্ট চলছে..."
            onClick={() => {
              setIsBtnLoading(true);
              setTimeout(() => setIsBtnLoading(false), 2000);
            }}
          >
            ক্লিক করে লোডিং দেখুন (২ সেকেন্ড)
          </Button>

          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      {/* 9. Toasts System */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            ৯. Toast Notifications (বিজ্ঞপ্তি ট্রিগার)
          </h2>
          <p className="text-xs text-slate-500">
            সাকসেস, এরর, ওয়ার্নিং ও ইনফরমেশন পপআপ মেসেজ।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => toast.success('বিক্রয় ইনভয়েস সফলভাবে মুদ্রিত হয়েছে!', 'সফল')}
          >
            Success Toast
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => toast.error('ইমেইল বা ফোন নম্বর সঠিক নয়', 'ব্যর্থতা')}
          >
            Error Toast
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.warning('সাবস্ক্রিপশন মেয়াদ শেষ হতে ৩ দিন বাকি', 'সতর্কতা')}
          >
            Warning Toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info('শাখা পরিবর্তন করা হয়েছে', 'তথ্য')}
          >
            Info Toast
          </Button>
        </div>
      </section>

      {/* Dialog Components */}
      <ConfirmDialog
        isOpen={isNormalConfirmOpen}
        onClose={() => setIsNormalConfirmOpen(false)}
        onConfirm={() => {
          setIsNormalConfirmOpen(false);
          toast.success('কনফার্ম সম্পন্ন হয়েছে!');
        }}
        title="আপনি কি নিশ্চিত?"
        description="এই সাধারণ কনফার্ম ডায়ালগে অতিরিক্ত কারণ উল্লেখের প্রয়োজন নেই।"
      />

      <ConfirmDialog
        isOpen={isReasonConfirmOpen}
        onClose={() => setIsReasonConfirmOpen(false)}
        onConfirm={(reason) => {
          setSubmittedReason(reason || '');
          setIsReasonConfirmOpen(false);
          toast.success(`কারণ গৃহীত হয়েছে: "${reason}"`);
        }}
        title="বিশেষ অ্যাকশন কনফার্মেশন"
        description="এই অপারেশনের জন্য বাধ্যতামূলকভাবে কারণ উল্লেখ করতে হবে।"
        variant="danger"
        requireReason={true}
        reasonLabel="অপারেশনের সঠিক কারণ"
        reasonPlaceholder="যেমন: ভুল এন্ট্রি সংশোধন বা অডিট অনুমোদন"
      />
    </div>
  );
}
