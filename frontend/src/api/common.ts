import request from '@/utils/request';

export const getPointsHistory = () => {
    return request.post<any, any>(`/points/pageList`, {});
};

export const getMessageNotification = () => {
    return request.post<any, any>(`/message-notify/pageList`, {});
};

// 咨询历史记录
export const getConsultationList = () => {
    return request.post<any, any>(`/consultation/pageList`, {});
}

// 条文生成历史记录
export const getDocumentList = () => {
    return request.post<any, any>(`/document/pageList`, {});
}

//  合规审查历史记录
export const getComplianceReviewList = () => {
    return request.post<any, any>(`/complianceReview/pageList`, {});
}