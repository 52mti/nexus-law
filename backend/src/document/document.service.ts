import { Injectable, Logger } from '@nestjs/common';
import { DifyService } from '../dify/dify.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Observable } from 'rxjs';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(private readonly difyService: DifyService) {}

  /**
   * 生成法律文书 - 流式返回
   * 使用 Dify 平台定义的系统提示词处理
   *
   * @param dto 文书生成参数 { scene, document_type, party_a, party_b, content_desc }
   * @param user 用户身份
   * @returns Observable 流式返回内容
   */
  generateLegalDocument(
    dto: GenerateDocumentDto,
    user: string = 'guest',
    userToken?: string,
  ): Observable<any> {

    // 直接传入结构化参数给 Dify，由平台的系统提示词处理
    return this.difyService.generateDocumentStream(
      {
        scene: dto.scene,
        document_type: dto.document_type,
        party_a: dto.party_a,
        party_b: dto.party_b,
        content_desc: dto.content_desc,
      },
      user,
      userToken,
    );
  }

  findAll() {
    return `This action returns all document`;
  }

  findOne(id: number) {
    return `This action returns a #${id} document`;
  }

  update(id: number, updateDocumentDto: UpdateDocumentDto) {
    return `This action updates a #${id} document`;
  }

  remove(id: number) {
    return `This action removes a #${id} document`;
  }
}
