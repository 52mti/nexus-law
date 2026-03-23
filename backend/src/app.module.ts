import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 💡 1. 导入官方配置模块
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OpenaiModule } from './openai/openai.module';
import { DocumentModule } from './document/document.module';
@Module({
  imports: [
    // 💡 2. 把 ConfigModule 放在 imports 数组的【绝对第一位】！
    ConfigModule.forRoot({
      isGlobal: true, // 开启全局模式，这样所有的 Service 都能立刻读到环境变量
    }),
    PrismaModule,
    AuthModule,
    OpenaiModule,
    DocumentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
