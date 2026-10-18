export interface PricingPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
  isPopular?: boolean;
  limits: {
    maxBranches: number;
    maxUsers: number;
    maxProducts: number;
    maxVariants: number;
    maxMonthlyInvoices: number;
    hasApiAccess: boolean;
    hasCustomReports: boolean;
    hasOfflineSync: boolean;
  };
  features: string[];
}

export const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter (স্টার্টার)',
    code: 'STARTER',
    description: 'ছোট দোকান ও একক আউটলেটের জন্য আদর্শ।',
    monthlyPrice: 1500,
    yearlyPrice: 15000,
    trialDays: 30,
    limits: {
      maxBranches: 1,
      maxUsers: 3,
      maxProducts: 500,
      maxVariants: 1500,
      maxMonthlyInvoices: 1000,
      hasApiAccess: false,
      hasCustomReports: false,
      hasOfflineSync: true,
    },
    features: [
      '১টি আউটলেট / ব্রাঞ্চ',
      'সর্বোচ্চ ৩ জন ইউজার',
      '৫০০টি পণ্য ও ১,৫০০টি ভ্যারিয়েন্ট',
      'মাসিক ১,০০০টি ইনভয়েস',
      'অফলাইন পিডব্লিউএ এবং সিঙ্ক সাপোর্ট',
      'ক্যাশ ড্রয়ার ও বারকোড প্রিন্টিং',
      'এসএমএস নোটিফিকেশন',
    ],
  },
  {
    id: 'plan-pro',
    name: 'Professional (প্রফেশনাল)',
    code: 'PRO',
    description: 'ক্রমবর্ধমান ফ্যাশন ও পোশাক ব্র্যান্ডের জন্য।',
    monthlyPrice: 3500,
    yearlyPrice: 35000,
    trialDays: 30,
    isPopular: true,
    limits: {
      maxBranches: 3,
      maxUsers: 10,
      maxProducts: 2500,
      maxVariants: 7500,
      maxMonthlyInvoices: 5000,
      hasApiAccess: false,
      hasCustomReports: true,
      hasOfflineSync: true,
    },
    features: [
      'সর্বোচ্চ ৩টি আউটলেট / ব্রাঞ্চ',
      '১০ জন ইউজার ও রোল পারমিশন',
      '২,৫০০টি পণ্য ও ৭,৫০০টি ভ্যারিয়েন্ট',
      'মাসিক ৫,০০০টি ইনভয়েস',
      'কাস্টম বিক্রয় ও লাভ-ক্ষতি রিপোর্ট',
      'অফলাইন পিডব্লিউএ ফুল সিঙ্ক',
      'ব্রাঞ্চ টু ব্রাঞ্চ স্টক ট্রান্সফার',
      'অগ্রাধিকারমূলক গ্রাহক সেবা (Priority Support)',
    ],
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise (এন্টারপ্রাইজ)',
    code: 'ENTERPRISE',
    description: 'মাল্টি-ব্রাঞ্চ রিটেইল চেইন ও বৃহৎ প্রতিষ্ঠানের জন্য।',
    monthlyPrice: 7500,
    yearlyPrice: 75000,
    trialDays: 30,
    limits: {
      maxBranches: 10,
      maxUsers: 50,
      maxProducts: 10000,
      maxVariants: 30000,
      maxMonthlyInvoices: 25000,
      hasApiAccess: true,
      hasCustomReports: true,
      hasOfflineSync: true,
    },
    features: [
      'সর্বোচ্চ ১০টি আউটলেট (কাস্টম ব্রাঞ্চ যোগের সুবিধা)',
      '৫০ জন ইউজার ও সম্পূর্ণ রোল ম্যাট্রিক্স',
      '১০,০০০+ পণ্য ও ভ্যারিয়েন্ট',
      'মাসিক ২৫,০০০ ইনভয়েস',
      'ডেডিকেটেড API অ্যাক্সেস ও ওয়েবহুক',
      'কাস্টম ফাইন্যান্সিয়াল ও ট্যাক্স অডিট রিপোর্ট',
      '২৪/৭ ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার',
      'কাস্টম এসএমএস গেটওয়ে ইন্টিগ্রেশন',
    ],
  },
];
