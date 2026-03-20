import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 💡 加上这个装饰器，你就不用在每个业务模块里重复 import 它了
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 导出后，别人才能注入使用
})
export class PrismaModule {}
