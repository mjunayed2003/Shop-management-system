'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressAndResizeImage } from '@/lib/utils/image-compression';
import { api } from '@/lib/api/endpoints';

interface ProductImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  error?: string;
  required?: boolean;
}

export function ProductImageUpload({
  value,
  onChange,
  error,
  required = true,
}: ProductImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('শুধুমাত্র ইমেজ ফাইল (JPG, PNG, WebP) গ্রহণযোগ্য।');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    try {
      // 1. Convert resolution to max 800x800 and compress to WebP format
      const compressed = await compressAndResizeImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.82,
      });

      // 2. Prepare FormData with compressed file
      const formData = new FormData();
      formData.append('image', compressed.file);

      // 3. Upload to backend modular storage provider
      const response = await api.storage.uploadImage(formData, 'products');

      if (response && response.data) {
        onChange(response.data.url);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err.message || 'ছবি আপলোড করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>পণ্যের ছবি (Product Image)</span>
          {required && (
            <span className="text-red-500 font-bold ml-0.5" title="বাধ্যতামূলক">
              *
            </span>
          )}
        </label>

        {value && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            ছবি যুক্ত আছে
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {value ? (
        <div className="relative group rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-slate-900/40 p-4 transition-all hover:border-emerald-500/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Image Preview */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Product Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Image Controls */}
            <div className="flex-1 w-full space-y-3 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="text-xs h-8 px-3"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  ছবি পরিবর্তন করুন
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="text-xs h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  মুছে ফেলুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`cursor-pointer group relative border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              : error || uploadError
              ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10'
              : 'border-slate-300 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-slate-900/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isProcessing ? (
                'ছবি প্রসেসিং হচ্ছে...'
              ) : (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline">
                    ছবি আপলোড করতে ক্লিক করুন
                  </span>{' '}
                  অথবা ড্র্যাগ করে এনে ছেড়ে দিন
                </>
              )}
            </p>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 font-medium">
            <span className="bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              WebP, PNG, JPG, JPEG
            </span>
          </div>
        </div>
      )}

      {(error || uploadError) && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError || error}</span>
        </div>
      )}
    </div>
  );
}

