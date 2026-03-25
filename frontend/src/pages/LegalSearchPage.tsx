import { useState, useRef, useEffect } from 'react'
import { App, Button } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  BookOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 🚀 1. 引入我们刚刚定义好的真实 API 函数
import { searchRegulationApi } from '@/api/regulation'

const docSchema: SidebarSchema = {
  title: '条文检索',
  submitText: '开始检索',
  submitHint: '(消耗1点积分)', 
  hasSceneSwitch: false, 
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
            { label: '民法典', value: '1' },
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
          placeholder: '请输入您遇到的具体案情，或直接输入法律概念（如：彩礼返还、竞业限制、抽逃出资）',
          required: true,
        },
      ],
    },
  ],
}

export const LegalSearchPage = () => {
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
    }
  }, [id])

  // 这里保留历史记录的 Mock，后面你做历史记录接口时再替换
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
            markdownContent: '# 法条检索与AI适用解析报告\n\n## 历史检索记录\n此份报告为您之前保存的法条检索结果。',
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

  // 🚀 2. 重构提交表单：对接真实后端
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 提取表单数据并映射成后端需要的 lawType 字符串
      const lawMap: Record<string, string> = { 
        '1': '民法典', 
        '2': '劳动法', // 配合后端的提示词，简化为标准法律名称
        '3': '刑法', 
        '4': '公司法', 
        '5': '行政诉讼法', 
        '': '不限' 
      }
      
      const lawTypeStr = lawMap[values.docType] || '不限'
      const articleNumberStr = values.partyA || undefined
      const keywordStr = values.partyB

      // 🚀 发起真实的 API 请求
      const res = await searchRegulationApi({
        lawType: lawTypeStr,
        articleNumber: articleNumberStr,
        keyword: keywordStr,
      })

      // 根据你的拦截器，如果 HTTP 状态码不是 2xx 会抛出错误走 catch
      // 如果正常返回，拦截器直接抛出 response.data，所以这里可以直接取 res.code
      if (res.code === 0) {
        setDocData({
          title: '法条检索与AI适用解析报告',
          markdownContent: res.data, // 🚀 后端生成的 Markdown 正文就在这里
        })
        message.success('法条检索完毕，已扣除 1 积分')
      } else {
        // 处理业务级报错 (如积分不足等，通常由拦截器或这里统一提示)
        message.error(res.message || '检索失败')
      }

    } catch (error) {
      // 网络级别的报错（401, 500 等）已经被 globalMessage 拦截并提示了
      // 这里只需要把 loading 关掉即可，不需要额外弹窗
      console.error('检索请求异常:', error)
    } finally {
      setLoading(false)
    }
  }

  // 复制内容功能
  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('检索报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  // 导出 PDF 功能
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '法条检索报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={docSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              <BookOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 法条检索中
            </h2>
            <p className='text-[15px] text-gray-500'>正在为您匹配权威法律条文与司法解释，请稍后</p>
          </div>
        )}

        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧选择法律门类或描述案情，AI 将为您精准查摆现行有效法条
          </div>
        )}

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