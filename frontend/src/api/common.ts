import request from '@/utils/request';

export const getPointsHistory = () => {
    return request.post<any, any>(`/points/pageList`, {});
};

export const getMessageNotification = () => {
    return request.post<any, any>(`/message-notify/pageList`, {});
};