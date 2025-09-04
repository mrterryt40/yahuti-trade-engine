import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@yahuti/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'colorless',
    });

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e: any) => {
        if (e.duration > 1000) {
          this.logger.warn(`Slow query detected: ${e.duration}ms - ${e.query}`);
        }
      });
    }
  }

  async onModuleInit() {
    this.logger.log('🔌 Connecting to database...');
    await this.$connect();
    this.logger.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('✅ Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Clean in reverse order due to foreign key constraints
    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        } catch (error) {
          console.log({ error });
        }
      }
    }
  }
}