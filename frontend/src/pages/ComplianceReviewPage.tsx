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

// 🚀 1. 引入文件上传和合规审查的 API
import { upload } from '@/api/file'
import { saveOrUpdateComplianceReviewSession } from '@/api/saveOrUpdate'
import { analyzeComplianceApi } from '@/api/compliance'

const contractReviewSchema: SidebarSchema = {
  title: '合规审查',
  submitText: '开始审查',
  hasSceneSwitch: false,
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

  // ==========================================
  // 🚀 2. 重构核心逻辑：先上传 OSS，再调合规接口
  // ==========================================
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const formData = new FormData()

      // 第一步验证必填项
      if (!values.contractFile || values.contractFile.length === 0) {
        message.warning('请先上传至少一份合同或协议资料')
        setLoading(false)
        return
      }
      if (!values.reviewAngle) {
        message.warning('请选择审查角度')
        setLoading(false)
        return
      }
      values.contractFile.forEach((fileItem: any) => {
        const actualFile = fileItem.originFileObj || fileItem
        formData.append('files', actualFile)
      })
      formData.append('reviewAngle', values.reviewAngle)

      // ------------------------------------------
      // 🚀 步骤 A: 遍历并调用 upload 接口上传文件
      // ------------------------------------------
      const uploadedFileUrls: string[] = [] // 用于存放上传成功后的文件链接 (或者 ID)

      // 使用 for...of 保证按顺序 await 上传
      for (const fileItem of values.contractFile) {
        const actualFile = fileItem.originFileObj || fileItem

        // 调用刚刚改写好的 upload 接口
        const uploadRes = await upload(actualFile, 'file')

        if (uploadRes.successful && uploadRes.data) {
          // 💡 这里取 URL 还是 ID，取决于你后端合规接口想要什么。通常传 URL 或 ID 过去即可。
          uploadedFileUrls.push(uploadRes.data.url!)
        } else {
          message.destroy('uploading')
          message.error(`文件 ${actualFile.name} 上传失败`)
          setLoading(false)
          return // 只要有一个文件上传失败，就立刻阻断流程
        }
      }

      message.success({ content: '文件上传成功，正在呼叫 AI 进行深度审查...', key: 'uploading' })

      // 发起真实请求
      const res = await analyzeComplianceApi(formData)

      if (res.code === 200 || res.code === 0) {
        setDocData({
          title: '法律合规审查报告',
          markdownContent: res.data,
        })

        // ------------------------------------------
        // 🚀 步骤 C: 保存本次审查的结果、文件和角度
        // ------------------------------------------
        try {
          await saveOrUpdateComplianceReviewSession({
            reviewAngle: values.reviewAngle, // 审查角度
            fileUrls: uploadedFileUrls,      // 上传的源文件地址(或ID)数组
            content: res.data                // AI生成的Markdown审查报告
            // 如果接口还需要其他的标识（如 consultationId），你可以在这里一并传入
          })
        } catch (saveErr) {
          console.error('保存审查历史记录失败:', saveErr)
          // 仅打印日志，不阻断页面正常渲染，你也可以按需 message.warning 提示用户
        }

        message.success('合规审查完毕，已扣除 2 积分')
      } else {
        message.error(res.message || '审查失败')
      }

    } catch (error) {
      console.error('合规审查请求异常:', error)
      message.destroy('uploading') // 兜底清理提示框
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