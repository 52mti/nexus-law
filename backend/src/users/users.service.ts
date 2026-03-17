import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  findAll() {
    return [
      {
        id: 1,
        name: '测试用户001',
      },
    ];
  }
  create(createUserPayload: CreateUserDto) {
    return {
      id: 1,
      nickname: createUserPayload.nickname,
    };
  }
}
