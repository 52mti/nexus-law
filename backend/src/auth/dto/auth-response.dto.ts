export class AuthResponseDto {
  id: number;
  email: string;
  phone: string;
  token: string;
  expiresIn: number; // token过期时间（秒）
}
