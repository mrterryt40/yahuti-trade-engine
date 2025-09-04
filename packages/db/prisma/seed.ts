import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create suppliers
  const g2aSupplier = await prisma.supplier.upsert({
    where: { id: 'sup_g2a' },
    update: {},
    create: {
      id: 'sup_g2a',
      name: 'G2A',
      rating: 4.8,
      country: 'PL',
      notes: 'Gaming keys marketplace'
    }
  });

  const kinguinSupplier = await prisma.supplier.upsert({
    where: { id: 'sup_kinguin' },
    update: {},
    create: {
      id: 'sup_kinguin',
      name: 'Kinguin',
      rating: 4.7,
      country: 'HK',
      notes: 'Digital game keys platform'
    }
  });

  const godaddySupplier = await prisma.supplier.upsert({
    where: { id: 'sup_godaddy' },
    update: {},
    create: {
      id: 'sup_godaddy',
      name: 'GoDaddy',
      rating: 4.5,
      country: 'US',
      notes: 'Domain registrar and marketplace'
    }
  });

  // Create sample inventory items
  await prisma.inventory.upsert({
    where: { id: 'inv_win10_demo' },
    update: {},
    create: {
      id: 'inv_win10_demo',
      sku: 'WIN10PRO',
      kind: 'KEY',
      cost: 8.00,
      provenance: 'G2A:order#demo123',
      encryptedBlobRef: 'vault/win10pro/demo.enc',
      proofHash: 'sha256:abcd1234567890...',
      policy: 'INSTANT',
      status: 'AVAILABLE',
      supplierId: g2aSupplier.id
    }
  });

  await prisma.inventory.upsert({
    where: { id: 'inv_av_demo' },
    update: {},
    create: {
      id: 'inv_av_demo',
      sku: 'AV_12MO',
      kind: 'SUBSCRIPTION',
      cost: 6.00,
      provenance: 'Kinguin:order#demo456',
      encryptedBlobRef: 'vault/antivirus/demo.enc',
      proofHash: 'sha256:efgh1234567890...',
      policy: 'INSTANT',
      status: 'AVAILABLE',
      supplierId: kinguinSupplier.id
    }
  });

  // Create sample listings
  await prisma.listing.upsert({
    where: { id: 'list_ebay_win10' },
    update: {},
    create: {
      id: 'list_ebay_win10',
      marketplace: 'EBAY',
      sku: 'WIN10PRO',
      title: 'Windows 10 Pro License Key - Instant Delivery',
      price: 24.99,
      floor: 23.50,
      ceiling: 26.00,
      positionRank: 2,
      views: 188,
      ctr: 0.052,
      sellThroughDays: 1.4,
      status: 'ACTIVE'
    }
  });

  // Create sample deal candidates
  await prisma.dealCandidate.create({
    data: {
      source: 'G2A',
      sku: 'WINSERVER2022',
      kind: 'KEY',
      cost: 15.00,
      estimatedResale: 45.00,
      estimatedFees: 5.85,
      netMargin: 0.537,
      confidence: 0.85,
      sellerScore: 4.9,
      expectedSellThroughDays: 2.1,
      quantity: 8,
      notes: 'High-demand server license'
    }
  });

  // Create default playbook
  await prisma.playbook.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      version: '1.0.0',
      content: `
sourcing:
  min_net_margin: 0.30
  min_seller_score: 4.7
  confidence_threshold: 0.70
  allow_categories: [keys, accounts, domains, giftcards]
  deny_categories: []
  daily_spend_cap_usd: 800
  per_category_caps:
    keys: 0.45
    accounts: 0.20
    domains: 0.25
    giftcards: 0.10

repricing:
  mode: balanced
  competitor_window: top3
  floor_offset_pct: -0.5
  ceiling_offset_pct: 4.0
  adjust_tick_usd: 0.50
  cool_down_minutes: 15

risk_governor:
  dispute_ceiling_7d: 0.015
  refund_ceiling_30d: 0.020
  auto_pause_on_market_warning: true
  throttle_on_spike:
    enabled: true
    dispute_spike_pct: 50
    throttle_factor: 0.5
  kill_switch_roles: [owner, admin]

capital_allocator:
  reinvest_pct: 0.80
  withdraw_pct: 0.20
  war_chest_target_usd: 20000
  roi_shift_threshold_pct: 8
  min_spend_per_category_usd: 50

marketplaces:
  ebay:
    percent: 0.129
    fixed: 0.30
  amazon:
    percent: 0.15
    fixed: 0.30
  g2g:
    percent: 0.08
    fixed: 0.30
  godaddy:
    percent: 0.10
    fixed: 0.00
  namecheap:
    percent: 0.10
    fixed: 0.00
  paypal:
    percent: 0.029
    fixed: 0.30
`,
      checksum: 'sha256:default_playbook_v1',
      status: 'ACTIVE',
      activatedAt: new Date()
    }
  });

  console.log('✅ Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });