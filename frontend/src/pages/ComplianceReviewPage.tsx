import React, { useState, useRef, useEffect } from 'react'
import { App, Button, Form, Upload } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  BulbOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { useParams, useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
import { upload } from '@/api/file'
import {
  analyzeComplianceApi,
  getComplianceDetail,
  saveOrUpdateComplianceReview,
} from '@/api/compliance'

const { Dragger } = Upload

// ==========================================
// 🚀 WET: 私有自定义控件：色块单选
// ==========================================
const ColorRadio: React.FC<{
  value?: any
  onChange?: (val: any) => void
  options: any[]
}> = ({ value, onChange, options }) => (
  <div className="flex items-center gap-6">
    {options.map((opt) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          onClick={() => onChange?.(opt.value)}
          className={`flex items-center gap-2.5 cursor-pointer transition-all ${
            isSelected ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-sm transition-colors ${
              isSelected ? 'bg-[blue]' : 'bg-gray-500'
            }`}
          />
          <span className="text-[14px]">{opt.label}</span>
        </div>
      )
    })}
  </div>
)

const normFile = (e: any) => {
  if (Array.isArray(e)) return e
  return e?.fileList
}

export const ComplianceReviewPage = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isJustGenerated = useRef(false)

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
      if (isJustGenerated.current) {
        isJustGenerated.current = false
        return
      }
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

  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      const res = await getComplianceDetail(documentId)

      if ((res?.code === 200 || res?.code === 0) && res?.data) {
        const historyData = res.data

        // 🚀 1. 还原表单数据 ( reviewAngle & contractFile )
        setHistoryFormValues({
          reviewAngle: historyData.angleId,
          // ⚠️ 这里对 attachments 进行解析，如果是逗号分隔的 URL
          contractFile: historyData.attachments
            ? historyData.attachments.split(',').map((url: string, index: number) => ({
                uid: `-${index}`,
                name: url.split('/').pop() || 'file',
                status: 'done',
                url: url,
              }))
            : [],
        })

        // 🚀 2. 还原审核结果
        setDocData({
          title: t('atmo0oFvyytF9uwRncAV8'),
          markdownContent: historyData.content || '',
        })
      } else {
        message.error(res?.message || t('7gEeqjRG-8JBLFMo_Ol_G'))
        setDocData(null)
      }
    } catch (error) {
      console.error('获取合规审查记录异常:', error)
      message.error(t('7gEeqjRG-8JBLFMo_Ol_G'))
      setDocData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      const formData = new FormData()

      if (!values.contractFile || values.contractFile.length === 0) {
        message.warning(t('kTIFKlqKgXul4cyyFSNYE'))
        setLoading(false)
        return
      }

      values.contractFile.forEach((fileItem: any) => {
        const actualFile = fileItem.originFileObj || fileItem
        formData.append('files', actualFile)
      })
      formData.append('reviewAngle', values.reviewAngle)

      const uploadedFileUrls: string[] = []

      for (const fileItem of values.contractFile) {
        const actualFile = fileItem.originFileObj || fileItem
        const uploadRes = (await upload(actualFile, 'file')) as any

        if (uploadRes.code === 0 && uploadRes.data) {
          uploadedFileUrls.push(uploadRes.data.url!)
        } else {
          message.destroy('uploading')
          message.error(t('3gbfChGAla4chIHCIG9v3', { fileName: actualFile.name }))
          setLoading(false)
          return
        }
      }

      message.success({
        content: t('2RapijvA4HctFcWI9wkGN'),
        key: 'uploading',
      })

      const res = await analyzeComplianceApi(formData)

      if (res.code === 200 || res.code === 0) {
        setDocData({
          title: t('atmo0oFvyytF9uwRncAV8'),
          markdownContent: res.data,
        })

        const sessionId = crypto.randomUUID()

        try {
          await saveOrUpdateComplianceReview({
            id: sessionId,
            angleId: values.reviewAngle,
            attachments: uploadedFileUrls.join(','),
            content: res.data,
          } as any)

          if (!id) {
            isJustGenerated.current = true
            // 根据路由定义，跳转到 /compliance_review/:id
            navigate(`/compliance_review/${sessionId}`, { replace: true })
          }
        } catch (saveErr) {
          console.error('保存审查历史记录失败:', saveErr)
        }

        message.success(t('cUZWWl4N9oMOBKDgRn3ZG'))
      } else {
        message.error(res.message || t('qGKVMeZT1_gF6FoIkRlSB'))
      }
    } catch (error) {
      console.error('合规审查请求异常:', error)
      message.destroy('uploading')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success(t('pfk5N2gh2xlVa-43Ll9sJ')))
      .catch(() => message.error(t('w8mZWy1TYZfrI-B-fKlnW')))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t('U2WpvftSMaE36GNr_QdGY'),
    onAfterPrint: () => message.success(t('iOG-eFwD9sUZjVmAn0-1G')),
  })

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <div className="w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative">
          <div className="sticky top-0 bg-white z-10 pb-4 mb-2">
            <h2 className="text-xl font-bold text-gray-800 px-1">{t('arNSK77_1mBHqUKeHWOI9')}</h2>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={loading}
            className="flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5"
          >
            <div className="flex-1">
              {/* 合同文件上传 */}
              <Form.Item
                name="contractFile"
                label={t('bR1faWtplY_I9NvQTPZh3')}
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
                    {t('t9SEDPa3XyWRYojvGxacx')}
                  </p>
                </Dragger>
              </Form.Item>

              {/* 审查维度 */}
              <Form.Item name="reviewAngle" label={t('FyUUOpqA02HNZIdsaJmz4')} className="mb-6">
                <ColorRadio
                  options={[
                    { label: t('x9R1a-BqWjeY7Z2UB0z1q'), value: 'partyA' },
                    { label: t('IJILUOjKrBj3qyARlyzw_'), value: 'partyB' },
                    { label: t('yAZP_j2qBJ-w-gnNoCEV4'), value: 'neutral' },
                  ]}
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
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <BulbOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t('qy3Navxse0P_QP0zIaMJK')}{' '}
            </h2>
            <p className="text-[15px] text-gray-500">{t('tbzLyHrGyACHsPZCxh-oA')} </p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('zHt9iOfJjKfyDWLeicbfN')}{' '}
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
                prose-h3:text-lg prose-h3:mt-6
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{docData.markdownContent}</ReactMarkdown>
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

export default ComplianceReviewPage
