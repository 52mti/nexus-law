import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DifyModule } from './dify.module';

@Module({
  imports: [DifyModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [DifyModule],
})
export class ChatModule {}
