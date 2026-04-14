import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DifyService } from './dify.service';

@Module({
  imports: [ConfigModule],
  providers: [DifyService],
  exports: [DifyService],
})
export class DifyModule {}
