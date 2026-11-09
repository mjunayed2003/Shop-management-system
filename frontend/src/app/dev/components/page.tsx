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

export default function ComponentDocsPage() {
  const { t, locale } = useTranslation();
  const isBn = locale === 'bn';
  const toast = useToast();

  const sampleData: SampleProduct[] = [
    { id: '1', name: isBn ? 'প্রিমিয়াম সুতি পাঞ্জাবি' : 'Premium Cotton Panjabi', category: isBn ? 'পাঞ্জাবি' : 'Panjabi', sku: 'PJ-001', price: 2450, stock: 45, status: 'ACTIVE' },
    { id: '2', name: isBn ? 'কাতান জামদানি শাড়ি' : 'Katan Jamdani Saree', category: isBn ? 'শাড়ি' : 'Saree', sku: 'SR-042', price: 7800, stock: 12, status: 'ACTIVE' },
    { id: '3', name: isBn ? 'কটন ক্যাজুয়াল শার্ট' : 'Cotton Casual Shirt', category: isBn ? 'শার্ট' : 'Shirt', sku: 'SH-105', price: 1650, stock: 0, status: 'INACTIVE' },
    { id: '4', name: isBn ? 'স্লিম ফিট ডেনিম জিন্স' : 'Slim Fit Denim Jeans', category: isBn ? 'প্যান্ট' : 'Pants', sku: 'DN-089', price: 2200, stock: 28, status: 'ACTIVE' },
    { id: '5', name: isBn ? 'এমব্রয়ডারি থ্রি-পিস' : 'Embroidered Three-Piece', category: isBn ? 'থ্রি-পিস' : 'Three-Piece', sku: 'TP-201', price: 3400, stock: 18, status: 'TRIAL' },
  ];

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
      header: isBn ? 'পোশাকের নাম' : 'Product Name',
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
      header: isBn ? 'ক্যাটাগরি' : 'Category',
      sortable: true,
    },
    {
      key: 'price',
      header: isBn ? 'মূল্য (৳)' : 'Price (BDT)',
      sortable: true,
      render: (item) => <span className="font-mono font-medium">{isBn ? '৳' : 'BDT'} {item.price.toLocaleString()}</span>,
    },
    {
      key: 'stock',
      header: isBn ? 'মজুদ (স্টক)' : 'Stock Level',
      sortable: true,
      render: (item) => (
        <span className={`font-mono ${item.stock === 0 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
          {item.stock} {isBn ? 'পিস' : 'pcs'}
        </span>
      ),
    },
    {
      key: 'status',
      header: isBn ? 'অবস্থা' : 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-4">
      {/* Header */}
      <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isBn ? 'ডিজাইন সিস্টেম ও কম্পোনেন্ট লাইব্রেরি' : 'Design System & Component Library'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Component className="w-8 h-8 text-emerald-600" />
          <span>{isBn ? 'পুনর্ব্যবহারযোগ্য UI কম্পোনেন্টস (/dev/components)' : 'Reusable UI Components (/dev/components)'}</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {isBn
            ? 'প্রজেক্টের সকল কোর UI কম্পোনেন্টের ইন্টারঅ্যাক্টিভ ডেমো ও কার্যপদ্ধতি নির্দেশিকা।'
            : 'Interactive showcase and usage guide for all core UI components across the platform.'}
        </p>
      </div>

      {/* 1. DataTable Demo */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isBn ? '১. DataTable (সার্ভার-সাইড পেজিনেশন, সর্টিং ও রেসপন্সিভ)' : '1. DataTable (Server-side Pagination, Sorting & Responsive)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'সার্ভার সাইড পেজিনেশন, কলাম সর্টিং, লোডিং স্কেলিটন ও খালি অবস্থার হ্যান্ডলিং করে।'
              : 'Handles server-side pagination, column sorting, loading skeletons, and empty state displays.'}
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
            toast.info(isBn ? `সর্টিং: ${col} (${order})` : `Sorting: ${col} (${order})`);
          }}
        />
      </section>

      {/* 2. SearchInput with Debounce */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isBn ? '২. SearchInput (Debounce সহ সার্চ ফিল্ড)' : '2. SearchInput (Debounced Input Field)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'টাইপিংয়ের সময় অতিরিক্ত রিকোয়েস্ট রোধ করতে ৩৫০ms ডিবউন্স কার্যকর থাকে।'
              : 'Applies a 350ms debounce delay while typing to prevent excessive API calls.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SearchInput
            placeholder={isBn ? 'টাইপ করে ডিবউন্স পরীক্ষা করুন...' : 'Type to test debouncing...'}
            onChange={setDebouncedSearch}
          />
          <div className="text-xs text-slate-600 dark:text-slate-400 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border">
            {isBn ? 'ডিবউন্সড ভ্যালু:' : 'Debounced Value:'} <strong className="font-mono text-emerald-600">{debouncedSearch || (isBn ? '(খালি)' : '(empty)')}</strong>
          </div>
        </div>
      </section>

      {/* 3. PhoneInput with Bangladesh Normalization */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isBn ? '৩. PhoneInput (বাংলাদেশি মোবাইল নম্বর ফরম্যাটার)' : '3. PhoneInput (Bangladesh Mobile Number Formatter)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? '01XXXXXXXXX, +8801..., 8801... ইনপুট গ্রহণ করে এবং স্বয়ংক্রিয়ভাবে ১১-ডিজিটের স্থানীয় ফরম্যাটে নরমালাইজ করে।'
              : 'Accepts 01XXXXXXXXX, +8801..., 8801... and automatically normalizes to local 11-digit format.'}
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <PhoneInput
            value={phoneVal}
            onChange={setPhoneVal}
          />
          <p className="text-xs text-slate-500">
            {isBn ? 'ভ্যালু টাইপ করুন:' : 'Type test value:'} <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">+8801711223344</code> {isBn ? 'বা' : 'or'} <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">88018...</code>
          </p>
        </div>
      </section>

      {/* 4. FormFieldWrapper with Error Mapping */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isBn ? '৪. FormFieldWrapper (সার্ভার এরর ম্যাপিং)' : '4. FormFieldWrapper (Validation & Error Mapping)'}
            </h2>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'ক্লায়েন্ট বা সার্ভারের ৪২২ ভ্যালিডেশন এরর বার্তা সুন্দরভাবে ফিল্ডের নিচে ম্যাপিং করে।'
                : 'Maps client or server 422 validation errors cleanly below form inputs.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setHasError(!hasError)}>
            {isBn ? 'এরর স্টেট টগল করুন' : 'Toggle Error State'}
          </Button>
        </div>

        <div className="max-w-md">
          <FormFieldWrapper
            id="demo-email"
            label={isBn ? 'দোকানের ইমেইল ঠিকানা' : 'Store Email Address'}
            required
            error={hasError ? (isBn ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে (৪২২ Error)' : 'This email is already in use (422 Error)') : undefined}
            hint={isBn ? 'আপনার প্রাতিষ্ঠানিক যোগাযোগ ইমেইল' : 'Your business contact email'}
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
              {isBn ? '৫. PermissionGate ও usePermission হুক' : '5. PermissionGate & usePermission Hook'}
            </h2>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'অনুমতি না থাকলে বাটন লুকানো বা ডিসেবল করে রাখে।'
                : 'Conditionally hides or disables UI controls when user lacks permission.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSimulatedPerm(!simulatedPerm)}>
            {isBn ? `অনুমতি টগল: ${simulatedPerm ? 'অনুমোদিত' : 'অননুমোদিত'}` : `Toggle Permission: ${simulatedPerm ? 'Granted' : 'Denied'}`}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border">
          {simulatedPerm ? (
            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isBn ? "[PermissionGate] এই বাটনটি শুধুমাত্র 'sales:void' অনুমতি থাকলে দৃশ্যমান হয়" : "[PermissionGate] Visible only when 'sales:void' permission is granted"}</span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>{isBn ? 'অনুমতি নেই — এলিমেন্ট সম্পূর্ণ লুকানো বা নিষ্ক্রিয়' : 'No Permission — Element completely hidden or disabled'}</span>
            </div>
          )}
        </div>
      </section>

      {/* 6. StatusBadge Variants */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isBn ? '৬. StatusBadge (সক্রিয়/নিষ্ক্রিয়/স্থগিত ব্যাজ)' : '6. StatusBadge (Active/Inactive/Suspended Badges)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'বুলিয়ান বা স্ট্রিং স্ট্যাটাসের ওপর ভিত্তি করে কালার-কোডেড ব্যাজ।'
              : 'Color-coded badges reflecting boolean or string lifecycle states.'}
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
            {isBn ? '৭. ConfirmDialog (সাধারণ ও বাধ্যতামূলক কারণ ভ্যারিয়েন্ট)' : '7. ConfirmDialog (Standard & Mandatory Reason Variant)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'গুরুত্বপূর্ণ অ্যাকশন কনফার্মেশন ও অডিট ট্রেইলের জন্য কারণ প্রদানের ভ্যারিয়েন্ট।'
              : 'Confirmation dialogs with optional mandatory reason prompt for auditing critical actions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" onClick={() => setIsNormalConfirmOpen(true)}>
            {isBn ? 'সাধারণ কনফার্ম ডায়ালগ খুলুন' : 'Open Standard Confirm Dialog'}
          </Button>

          <Button
            variant="destructive"
            onClick={() => {
              setSubmittedReason(null);
              setIsReasonConfirmOpen(true);
            }}
          >
            {isBn ? 'বাধ্যতামূলক কারণ (Reason Variant) ডায়ালগ খুলুন' : 'Open Reason-Required Dialog'}
          </Button>
        </div>

        {submittedReason && (
          <p className="text-xs text-emerald-600 font-medium">
            {isBn ? 'সংগৃহীত কারণ:' : 'Recorded Reason:'} &quot;{submittedReason}&quot;
          </p>
        )}
      </section>

      {/* 8. Button Loading State */}
      <section className="space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isBn ? '৮. Buttons ও সাবমিশন ইন-ফ্লাইট লোডিং' : '8. Buttons & In-Flight Loading States'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'রিকোয়েস্ট চলাকালীন বাটন স্বয়ংক্রিয়ভাবে নিষ্ক্রিয় থাকে যাতে ডবল সাবমিশন না হয়।'
              : 'Buttons automatically disable during in-flight requests to prevent double submissions.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            isLoading={isBtnLoading}
            loadingText={isBn ? 'রিকোয়েস্ট চলছে...' : 'Processing...'}
            onClick={() => {
              setIsBtnLoading(true);
              setTimeout(() => setIsBtnLoading(false), 2000);
            }}
          >
            {isBn ? 'ক্লিক করে লোডিং দেখুন (২ সেকেন্ড)' : 'Click to preview loading (2s)'}
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
            {isBn ? '৯. Toast Notifications (বিজ্ঞপ্তি ট্রিগার)' : '9. Toast Notifications'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBn
              ? 'সাকসেস, এরর, ওয়ার্নিং ও ইনফরমেশন পপআপ মেসেজ।'
              : 'Success, error, warning, and informational feedback notifications.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() => toast.success(isBn ? 'বিক্রয় ইনভয়েস সফলভাবে মুদ্রিত হয়েছে!' : 'Sales invoice printed successfully!', isBn ? 'সফল' : 'Success')}
          >
            Success Toast
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => toast.error(isBn ? 'ইমেইল বা ফোন নম্বর সঠিক নয়' : 'Invalid email or phone number', isBn ? 'ব্যর্থতা' : 'Failed')}
          >
            Error Toast
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.warning(isBn ? 'সাবস্ক্রিপশন মেয়াদ শেষ হতে ৩ দিন বাকি' : '3 days remaining in subscription cycle', isBn ? 'সতর্কতা' : 'Warning')}
          >
            Warning Toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info(isBn ? 'শাখা পরিবর্তন করা হয়েছে' : 'Switched active branch', isBn ? 'তথ্য' : 'Info')}
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
          toast.success(isBn ? 'কনফার্ম সম্পন্ন হয়েছে!' : 'Action confirmed successfully!');
        }}
        title={isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}
        description={isBn ? 'এই সাধারণ কনফার্ম ডায়ালগে অতিরিক্ত কারণ উল্লেখের প্রয়োজন নেই।' : 'This standard confirmation dialog does not require specifying a reason.'}
      />

      <ConfirmDialog
        isOpen={isReasonConfirmOpen}
        onClose={() => setIsReasonConfirmOpen(false)}
        onConfirm={(reason) => {
          setSubmittedReason(reason || '');
          setIsReasonConfirmOpen(false);
          toast.success(isBn ? `কারণ গৃহীত হয়েছে: "${reason}"` : `Reason submitted: "${reason}"`);
        }}
        title={isBn ? 'বিশেষ অ্যাকশন কনফার্মেশন' : 'Special Action Confirmation'}
        description={isBn ? 'এই অপারেশনের জন্য বাধ্যতামূলকভাবে কারণ উল্লেখ করতে হবে।' : 'This operation strictly requires specifying a reason for audit logging.'}
        variant="danger"
        requireReason={true}
        reasonLabel={isBn ? 'অপারেশনের সঠিক কারণ' : 'Reason for operation'}
        reasonPlaceholder={isBn ? 'যেমন: ভুল এন্ট্রি সংশোধন বা অডিট অনুমোদন' : 'e.g. Entry correction or approved audit adjustment'}
      />
    </div>
  );
}
