// src/utils/globalAntd.ts
import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

// 导出这三个全局变量，初始值为 null，稍后会被赋上真正的实例
export let globalMessage: MessageInstance;
export let globalModal: Omit<ModalStaticFunctions, 'warn'>;
export let globalNotification: NotificationInstance;

// 这是一个注入函数，供 React 组件调用
export const setGlobalAntd = (
  message: MessageInstance,
  modal: Omit<ModalStaticFunctions, 'warn'>,
  notification: NotificationInstance
) => {
  globalMessage = message;
  globalModal = modal;
  globalNotification = notification;
};