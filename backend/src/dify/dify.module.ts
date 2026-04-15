import { Module, Global } from '@nestjs/common';
import { DifyService } from './dify.service';

@Global()
@Module({
  providers: [DifyService],
  exports: [DifyService],
})
export class DifyModule {}
