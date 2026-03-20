import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 1. Create a native Postgres connection pool using your environment variable
    const connectionString = process.env.DATABASE_URL;
    console.log('🔴 正在连接的数据库地址是:', connectionString);
    const pool = new Pool({ connectionString });

    // 2. Wrap the pool in the Prisma adapter
    const adapter = new PrismaPg(pool);

    // 3. Hand the adapter to the underlying PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
