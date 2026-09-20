import request from '@/utils/request';

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