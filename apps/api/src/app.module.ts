import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

// Feature modules
import { KpisModule } from './kpis/kpis.module';
import { HuntModule } from './hunt/hunt.module';
import { ListingsModule } from './listings/listings.module';
import { InventoryModule } from './inventory/inventory.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { RiskModule } from './risk/risk.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { PlaybooksModule } from './playbooks/playbooks.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { LedgerModule } from './ledger/ledger.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { G2AModule } from './g2a/g2a.module';

// System modules
import { ControlModule } from './control/control.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Scheduler
    ScheduleModule.forRoot(),

    // Core infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    KpisModule,
    HuntModule,
    ListingsModule,
    InventoryModule,
    TransactionsModule,
    CashflowModule,
    RiskModule,
    ExperimentsModule,
    PlaybooksModule,
    SuppliersModule,
    LedgerModule,
    WebhooksModule,
    G2AModule,

    // System modules
    ControlModule,
    HealthModule,
  ],
})
export class AppModule {}