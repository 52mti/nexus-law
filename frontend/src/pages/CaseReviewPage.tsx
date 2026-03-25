import { useState, useRef, useEffect } from 'react'
import { Button, App } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 🚀 1. 引入我们刚刚建好的 API
import { analyzeCaseSummaryApi } from '@/api/case-review'

// 侧边栏配置
const caseReviewSchema: SidebarSchema = {
  title: '案件快梳',
  submitText: '开始梳理', 
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: false, 
  categories: [
    {
      id: 'case_summary',
      title: '',
      formFields: [
        {
          name: 'caseMaterials',
          label: '案件资料上传',
          type: 'upload-dragger',
          required: true,
          placeholder: '支持上传起诉状、证据清单、合同等资料，可打包PDF/Docx上传',
        },
        // 🚀 2. 补上我们后端 DTO 里预留的 remarks 字段！体验拉满！
        {
          name: 'remarks',
          label: '当事人补充说明 (选填)',
          type: 'textarea',
          placeholder: '例如：请重点梳理第三份合同中的违约金条款，或者输入当事人的口头案情描述...',
          maxLength: 500,
        }
      ],
    },
  ],
}

export const CaseReviewPage = () => {
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

  // 历史记录拉取（目前保留 mock，后续对接历史接口）
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            caseMaterials: [], 
            remarks: '',
          },
          generatedResult: {
            title: '案件核心事实与争议焦点梳理',
            markdownContent: '# 案件核心事实与争议焦点梳理\n\n## 历史记录回显\n此份报告为历史生成的案件梳理记录。',
          },
        }
        setHistoryFormValues(mockResponse.formValues)
        setDocData(mockResponse.generatedResult)
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error(error)
      message.error('获取历史记录失败')
      setLoading(false)
    }
  }

  // 🚀 3. 重构提交逻辑：组装 FormData
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 创建 FormData 对象来携带文件
      const formData = new FormData()

      // 💡 关键：处理文件数组。兼容 Antd 的 fileList 结构，提取真实的 File 对象
      if (values.caseMaterials && values.caseMaterials.length > 0) {
        values.caseMaterials.forEach((fileItem: any) => {
          // Antd 的 Upload 组件会把真实文件挂载在 originFileObj 上
          const actualFile = fileItem.originFileObj || fileItem
          // 注意：这里的 'files' 必须和后端 @UseInterceptors(FilesInterceptor('files')) 保持名字一模一样！
          formData.append('files', actualFile)
        })
      } else {
        message.warning('请先上传至少一份案件资料')
        setLoading(false)
        return
      }

      // 如果有补充说明，也塞进 formData
      if (values.remarks) {
        formData.append('remarks', values.remarks)
      }

      // 🚀 4. 发起真实请求
      const res = await analyzeCaseSummaryApi(formData)

      if (res.code === 0) {
        setDocData({
          title: '案件核心事实与争议焦点梳理',
          markdownContent: res.data, // 渲染后端的 Markdown
        })
        message.success('案卷材料梳理完毕，已扣除 2 积分')
      } else {
        message.error(res.message || '梳理失败')
      }
    } catch (error) {
      // 网络级别的报错（401, 500 等）已经被全局拦截器提示过了
      console.error('案件快梳请求异常:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('梳理报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '案件梳理报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={caseReviewSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              <ReadOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 案卷梳理中
            </h2>
            <p className='text-[15px] text-gray-500'>正在提取时间线与核心证据，请稍后</p>
          </div>
        )}

        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧上传繁杂的案件资料，让 AI 为您一键生成清晰的案件脉络
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
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-700
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-table:w-full prose-table:my-6 prose-th:bg-gray-50 prose-th:p-3 prose-td:p-3 prose-td:border-b
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

export default CaseReviewPage