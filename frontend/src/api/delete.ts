import request from '@/utils/request';

export const deleteConsultation = (id: string) => {
    return request.post<any, any>(`/consultation/delete`, {
        idList: [id]
    });
}
export const deleteDoc = (id: string) => {
    return request.post<any, any>(`/legalDocumentTranslation/delete`, {
        idList: [id]
    });
}
export const deleteCompliance = (id: string) => {
    return request.post<any, any>(`/complianceReview/delete`, {
        idList: [id]
    });
}