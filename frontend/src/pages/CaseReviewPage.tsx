import { useState, useRef, useEffect } from 'react'
import { Button, App, Form, Upload, Input } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReadOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { upload } from '@/api/file'

// 🚀 1. 引入我们刚刚建好的 API
import { analyzeCaseSummaryApi } from '@/api/case-review'

const { Dragger } = Upload
const { TextArea } = Input

const normFile = (e: any) => {
  if (Array.isArray(e)) return e
  return e?.fileList
}

export const CaseReviewPage = () => {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
      form.resetFields()
    }
  }, [id, form])

  useEffect(() => {
    if (historyFormValues) {
      form.setFieldsValue(historyFormValues)
    }
  }, [historyFormValues, form])

  // 历史记录拉取（目前保留 mock，后续对接历史接口）
  const fetchHistoryData = async (_documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            caseMaterials: [],
            remarks: '',
          },
          generatedResult: {
            title: t('YUqcb6d7cVYM5q7ehJ2N5'),
            markdownContent: t('fifiGN79-dqGLF1GfC16u'),
          },
        }
        setHistoryFormValues(mockResponse.formValues)
        setDocData(mockResponse.generatedResult)
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error(error)
      message.error(t('7gEeqjRG-8JBLFMo_Ol_G'))
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      if (!values.caseMaterials || values.caseMaterials.length === 0) {
        message.warning(t('FA0VmOz2_D0D41lTmBu-m'))
        setLoading(false)
        return
      }

      const uploadedFileUrls: string[] = []

      for (const fileItem of values.caseMaterials) {
        const actualFile = fileItem.originFileObj || fileItem

        // 过滤 URL 地址，如果是 URL 则不调用 upload 接口上传，直接使用其 URL
        if (typeof actualFile === 'string' && (actualFile.startsWith('http://') || actualFile.startsWith('https://'))) {
          uploadedFileUrls.push(actualFile)
          continue
        }
        if (actualFile && typeof actualFile === 'object' && typeof actualFile.url === 'string' && (actualFile.url.startsWith('http://') || actualFile.url.startsWith('https://'))) {
          uploadedFileUrls.push(actualFile.url)
          continue
        }

        const uploadRes = (await upload(actualFile, 'file')) as any

        if (uploadRes.code === 200 && uploadRes.data) {
          uploadedFileUrls.push(uploadRes.data.url!)
        } else {
          message.error(t('3gbfChGAla4chIHCIG9v3', { fileName: actualFile.name || 'file' }))
          setLoading(false)
          return
        }
      }

      let fullContent = ''
      const token = localStorage.getItem('token')

      // 先清空旧内容，准备流式填充
      setDocData({ title: t('YUqcb6d7cVYM5q7ehJ2N5'), markdownContent: '' })

      await fetchEventSource(`${import.meta.env.VITE_API_BASE_URL}/api/case-summary/analyze`, {
        method: 'POST',
        openWhenHidden: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'target-language': i18n.language,
        },
        body: JSON.stringify({
          remarks: values.remarks || '',
          fileUrls: uploadedFileUrls,
        }),
        onmessage(ev) {
          let data = ev.data
          if (!data) return

          const parsedContent = data.replace(/\\n/g, '\n')
          fullContent += parsedContent
          setDocData((prev) => ({
            ...prev!,
            markdownContent: fullContent,
          }))
        },
        onclose() {
          setLoading(false)
          message.success(t('EUMVx-oC3FlOfr1AavDFw'))
        },
        onerror(err) {
          console.error('SSE Error:', err)
          setLoading(false)
          message.error(t('jVmLS0apaNTqcH-Lui9Bm'))
          throw err
        },
      })
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
      .then(() => message.success(t('qtBB7I_ORtKSKPCky3qti')))
      .catch(() => message.error(t('w8mZWy1TYZfrI-B-fKlnW')))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t('b9DTbn1y0rmyvUESYYEc3'),
    onAfterPrint: () => message.success(t('iOG-eFwD9sUZjVmAn0-1G')),
  })

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <div className="w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative">
          <div className="sticky top-0 bg-white z-10 pb-4 mb-2">
            <h2 className="text-xl font-bold text-gray-800 px-1">{t('v62oh91W_duc1Jbd_i6fQ')}</h2>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={loading}
            className="flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5"
          >
            <div className="flex-1">
              <Form.Item
                name="caseMaterials"
                label={t('CfvXKNS6uT356fQdH4wOX')}
                rules={[{ required: true, message: t('FA0VmOz2_D0D41lTmBu-m') }]}
                valuePropName="fileList"
                getValueFromEvent={normFile}
                className="mb-6"
              >
                <Dragger
                  name="file"
                  multiple={false}
                  beforeUpload={() => false}
                  className="bg-[#f9fafc] border-gray-200 hover:border-primary transition-all"
                >
                  <p className="ant-upload-drag-icon pt-2">
                    <CloudUploadOutlined className="text-gray-400 text-6xl" />
                  </p>
                  <p className="ant-upload-text text-[14px] text-gray-600 mt-2">
                    {t('zP8GVqpuSy1aMeLsFg1CN')}
                    <span className="text-primary px-1">{t('TWAufyUFqaezZIEWxjwU9')}</span>
                  </p>
                  <p className="ant-upload-hint text-[12px] text-gray-400 mt-2 pb-2 px-4">
                    {t('sOvH8SmlQgTNc7gyc3AT8')}
                  </p>
                </Dragger>
              </Form.Item>

              <Form.Item
                name="remarks"
                label={t('6XlGndpsx3PcbGwtIhpGj')}
                className="mb-6"
                extra={
                  <span className="text-[12px] text-gray-400 whitespace-pre-line">
                    {t('zQknia65JY5tLf6iJ2jrB')}
                  </span>
                }
              >
                <TextArea
                  placeholder={t('CaseReviewPage_Remarks_Placeholder')}
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
                {loading ? t('d5TNTW2YxRAQIzHiaFYiC') : t('8PdBQnDRgcna1nxeZQ7pK')}
                {!loading && (
                  <span className="text-sm opacity-80">{t('GjNFCNGzRHYllP1yiRkkz')}</span>
                )}
              </Button>
            </div>
          </Form>
        </div>
      </PortalSidebar>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (!docData || !docData.markdownContent) && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <ReadOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t('P-ky1VYEPyQhD7eTXso4F')}{' '}
            </h2>
            <p className="text-[15px] text-gray-500">{t('PBd_5Zc5MY9mPEijZAXGs')}</p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('MgTivlPyoyfUHSa0VoYGX')}{' '}
          </div>
        )}

        {docData && docData.markdownContent && (
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
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-700
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-table:w-full prose-table:my-6 prose-th:bg-gray-50 prose-th:p-3 prose-td:p-3 prose-td:border-b
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent + (loading ? ' ▎' : '')}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex gap-4 m-auto">
              <Button type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
                {t('mv6JrcXr2_kqMLT80hI_z')}{' '}
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

export default CaseReviewPage
