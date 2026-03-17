import { Module } from '@nestjs/common';
// 导入我们刚才写好的控制器和服务
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
