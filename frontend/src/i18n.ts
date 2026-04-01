import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 🚀 1. 引入你刚刚用 i18n Ally 提取生成的语言包 JSON
import zhCN from './locales/zh-CN.json';
import amET from './locales/am-ET.json';
import enUS from './locales/en-US.json'

// 🚀 2. 定义资源字典
const resources = {
  'zh-CN': {
    translation: zhCN, // 这里的 translation 是默认命名空间
  },
  'am-ET': {
    translation: amET,
  },
  'en-US': {
    translation: enUS
  }
};

i18n
  // 检测用户当前浏览器语言
  .use(LanguageDetector)
  // 将 i18n 实例传递给 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources,
    fallbackLng: 'zh-CN', // 默认备用语言
    interpolation: {
      escapeValue: false, // React 已经自带防 XSS 注入，这里设置为 false 即可
    }
  });

export default i18n;