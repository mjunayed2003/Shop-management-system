'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/feedback/ToastContext';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  MessageSquare,
  HelpCircle,
  Headphones,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

export default function ContactPage() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    shopName: '',
    inquiryType: 'sales',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      showToast(
        locale === 'bn' ? 'অনুগ্রহ করে সকল আবশ্যকীয় তথ্য পূরণ করুন' : 'Please fill in all required fields',
        'warning',
      );
      return;
    }

    setIsSubmitting(true);

    // Simulate reliable submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      showToast(
        locale === 'bn'
          ? 'ধন্যবাদ! আপনার বার্তা সফলভাবে পাঠানো হয়েছে।'
          : 'Thank you! Your message has been sent successfully.',
        'success',
      );
    }, 600);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      shopName: '',
      inquiryType: 'sales',
      message: '',
    });
    setSubmitted(false);
  };

  return (
    <div className="space-y-16 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-xs font-normal text-cyan-700 dark:text-cyan-300">
          <Headphones className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{locale === 'bn' ? 'সহায়তা ও তথ্য কেন্দ্র' : 'Help & Support Center'}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {locale === 'bn' ? 'আমাদের সাথে যোগাযোগ করুন' : 'Get in Touch with Our Team'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {locale === 'bn'
            ? 'ক্লাউড পিওএস সফটওয়্যার সম্পর্কে যেকোনো প্রশ্ন, কাস্টম ডেমো বা সহায়তার জন্য আমাদের অভিজ্ঞ টিম সর্বদা আপনার পাশে রয়েছে।'
            : 'Have questions about cloud POS software, need a personalized demo, or technical assistance? Our team is always here to assist you.'}
        </p>
      </div>

      {/* Main Grid: Contact Info + Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Direct Contact Info & Support Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact Card 1: Phone Hotline */}
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-lg transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {locale === 'bn' ? 'সরাসরি হেল্পলাইন' : 'Direct Helpline'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn' ? 'যেকোনো জরুরি সহায়তার জন্য কল করুন' : 'Call us for urgent assistance'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1 text-sm font-semibold">
              <a
                href="tel:+8801700000000"
                className="block text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                +৮৮০ ১৭০০-০০০০০০ (হটলাইন)
              </a>
              <a
                href="tel:+8801800000000"
                className="block text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                +৮৮০ ১৮০০-০০০০০০ (সেলস)
              </a>
            </div>
          </div>

          {/* Contact Card 2: Email */}
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-lg transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {locale === 'bn' ? 'অফিসিয়াল ইমেইল' : 'Official Email'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn' ? '২৪ ঘণ্টার মধ্যে জবাব প্রদান করা হয়' : 'We respond within 24 hours'}
                </p>
              </div>
            </div>
            <div className="space-y-1.5 pt-1 text-sm font-semibold">
              <a
                href="mailto:support@shop-pos.com"
                className="block text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                support@shop-pos.com
              </a>
              <a
                href="mailto:sales@shop-pos.com"
                className="block text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                sales@shop-pos.com
              </a>
            </div>
          </div>

          {/* Contact Card 3: Office Address */}
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs hover:shadow-lg transition-all space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {locale === 'bn' ? 'অফিস ঠিকানা' : 'Office Location'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn' ? 'হেডকোয়ার্টার ঢাকা' : 'Headquarters Dhaka'}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
              {locale === 'bn'
                ? 'লেভেল ৪, ব্লক বি, রোড ৫, গুলশান-২, ঢাকা-১২১২, বাংলাদেশ।'
                : 'Level 4, Block B, Road 5, Gulshan-2, Dhaka-1212, Bangladesh.'}
            </p>
          </div>

          {/* Support Hours Card */}
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {locale === 'bn' ? 'সাপোর্ট সময়' : 'Working Hours'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn' ? 'শনিবার - বৃহস্পতিবার: সকাল ৯টা - রাত ১০টা' : 'Saturday - Thursday: 9:00 AM - 10:00 PM'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {locale === 'bn'
                ? 'জরুরি সার্ভার ও অফলাইন পিওএস গ্রাহকদের জন্য ২৪/৭ ডেডিকেটেড মনিটরিং ব্যবস্থা চালু থাকে।'
                : '24/7 dedicated system monitoring is available for high-volume enterprise stores.'}
            </p>
          </div>
        </div>

        {/* Right Column: Contact & Demo Request Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-10 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl space-y-6 relative overflow-hidden">
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899]" />

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {locale === 'bn' ? 'সরাসরি বার্তা অথবা ডেমো রিকোয়েস্ট' : 'Send a Message or Request a Demo'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {locale === 'bn'
                  ? 'নিচের ফর্মটি পূরণ করুন, আমাদের প্রতিনিধি খুব দ্রুত আপনার সাথে যোগাযোগ করবেন।'
                  : 'Fill out the form below and our representative will reach out to you shortly.'}
              </p>
            </div>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  {locale === 'bn' ? 'বার্তাটি সফলভাবে পাঠানো হয়েছে!' : 'Message Sent Successfully!'}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300 max-w-md mx-auto">
                  {locale === 'bn'
                    ? 'আপনার মূল্যবান বার্তার জন্য ধন্যবাদ। আমাদের কাস্টমার সাপোর্ট টিম অতি শীঘ্রই আপনার সাথে যোগাযোগ করবে।'
                    : 'Thank you for reaching out. Our support team will get in touch with you shortly.'}
                </p>
                <div className="pt-2">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="rounded-full border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                  >
                    {locale === 'bn' ? 'আরেকটি বার্তা পাঠান' : 'Send Another Message'}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {locale === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={locale === 'bn' ? 'যেমন: মোহাম্মদ তানভীর' : 'e.g. Tanvir Ahmed'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {locale === 'bn' ? 'মোবাইল নম্বর *' : 'Phone Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder={locale === 'bn' ? '০১৭১২-৩৪৫৬৭৮' : '01712-345678'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {locale === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all"
                    />
                  </div>

                  {/* Shop / Business Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {locale === 'bn' ? 'দোকান / ব্যবসার নাম' : 'Shop / Business Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      placeholder={locale === 'bn' ? 'যেমন: মডার্ন ফ্যাশনস' : 'e.g. Modern Fashions'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all"
                    />
                  </div>
                </div>

                {/* Inquiry Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {locale === 'bn' ? 'যোগাযোগের বিষয়' : 'Inquiry Purpose'}
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all"
                  >
                    <option value="sales">
                      {locale === 'bn' ? 'নতুন সফটওয়্যার ডেমো বা ক্রয় (Sales)' : 'New Software Demo & Sales'}
                    </option>
                    <option value="pricing">
                      {locale === 'bn' ? 'প্যাকেজ ও সাবস্ক্রিপশন সংক্রান্ত (Pricing)' : 'Packages & Subscription'}
                    </option>
                    <option value="support">
                      {locale === 'bn' ? 'টেকনিক্যাল সাপোর্ট ও সহায়তা (Support)' : 'Technical Support & Assistance'}
                    </option>
                    <option value="hardware">
                      {locale === 'bn' ? 'বারকোড স্ক্যানার ও প্রিন্টার সেটআপ' : 'Barcode Scanner & Printer Hardware'}
                    </option>
                    <option value="other">
                      {locale === 'bn' ? 'অন্যান্য সাধারণ জিজ্ঞাসা' : 'Other General Inquiry'}
                    </option>
                  </select>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {locale === 'bn' ? 'আপনার বার্তা *' : 'Your Message *'}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={
                      locale === 'bn'
                        ? 'আপনার প্রশ্ন বা বিস্তারিত প্রয়োজনীয়তা এখানে লিখুন...'
                        : 'Write your inquiry or specific business requirements here...'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b7987] transition-all resize-y"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] text-white font-semibold text-xs sm:text-sm shadow-md shadow-purple-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all border-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? locale === 'bn'
                          ? 'পাঠানো হচ্ছে...'
                          : 'Sending...'
                        : locale === 'bn'
                          ? 'বার্তা পাঠান'
                          : 'Send Message'}
                    </span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions (FAQ) Section */}
      <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>{locale === 'bn' ? 'সাধারণ প্রশ্ন ও উত্তর' : 'Common Questions'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {locale === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 text-xs flex items-center justify-center font-bold">
                ১
              </span>
              <span>{locale === 'bn' ? 'কীভাবে ফ্রি ট্রায়াল শুরু করতে পারি?' : 'How do I start the free trial?'}</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
              {locale === 'bn'
                ? 'উপরের "রেজিস্ট্রেশন" বাটনে ক্লিক করে আপনার দোকানের নাম ও ফোন নম্বর দিয়ে ৩০ দিনের সম্পূর্ণ ফ্রি ট্রায়াল অ্যাকাউন্ট সক্রিয় করতে পারেন। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।'
                : 'Click the Register button, provide your shop name and phone number to start a 30-day free trial. No credit card is required.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 text-xs flex items-center justify-center font-bold">
                ২
              </span>
              <span>
                {locale === 'bn' ? 'ইন্টারনেট সংযোগ না থাকলে কি বিক্রি করা যাবে?' : 'Can I sell without internet?'}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
              {locale === 'bn'
                ? 'অবশ্যই! আমাদের আধুনিক অফলাইন পিডব্লিউএ (PWA) সিস্টেমের মাধ্যমে ইন্টারনেট চলে গেলেও বিলিং ও প্রিন্ট স্বাভাবিকভাবে চলবে। ইন্টারনেট আসার পর ডাটা অটো ক্লাউডে সিঙ্ক হয়ে যাবে।'
                : 'Absolutely! Our modern offline PWA system keeps checkout and receipt printing operational during internet outages, syncing automatically once reconnected.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 text-xs flex items-center justify-center font-bold">
                ৩
              </span>
              <span>
                {locale === 'bn'
                  ? 'থার্মাল প্রিন্টার ও বারকোড স্ক্যানার কি সাপোর্ট করে?'
                  : 'Does it support thermal printers and barcode scanners?'}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
              {locale === 'bn'
                ? 'হ্যাঁ, যেকোনো ইউএসবি বা ব্লুটুথ থার্মাল পিওএস প্রিন্টার (৫৮ মিমি ও ৮০ মিমি) এবং হ্যান্ডহেল্ড বারকোড স্ক্যানার পুরোপুরি প্লাগ-অ্যান্ড-প্লে ভাবে কাজ করে।'
                : 'Yes, any standard USB or Bluetooth thermal receipt printer (58mm/80mm) and 1D/2D barcode scanners work plug-and-play.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-600 text-xs flex items-center justify-center font-bold">
                ৪
              </span>
              <span>
                {locale === 'bn'
                  ? 'আমরা কি একাধিক ব্রাঞ্চ বা দোকান একসাথে দেখতে পারব?'
                  : 'Can we monitor multiple branch outlets together?'}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
              {locale === 'bn'
                ? 'হ্যাঁ, মালিক বা অ্যাডমিন একটি ড্যাশবোর্ড থেকেই সকল শাখার লাইভ সেলস, ইনভেন্টরি ট্রান্সফার এবং কর্মচারীদের পারফরম্যান্স রিয়েল-টাইমে পর্যবেক্ষণ করতে পারবেন।'
                : 'Yes, owners and managers can monitor live sales, inventory transfers, and staff performance across all branch outlets from a single unified dashboard.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

