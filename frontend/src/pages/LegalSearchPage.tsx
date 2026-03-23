import React, { useState, useRef, useEffect } from 'react'
import { message, Button } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  BookOutlined, // 🚀 引入“法典/翻书”图标，契合查法条的场景
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const docSchema: SidebarSchema = {
  title: '条文检索',
  submitText: '开始检索',
  submitHint: '(消耗1点积分)', // 查法条通常消耗较少
  hasSceneSwitch: false, // 纯表单页
  categories: [
    {
      id: 'legal_search',
      title: '',
      formFields: [
        {
          name: 'docType',
          label: '条文类型',
          type: 'select',
          placeholder: '请选择相关法律门类',
          options: [
            { label: '民法典', value: '1' }, // 优化了基础选项
            { label: '劳动法/劳动合同法', value: '2' },
            { label: '刑法', value: '3' },
            { label: '公司法', value: '4' },
            { label: '行政诉讼法', value: '5' },
            { label: '不限/综合匹配', value: '' },
          ],
        },
        { 
          name: 'partyA', 
          label: '条款编号', 
          type: 'input',
          placeholder: '例如：第一千零四十二条',
        },
        { 
          name: 'partyB', 
          label: '案情或关键词描述', 
          type: 'textarea', 
          maxLength: 300,
          minRows: 4,
          maxRows: 8,
          placeholder: '请输入您遇到的具体案情，或直接输入法律概念（如：彩礼返还、竞业限制、抽逃出资）',
          required: true,
        },
      ],
    },
  ],
}

export const LegalSearchPage = () => {
  // 1. 路由参数与状态管理
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  // 2. 监听 URL ID 变化
  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
    }
  }, [id])

  // 3. 模拟拉取历史记录
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: '1',
            partyA: '',
            partyB: '结婚后彩礼要怎么退还？',
          },
          generatedResult: {
            title: '法条检索与AI适用解析报告',
            markdownContent:
              '# 法条检索与AI适用解析报告\n\n## 历史检索记录\n此份报告为您之前保存的法条检索结果。',
          },
        }
        setHistoryFormValues(mockResponse.formValues)
        setDocData(mockResponse.generatedResult)
        setLoading(false)
      }, 800)
    } catch (error) {
      message.error('获取历史记录失败')
      setLoading(false)
    }
  }

  // 4. 提交表单：模拟 AI 检索法条库
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 提取表单数据进行展示映射
      const lawMap: Record<string, string> = { '1': '民法典', '2': '劳动法/劳动合同法', '3': '刑法', '4': '公司法', '5': '行政诉讼法', '': '跨部门综合匹配' }
      const lawStr = lawMap[values.docType] || '跨部门综合匹配'
      const keyword = values.partyB || '未提供描述'
      const articleNum = values.partyA ? `指定 ${values.partyA}` : '未指定'

      // 模拟 AI 在法条库中检索的过程
      setTimeout(() => {
        setDocData({
          title: '法条检索与AI适用解析报告',
          markdownContent: `
# 法条检索与AI适用解析报告

## 一、 检索条件回顾
- **法律门类**：${lawStr}
- **条款目标**：${articleNum}
- **情境描述**：${keyword}

---

## 二、 权威法条原文匹配

### 《最高人民法院关于适用〈中华人民共和国民法典〉婚姻家庭编的解释（一）》
> **第五条**
> 当事人请求返还按照习俗给付的彩礼的，如果查明属于以下情形，人民法院应当予以支持：
> （一）双方未办理结婚登记手续；
> （二）双方办理结婚登记手续但确未共同生活；
> （三）婚前给付并导致给付人生活困难。
> 适用前款第二项、第三项的规定，应当以双方离婚为条件。

### 《最高人民法院关于审理涉彩礼纠纷案件适用法律若干问题的规定》 (2024年施行)
> **第五条**
> 双方已办理结婚登记且共同生活，离婚时一方请求返还按照习俗给付的彩礼的，人民法院一般不予支持。但是，如果共同生活时间较短且彩礼数额过高的，人民法院可以根据彩礼实际使用及嫁妆情况，综合考虑彩礼数额、共同生活及孕育情况、双方过错等事实，结合当地吉俗，确定是否返还以及返还的具体比例。

---

## 三、 AI 实务适用解析
针对您提出的 \`${keyword}\` 问题，法律的裁判逻辑不仅看**是否领证**，还要看**是否共同生活**以及**彩礼数额的实际情况**：
1. **绝对返还情形**：如果只是订婚给了彩礼，还没去民政局领证，彩礼必须退还。
2. **条件返还情形**：如果领了证，但是两人基本没怎么在一起生活过，或者因为给彩礼导致男方家连基本生活都维持不下去的，在**离婚的前提下**可以要求返还。
3. **酌情返还（新规）**：2024年最高法的最新规定明确，即使领了证也一起生活了，但如果**生活时间很短（比如闪婚闪离）**，且**彩礼金额巨大**的，法院也会结合有无孩子、过错方是谁等情况，判决退还一部分（按比例返还）。

> **法律数据溯源**：汇动法律 AI 现行有效法规库  
> **报告生成时间**：2026年 03月 22日
          `.trim(),
        })
        message.success('法条检索完毕，已扣除 1 积分')
        setLoading(false)
      }, 2500)
    } catch (error) {
      setLoading(false)
    }
  }

  // 5. 复制内容功能
  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('检索报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  // 6. 导出 PDF 功能
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '法条检索报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      {/* 侧边栏 */}
      <PortalSidebar>
        <SmartSidebar
          schema={docSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧主体区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {/* 状态一：AI 检索中 */}
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              {/* 🚀 专属的法典搜索图标 */}
              <BookOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 法条检索中
            </h2>
            <p className='text-[15px] text-gray-500'>正在为您匹配权威法律条文与司法解释，请稍后</p>
          </div>
        )}

        {/* 状态二：空状态 */}
        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧选择法律门类或描述案情，AI 将为您精准查摆现行有效法条
          </div>
        )}

        {/* 状态三：检索结果展示 */}
        {docData && !loading && (
          <div className='w-full h-full flex flex-col gap-6 max-w-4xl'>
            <div
              id='legal-document-paper'
              ref={paperRef}
              className='flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in print:shadow-none'
            >
              <div
                className='
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-10
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:text-primary
                prose-h3:text-lg prose-h3:mt-6 prose-h3:font-bold prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:mt-4 prose-blockquote:text-gray-700 prose-blockquote:font-serif
                prose-strong:text-black prose-strong:font-bold
              '
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            <div className='flex gap-4 m-auto'>
              <Button
                type='primary'
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                复制条文
              </Button>
              <Button
                className='bg-green-600 text-white hover:bg-green-500 border-none'
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
              >
                下载为 PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LegalSearchPage