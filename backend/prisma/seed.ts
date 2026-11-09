import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { ALL_SYSTEM_PERMISSIONS } from '../src/common/constants/permissions.constant.js';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new (PrismaClient as unknown as new (opts?: any) => PrismaClient)({ adapter });

async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Permissions
  console.log('📌 Seeding permissions...');
  for (const perm of ALL_SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
      create: {
        name: perm.name,
        code: perm.code,
        module: perm.module,
        description: perm.description,
      },
    });
  }
  console.log(`✅ Seeded ${ALL_SYSTEM_PERMISSIONS.length} permissions.`);

  // 2. Seed SuperAdmins
  console.log('📌 Seeding SuperAdmins...');
  const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
  const superAdminEmails = ['admin@pos.com', 'admin@shop-platform.com'];

  for (const email of superAdminEmails) {
    const superAdmin = await prisma.superAdmin.upsert({
      where: { email },
      update: {
        first_name: 'Platform',
        last_name: 'Admin',
        phone: '+8801700000000',
        role: 'SUPER_ADMIN',
        is_active: true,
        password_hash: hashedPassword,
      },
      create: {
        email,
        password_hash: hashedPassword,
        first_name: 'Platform',
        last_name: 'Admin',
        phone: '+8801700000000',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
    });
    console.log(`✅ Seeded SuperAdmin: ${superAdmin.email}`);
  }

  // 3. Seed Plans & PlanLimits
  console.log('📌 Seeding Plans & Limits...');
  const starterPlan = await prisma.plan.upsert({
    where: { code: 'STARTER' },
    update: {
      name: 'Starter Boutique Plan',
      description: 'Single showroom clothing boutiques starting out',
      monthly_price: 1500.0,
      yearly_price: 15000.0,
      trial_days: 30,
      is_active: true,
    },
    create: {
      name: 'Starter Boutique Plan',
      code: 'STARTER',
      description: 'Single showroom clothing boutiques starting out',
      monthly_price: 1500.0,
      yearly_price: 15000.0,
      trial_days: 30,
      is_active: true,
    },
  });

  await prisma.planLimit.upsert({
    where: { plan_id: starterPlan.id },
    update: {
      max_branches: 1,
      max_users: 3,
      max_products: 500,
      max_variants: 1500,
      max_monthly_invoices: 1000,
      has_api_access: false,
      has_custom_reports: false,
      has_offline_sync: true,
    },
    create: {
      plan_id: starterPlan.id,
      max_branches: 1,
      max_users: 3,
      max_products: 500,
      max_variants: 1500,
      max_monthly_invoices: 1000,
      has_api_access: false,
      has_custom_reports: false,
      has_offline_sync: true,
    },
  });
  console.log(`✅ Seeded Plan: ${starterPlan.name} (${starterPlan.code})`);

  const businessPlan = await prisma.plan.upsert({
    where: { code: 'BUSINESS' },
    update: {
      name: 'Business Growth Plan',
      description: 'Multi-branch apparel retail chain with high sales volume and multi-store inventory',
      monthly_price: 3500.0,
      yearly_price: 35000.0,
      trial_days: 30,
      is_active: true,
    },
    create: {
      name: 'Business Growth Plan',
      code: 'BUSINESS',
      description: 'Multi-branch apparel retail chain with high sales volume and multi-store inventory',
      monthly_price: 3500.0,
      yearly_price: 35000.0,
      trial_days: 30,
      is_active: true,
    },
  });

  await prisma.planLimit.upsert({
    where: { plan_id: businessPlan.id },
    update: {
      max_branches: 5,
      max_users: 15,
      max_products: 5000,
      max_variants: 25000,
      max_monthly_invoices: 10000,
      has_api_access: true,
      has_custom_reports: true,
      has_offline_sync: true,
    },
    create: {
      plan_id: businessPlan.id,
      max_branches: 5,
      max_users: 15,
      max_products: 5000,
      max_variants: 25000,
      max_monthly_invoices: 10000,
      has_api_access: true,
      has_custom_reports: true,
      has_offline_sync: true,
    },
  });
  console.log(`✅ Seeded Plan: ${businessPlan.name} (${businessPlan.code})`);

  // 4. Seed Demo Retail Store Tenant
  console.log('📌 Seeding Demo Retail Store...');
  const demoSlug = 'demo-fashion';
  let demoBusiness = await prisma.business.findUnique({
    where: { slug: demoSlug },
  });

  const ownerHash = await bcrypt.hash('ShopOwner123!', 10);
  const cashierHash = await bcrypt.hash('Cashier123!', 10);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (!demoBusiness) {
    demoBusiness = await prisma.business.create({
      data: {
        name: 'Demo Fashion BD',
        slug: demoSlug,
        legal_name: 'Demo Fashion Bangladesh Ltd.',
        phone: '01711111111',
        email: 'owner@shop.com',
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
        status: 'ACTIVE',
        is_active: true,
      },
    });

    await prisma.subscription.create({
      data: {
        business_id: demoBusiness.id,
        plan_id: starterPlan.id,
        status: 'TRIAL',
        billing_cycle: 'MONTHLY',
        trial_starts_at: now,
        trial_ends_at: trialEndsAt,
        current_period_start: now,
        current_period_end: trialEndsAt,
        is_free_access: false,
      },
    });
  }

  // Ensure main branch
  let mainBranch = await prisma.branch.findFirst({
    where: { business_id: demoBusiness.id, is_main: true },
  });
  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        business_id: demoBusiness.id,
        name: 'Main Showroom - Dhanmondi',
        code: 'MAIN',
        address: 'House 42, Road 27, Dhanmondi, Dhaka',
        city: 'Dhaka',
        phone: '01711111111',
        email: 'owner@shop.com',
        is_main: true,
        is_active: true,
      },
    });
  }

  // Ensure cash register
  let cashReg = await prisma.cashRegister.findFirst({
    where: { business_id: demoBusiness.id, branch_id: mainBranch.id },
  });
  if (!cashReg) {
    await prisma.cashRegister.create({
      data: {
        business_id: demoBusiness.id,
        branch_id: mainBranch.id,
        name: 'Counter 01',
        code: 'CR-01',
        is_active: true,
      },
    });
  }

  // Ensure Roles
  const allPerms = await prisma.permission.findMany();
  let ownerRole = await prisma.role.findFirst({
    where: { business_id: demoBusiness.id, code: 'OWNER' },
  });
  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        business_id: demoBusiness.id,
        name: 'Owner',
        code: 'OWNER',
        description: 'Business owner with full administrative authority',
        is_system: true,
        role_permissions: {
          createMany: {
            data: allPerms.map((p) => ({ permission_id: p.id })),
          },
        },
      },
    });
  }

  const cashierAllowed = new Set([
    'pos:access',
    'sales:create',
    'sales:read',
    'sales:return',
    'sales:exchange',
    'due:collect',
    'register:open_close',
    'register:view',
    'cash:move',
    'products:read',
    'inventory:read',
    'barcode:print',
  ]);
  const cashierPerms = allPerms.filter((p) => cashierAllowed.has(p.code));

  let cashierRole = await prisma.role.findFirst({
    where: { business_id: demoBusiness.id, code: 'CASHIER' },
  });
  if (!cashierRole) {
    cashierRole = await prisma.role.create({
      data: {
        business_id: demoBusiness.id,
        name: 'POS Cashier',
        code: 'CASHIER',
        description: 'Front-desk point-of-sale checkout cashier',
        is_system: true,
        role_permissions: {
          createMany: {
            data: cashierPerms.map((p) => ({ permission_id: p.id })),
          },
        },
      },
    });
  }

  // Ensure Owner User
  let ownerUser = await prisma.user.findFirst({
    where: { business_id: demoBusiness.id, email: 'owner@shop.com' },
  });
  if (!ownerUser) {
    ownerUser = await prisma.user.create({
      data: {
        business_id: demoBusiness.id,
        first_name: 'Store',
        last_name: 'Owner',
        email: 'owner@shop.com',
        phone: '01711111111',
        password_hash: ownerHash,
        is_owner: true,
        role_id: ownerRole.id,
        is_active: true,
      },
    });

    await prisma.userBranchAccess.create({
      data: {
        business_id: demoBusiness.id,
        user_id: ownerUser.id,
        branch_id: mainBranch.id,
        is_default: true,
      },
    });
  }

  // Ensure Cashier User
  let cashierUser = await prisma.user.findFirst({
    where: { business_id: demoBusiness.id, email: 'cashier@shop.com' },
  });
  if (!cashierUser) {
    cashierUser = await prisma.user.create({
      data: {
        business_id: demoBusiness.id,
        first_name: 'Rahim',
        last_name: 'Cashier',
        email: 'cashier@shop.com',
        phone: '01722222222',
        password_hash: cashierHash,
        is_owner: false,
        role_id: cashierRole.id,
        is_active: true,
      },
    });

    await prisma.userBranchAccess.create({
      data: {
        business_id: demoBusiness.id,
        user_id: cashierUser.id,
        branch_id: mainBranch.id,
        is_default: true,
      },
    });
  }

  console.log(`✅ Demo Retail Store configured: Demo Fashion BD (slug: ${demoSlug})`);
  console.log(`   Owner: owner@shop.com / ShopOwner123! (Phone: 01711111111)`);
  console.log(`   Cashier: cashier@shop.com / Cashier123! (Phone: 01722222222)`);

  console.log('🎉 Database seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
