import React, { useState, useRef, useEffect } from 'react'
import { App, Button } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 🚀 1. 引入刚刚创建的真实 API
import { analyzeComplianceApi } from '@/api/compliance'

const contractReviewSchema: SidebarSchema = {
  title: '合规审查',
  submitText: '开始审查',
  hasSceneSwitch: false, // 纯表单页，没列表
  categories: [
    {
      id: 'contract_review',
      title: '',
      formFields: [
        {
          name: 'contractFile',
          label: '合同/协议资料上传',
          type: 'upload-dragger',
          required: true,
          placeholder: '支持上传pdf/word格式文件，单个文件不能超过50M',
        },
        {
          name: 'reviewAngle',
          label: '审查角度',
          type: 'color-radio',
          required: true,
          options: [
            { label: '甲方', value: 'partyA' },
            { label: '乙方', value: 'partyB' },
            { label: '中立', value: 'neutral' },
          ],
        },
      ],
    },
  ],
}

// 💡 建议页面组件改名为 ComplianceReviewPage 以符合语义
export const ComplianceReviewPage = () => {
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

  // 历史记录逻辑暂留
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            reviewAngle: 'partyA',
          },
          generatedResult: {
            title: '法律合规审查报告',
            markdownContent:
              '# 法律合规审查报告\n\n## 审查概述\n本次审查为历史记录拉取展示，基于**甲方**立场对所提供文件进行合规性分析。\n\n## 核心风险提示\n1. 违约责任条款缺失。\n2. 管辖法院约定不明。',
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

  // 🚀 2. 重构提交表单逻辑
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      const formData = new FormData()

      // 提取文件并组装 (对应后端的 FilesInterceptor('files'))
      if (values.contractFile && values.contractFile.length > 0) {
        values.contractFile.forEach((fileItem: any) => {
          const actualFile = fileItem.originFileObj || fileItem
          formData.append('files', actualFile)
        })
      } else {
        message.warning('请先上传至少一份合同或协议资料')
        setLoading(false)
        return
      }

      // 提取审查角度 (对应后端的 AnalyzeComplianceDto)
      if (values.reviewAngle) {
        formData.append('reviewAngle', values.reviewAngle)
      } else {
        message.warning('请选择审查角度')
        setLoading(false)
        return
      }

      // 🚀 发起真实请求
      const res = await analyzeComplianceApi(formData)

      if (res.code === 0) {
        setDocData({
          title: '法律合规审查报告',
          markdownContent: res.data, 
        })
        message.success('合规审查完毕，已扣除 2 积分')
      } else {
        message.error(res.message || '审查失败')
      }

    } catch (error) {
      console.error('合规审查请求异常:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('审查报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '合规审查报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={contractReviewSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              <BulbOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 审查中
            </h2>
            <p className='text-[15px] text-gray-500'>正在深度研读合同条款，请稍后</p>
          </div>
        )}

        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧上传合同文件并选择审查角度，点击“开始审查”
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
                prose-h3:text-lg prose-h3:mt-6
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
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

export default ComplianceReviewPage