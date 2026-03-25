import React, { useState, useRef, useEffect } from 'react'
import { App, Button } from 'antd'
import {
  ShopOutlined,
  CopyOutlined,
  FundOutlined,
  PlaySquareOutlined,
  HeartOutlined,
  FormOutlined,
  MessageOutlined,
  DownloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import {
  SmartSidebar,
  type SidebarSchema,
  type SchemaField,
} from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 🚀 1. 引入我们刚刚定义好的 API
import { searchCaseApi } from '@/api/case-search'

const formFields: SchemaField[] = [
  {
    name: 'docType',
    label: '关键词信息',
    type: 'textarea',
    maxLength: 50,
    minRows: 3,
    maxRows: 5,
    placeholder: '请输入案由、争议焦点或关键法条',
    required: true, // 关键词是必须的
  },
  {
    name: 'content',
    label: '判决时间',
    type: 'date-range',
  },
  {
    name: 'partyA',
    label: '涉案金额',
    type: 'grid-radio',
    options: [
      { label: '1 万比尔以下', value: '1' },
      { label: '1-5 万比尔', value: '2' },
      { label: '5-20 万比尔', value: '3' },
      { label: '20-100 万比尔', value: '4' },
      { label: '100万比尔以上', value: '5' },
      { label: '不限', value: '' },
    ],
  },
  {
    name: 'partyB',
    label: '判决法院等级',
    type: 'grid-radio',
    options: [
      { label: '联邦最高法院', value: '1' },
      { label: '地区高等法院', value: '2' },
      { label: '基层法院', value: '3' },
      { label: '专门法院', value: '4' },
      { label: '不限', value: '' },
    ],
  },
]

const schema: SidebarSchema = {
  title: '案例智能检索',
  submitText: '开始检索',
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: true,
  categories: [
    {
      id: 'civil_case',
      title: '民事案件',
      description: '含婚姻家庭、邻里纠纷等',
      icon: <ShopOutlined />,
      formFields,
    },
    {
      id: 'criminal_case',
      title: '刑事案件',
      description: '含盗窃、故意伤害等',
      icon: <CopyOutlined />,
      formFields,
    },
    {
      id: 'labor_dispute',
      title: '劳动争议案件',
      description: '含劳动合同解除等',
      icon: <FundOutlined />,
      formFields,
    },
    {
      id: 'commercial_case',
      title: '商业案件',
      description: '含合同违约、股权纠纷等',
      icon: <PlaySquareOutlined />,
      formFields,
    },
    {
      id: 'administrative_case',
      title: '行政案件',
      description: '含行政许可、处罚等',
      icon: <HeartOutlined />,
      formFields,
    },
    {
      id: 'intellectual_property',
      title: '知识产权案件',
      description: '含商标侵权、专利等',
      icon: <FormOutlined />,
      formFields,
    },
    {
      id: 'family_case',
      title: '家事案件',
      description: '含离婚、子女抚养等',
      icon: <MessageOutlined />,
      formFields,
    },
  ],
}

export const CaseSearchPage = () => {
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

  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: '民间借贷、举证责任倒置',
            partyA: '3',
            partyB: '2',
          },
          generatedResult: {
            title: '案例智能检索报告',
            markdownContent:
              '# 案例智能检索报告\n\n## 历史检索记录\n这份报告为您之前保存的案例检索结果。',
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

  // 🚀 2. 对接真实 API 的表单提交逻辑
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      // 💡 核心细节：处理 Ant Design 的日期范围对象，转化为纯字符串数组发送给后端
      let formattedDateRange = undefined
      if (values.content && values.content.length === 2) {
        // 判断如果有 format 方法说明是 dayjs/moment 对象
        formattedDateRange = [
          typeof values.content[0].format === 'function'
            ? values.content[0].format('YYYY-MM-DD')
            : values.content[0],
          typeof values.content[1].format === 'function'
            ? values.content[1].format('YYYY-MM-DD')
            : values.content[1],
        ]
      }

      // 🚀 组装参数并调用 API
      const res = await searchCaseApi({
        categoryId: values.categoryId, // 如果你的 SmartSidebar 会把选中的栏目 id 混在 values 里传过来
        docType: values.docType,
        content: formattedDateRange,
        partyA: values.partyA || undefined,
        partyB: values.partyB || undefined,
      })

      if (res.code === 0) {
        setDocData({
          title: '案例智能检索报告',
          markdownContent: res.data,
        })
        message.success('案例检索完毕，已扣除 2 积分')
      } else {
        message.error(res.message || '检索失败')
      }
    } catch (error) {
      console.error('案例检索请求异常:', error)
      // 拦截器已经处理了全局报错，这里无需重复 toast
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('检索报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '案例检索报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={schema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              <SearchOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 全库检索中
            </h2>
            <p className='text-[15px] text-gray-500'>
              正在为您匹配最相关的历史判例，请稍后
            </p>
          </div>
        )}

        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧选择案件类型并输入检索条件，点击“开始检索”
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
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:mt-8
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
                复制报告
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

export default CaseSearchPage
