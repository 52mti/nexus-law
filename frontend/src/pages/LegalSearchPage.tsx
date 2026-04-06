import { useState, useRef, useEffect } from 'react'
import { App, Button, Form, Input, Select } from 'antd'
import { CopyOutlined, DownloadOutlined, BookOutlined } from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
const { TextArea } = Input
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
// 🚀 1. 引入定义好的 API 函数
import { searchRegulationApi, fetchDocType } from '@/api/regulation'

export const LegalSearchPage = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))

  // 🚀 3. 新增状态：存放动态获取的法律下拉选项
  const [docTypeOptions, setDocTypeOptions] = useState<{ label: string; value: string }[]>([
    { label: t('WHROQYh-pDb9MgLg2RSmU'), value: '' }, // 默认占位符
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
        const res = await fetchDocType()
        if (res.successful && res.data?.records) {
          // 将后端的 records 映射成前端需要的 { label, value } 格式
          const options = res.data.records.map((record) => ({
            label: record.name,
            // 💡 神级优化：直接拿 name 当 value，这样表单 submit 时直接就是中文，无需再做 Map 映射！
            value: record.name,
          }))
          setDocTypeOptions(options)
        }
      } catch (err) {
        console.error('获取条文类型失败:', err)
        message.error(t('kykC5LX58b6EnR3FOCBgI'))
      }
    }

    loadOptions()
  }, [message])

  // 🚀 初始化表单实例
  const [form] = Form.useForm()

  // 页面初始化 & 历史记录拉取
  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
      form.resetFields()
    }
  }, [id, form])

  // 同步历史数据到表单
  useEffect(() => {
    if (historyFormValues) {
      form.setFieldsValue(historyFormValues)
    }
  }, [historyFormValues, form])

  const fetchHistoryData = async (_documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            // 注意：因为 value 变成了中文，历史记录的回显这里也应该是中文
            docType: t('UAZPpgBTIJgpvDONXsYcr'),
            partyA: '',
            partyB: t('T96TICuaZHAy8JmFBeXCm'),
          },
          generatedResult: {
            title: t('DY7mWmSdNrDwnPZE2zsAu'),
            markdownContent: t('vSGtfOKs_RHxNkbqXCKlh'),
          },
        }
        setHistoryFormValues(mockResponse.formValues)
        setDocData(mockResponse.generatedResult)
        setLoading(false)
      }, 800)
    } catch (error) {
      message.error(t('7gEeqjRG-8JBLFMo_Ol_G'))
      setLoading(false)
    }
  }

  // 🚀 6. 极简版 Submit，无需再维护 lawMap
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      // 因为我们把 value 直接设置成了 record.name，所以 values.docType 拿到的直接是 "公司法"、"不限/综合匹配" 等
      let lawTypeStr = values.docType || t('Vt_O0DK8M4pHvxNTaer0C')

      // 稍微处理一下后端的特殊名称兜底
      if (lawTypeStr === t('SeQbeqzJYI_HTlO_MsNDx') || lawTypeStr === 'ANY') {
        lawTypeStr = t('Vt_O0DK8M4pHvxNTaer0C')
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
          title: t('DY7mWmSdNrDwnPZE2zsAu'),
          markdownContent: res.data,
        })
        message.success(t('d1ERHF2PJJ1twOm4UtGH7'))
      } else {
        message.error(res.message || t('VOKXsXqVnXQyt4Fs-AV-d'))
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
      .then(() => message.success(t('rzDlGvz7sXbl6bygQc2qK')))
      .catch(() => message.error(t('w8mZWy1TYZfrI-B-fKlnW')))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t('ec_U3Y_ZsQIac5TRSBEtk'),
    onAfterPrint: () => message.success(t('iOG-eFwD9sUZjVmAn0-1G')),
  })

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <div className="w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative">
          <div className="sticky top-0 bg-white z-10 pb-4 mb-2">
            <h2 className="text-xl font-bold text-gray-800 px-1">{t('K6muFxI4R8oLhLoayHG0i')}</h2>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={loading}
            className="flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5"
          >
            <div className="flex-1">
              {/* 法规分类 */}
              <Form.Item
                name="docType"
                label={t('bR1faWtplY_I9NvQTPZh3')}
                rules={[{ required: true, message: t('Vf-eygv5pJxyv29T0vASc') }]}
                className="mb-5"
              >
                <Select
                  placeholder={t('Vf-eygv5pJxyv29T0vASc')}
                  size="large"
                  options={docTypeOptions}
                />
              </Form.Item>

              {/* 关键词 */}
              <Form.Item name="partyA" label={t('L5xpSenbz4WJwMMLEfqo7')} className="mb-5">
                <Input
                  placeholder={t('qW-Idgvp7HX75QZiI99FJ')}
                  size="large"
                  className="rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                />
              </Form.Item>

              {/* 检索语境 */}
              <Form.Item name="partyB" label={t('8XUdYlO1xq6cUK6o7U4gN')} className="mb-5">
                <TextArea
                  placeholder={t('5rkUqX0X_xjJxwZbm11gE')}
                  maxLength={500}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  className="rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                />
              </Form.Item>
            </div>

            <div className="sticky bottom-0 bg-white pt-4 pb-2 mt-4 z-10 border-t border-gray-50">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 bg-primary hover:bg-secondary border-none rounded-lg text-[16px] font-medium"
              >
                {loading ? t('d5TNTW2YxRAQIzHiaFYiC') : t('toepebiMD8WxhwGqE2uPQ')}
                {!loading && (
                  <span className="text-sm opacity-80">{t('GjNFCNGzRHYllP1yiRkkz')}</span>
                )}
              </Button>
            </div>
          </Form>
        </div>
      </PortalSidebar>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <BookOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t('bEx0e0O3N-WCrnZoG18wM')}{' '}
            </h2>
            <p className="text-[15px] text-gray-500">{t('y-UkRZxTxcsbW3LpNE2Bz')} </p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('WV18--Jh4o_1d0jTzepDi')}{' '}
          </div>
        )}

        {docData && !loading && (
          <div className="w-full h-full flex flex-col gap-6 max-w-4xl">
            <div
              id="legal-document-paper"
              ref={paperRef}
              className="flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in print:shadow-none"
            >
              <div
                className="
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-10
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:text-primary
                prose-h3:text-lg prose-h3:mt-6 prose-h3:font-bold prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:mt-4 prose-blockquote:text-gray-700 prose-blockquote:font-serif
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{docData.markdownContent}</ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-4 m-auto">
              <Button type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
                {t('nbTIU5hk7boHfh8nJm9jT')}{' '}
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-500 border-none"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
              >
                {t('uCa1Y6ndA6Wjk80c2DdMt')}{' '}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LegalSearchPage
