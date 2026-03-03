import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 1. 准备你的翻译资源 (实际项目中建议抽离成单独的 JSON 文件)
const resources = {
  en: {
    translation: {
      "menu": {
        "legal_consult": "Legal Consult",
        "history": "History"
      },
      "header": {
        "quota": "Remaining Quota"
      }
    }
  },
  zh: {
    translation: {
      "menu": {
        "legal_consult": "法律咨询",
        "history": "历史记录"
      },
      "header": {
        "quota": "剩余额度"
      }
    }
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
    fallbackLng: 'zh', // 默认备用语言
    interpolation: {
      escapeValue: false, // React 已经自带防 XSS 注入，这里设置为 false 即可
    }
  });

export default i18n;