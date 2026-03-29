import { useState, useRef, useEffect, useMemo } from 'react'
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

// 🚀 1. 引入定义好的 API 函数
import { searchRegulationApi, fetchDocType } from '@/api/regulation'

// 🚀 2. 剥离出静态的基础配置（把 options 置空，等待动态注入）
const baseDocSchema: SidebarSchema = {
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
          options: [], // 这里置空，稍后由组件内部动态填充
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

  // 🚀 3. 新增状态：存放动态获取的法律下拉选项
  const [docTypeOptions, setDocTypeOptions] = useState<{ label: string; value: string }[]>([
    { label: '数据加载中...', value: '' } // 默认占位符
  ])

  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  // 🚀 4. 组件挂载时，请求法律门类接口
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const res = await fetchDocType();
        if (res.successful && res.data?.records) {
          // 将后端的 records 映射成前端需要的 { label, value } 格式
          const options = res.data.records.map(record => ({
            label: record.name,
            // 💡 神级优化：直接拿 name 当 value，这样表单 submit 时直接就是中文，无需再做 Map 映射！
            value: record.name
          }));
          setDocTypeOptions(options);
        }
      } catch (err) {
        console.error('获取条文类型失败:', err);
        message.error('无法加载法律分类数据');
      }
    };

    loadOptions();
  }, [message]);

  // 🚀 5. 使用 useMemo 动态拼装最终的 Sidebar Schema
  const dynamicSchema = useMemo(() => {
    return {
      ...baseDocSchema,
      categories: baseDocSchema.categories.map(cat => ({
        ...cat,
        formFields: cat.formFields.map(field =>
          // 找到 docType 这个字段，把刚刚请求回来的 options 塞进去
          field.name === 'docType' ? { ...field, options: docTypeOptions } : field
        )
      }))
    };
  }, [docTypeOptions]);

  // 页面初始化 & 历史记录拉取
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
            // 注意：因为 value 变成了中文，历史记录的回显这里也应该是中文
            docType: '民法典',
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

  // 🚀 6. 极简版 Submit，无需再维护 lawMap
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      // 因为我们把 value 直接设置成了 record.name，所以 values.docType 拿到的直接是 "公司法"、"不限/综合匹配" 等
      let lawTypeStr = values.docType || '不限'

      // 稍微处理一下后端的特殊名称兜底
      if (lawTypeStr === '不限/综合匹配' || lawTypeStr === 'ANY') {
        lawTypeStr = '不限'
      }

      const articleNumberStr = values.partyA || undefined
      const keywordStr = values.partyB

      // 发起真实的 API 请求
      const res = await searchRegulationApi({
        lawType: lawTypeStr,
        articleNumber: articleNumberStr,
        keyword: keywordStr,
      })

      if (res.code === 200 || res.code === 0) {
        setDocData({
          title: '法条检索与AI适用解析报告',
          markdownContent: res.data,
        })
        message.success('法条检索完毕，已扣除 1 积分')
      } else {
        message.error(res.message || '检索失败')
      }

    } catch (error) {
      console.error('检索请求异常:', error)
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
    documentTitle: docData?.title || '法条检索报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={dynamicSchema} // 🚀 传入动态生成的 schema
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