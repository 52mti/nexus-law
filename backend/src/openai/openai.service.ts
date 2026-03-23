import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);

  constructor(private configService: ConfigService) {
    // 1. 初始化 OpenAI 客户端
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: this.configService.get<string>('OPENAI_BASE_URL'),
    });
  }

  /**
   * 核心生成方法：专为法律业务定制
   * @param systemPrompt 系统设定（用于规定身份和输出格式）
   * @param userPrompt 用户具体的案情或输入
   * @param temperature 创造力温度（法律业务建议设低，如 0.2）
   * @returns 返回纯正的 Markdown 字符串
   */
  async generateLegalMarkdown(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2,
  ): Promise<string> {
    try {
      this.logger.log(`正在调用大模型，设定温度: ${temperature}`);

      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat', // 或根据成本考虑使用 gpt-4o-mini
        temperature: temperature, // 🚀 法律文书需要严谨，不能让 AI 太“放飞自我”
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}\n\n⚠️ 重要要求：请直接输出 Markdown 格式正文，不要包含 \`\`\`markdown 这类代码块包裹符，也不要说“好的”、“这是您的文书”等废话。`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const result = response.choices[0].message.content;

      if (!result) {
        throw new Error('OpenAI 返回内容为空');
      }

      return result;
    } catch (error) {
      this.logger.error('OpenAI 调用失败', error);
      throw new InternalServerErrorException('AI 引擎暂时开小差了，请稍后再试');
    }
  }
}
