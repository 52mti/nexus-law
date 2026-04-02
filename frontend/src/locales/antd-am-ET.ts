// src/locales/antd-am-ET.ts
import type { Locale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';

// 借用英文包的底层时间库结构，只覆盖我们肉眼可见的常用组件文字
const amET: Locale = {
  ...enUS,
  locale: 'am',
  Pagination: {
    ...enUS.Pagination,
    items_per_page: '/ ገጽ', // / page
    jump_to: 'ሂድ ወደ', // Go to
    jump_to_confirm: 'አረጋግጥ', // Confirm
    page: 'ገጽ', // Page
    prev_page: 'ቀዳሚ ገጽ', // Previous Page
    next_page: 'ቀጣይ ገጽ', // Next Page
    prev_5: 'ያለፉት 5 ገጾች', // Previous 5 Pages
    next_5: 'ቀጣይ 5 ገጾች', // Next 5 Pages
    prev_3: 'ያለፉት 3 ገጾች',
    next_3: 'ቀጣይ 3 ገጾች',
  },
  Table: {
    ...enUS.Table,
    filterTitle: 'ማጣሪያ', // Filter menu
    filterConfirm: 'እሺ', // OK
    filterReset: 'ዳግም አስጀምር', // Reset
    filterEmptyText: 'ምንም ማጣሪያ የለም', // No filters
    emptyText: 'ምንም መረጃ የለም', // No data
    selectAll: 'ሁሉንም ምረጥ', // Select current page
    selectInvert: 'ምርጫን ገልብጥ', // Invert current page
    selectionAll: 'ሁሉንም ምረጥ', // Select all data
    sortTitle: 'ደርድር', // Sort
  },
  Modal: {
    okText: 'እሺ', // OK
    cancelText: 'ሰርዝ', // Cancel
    justOkText: 'እሺ', // OK
  },
  Popconfirm: {
    okText: 'እሺ', // OK
    cancelText: 'ሰርዝ', // Cancel
  },
  Transfer: {
    titles: ['', ''],
    searchPlaceholder: 'እዚህ ይፈልጉ', // Search here
    itemUnit: 'ንጥል', // item
    itemsUnit: 'ንጥሎች', // items
  },
  Empty: {
    description: 'ምንም መረጃ የለም', // No data
  },
  Text: {
    edit: 'አርትዕ', // Edit
    copy: 'ቅዳ', // Copy
    copied: 'ተቀድቷል', // Copied
    expand: 'ዘርጋ', // Expand
  },
};

export default amET;