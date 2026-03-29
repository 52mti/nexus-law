import request from '@/utils/request';

/** ConsultationSession 表单数据 (由脚本抽取) */
export interface ConsultationSession {
    consultationId: string; // 咨询id
    content: string; // 咨询内容
    type: number; // 咨询类型 0用户 1ai
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateConsultationSession = (data: ConsultationSession) => {
    return request.post<any, any>('/consultationSession/saveOrUpdate', data);
};

/** Consultation 表单数据 (由脚本抽取) */
export interface Consultation {
    id: string;
    content: string; // 咨询内容
}

/**
 * 保存或更新
 * @param data 请求参数
 */
export const saveOrUpdateConsultation = (data: Consultation) => {
    return request.post<any, any>('/consultation/saveOrUpdate', data);
};

export const getConsultationHistory = (consultationId: string) => {
    return request.post<any, any>(`/consultationSession/pageList`, {
        consultationId, // 咨询id
        current: 1,
        size: 20,
    });
};