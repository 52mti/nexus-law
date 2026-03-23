import { Module, Global } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';

@Global() // 🚀 设为全局模块，文书、检索、合规等业务模块就能直接注入它了
@Module({
  imports: [ConfigModule],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
