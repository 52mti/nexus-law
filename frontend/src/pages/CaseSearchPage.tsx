import { useState, useRef, useEffect } from 'react'
import { App, Button, Form, Input, DatePicker } from 'antd'
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
  RightOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SidebarSkeleton } from '@/components/Skeleton/SidebarSkeleton'
const { TextArea } = Input
const { RangePicker } = DatePicker

// ==========================================
// 🚀 WET: 私有自定义控件：网格单选
// ==========================================
const GridRadio: React.FC<{
  value?: any
  onChange?: (val: any) => void
  options: any[]
}> = ({ value, onChange, options }) => (
  <div className="grid grid-cols-3 gap-2">
    {options.map((opt) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          onClick={() => onChange?.(opt.value)}
          className={`flex items-center justify-center py-2 px-1 text-[13px] rounded-md cursor-pointer transition-all border ${
            isSelected
              ? 'bg-blue-50/50 border-primary text-primary'
              : 'bg-[#f7f8fb] border-transparent text-gray-600 hover:bg-[#f0f2f7]'
          }`}
        >
          {opt.label}
        </div>
      )
    })}
  </div>
)
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'

// 🚀 1. 引入我们刚刚定义好的 API
import { searchCaseApi } from '@/api/case-search'

export const CaseSearchPage = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  const formFields = [
    {
      name: 'docType',
      label: t('vrc8FMiOMJLfy5TV-Z1df'),
      type: 'textarea',
      maxLength: 50,
      minRows: 3,
      maxRows: 5,
      placeholder: t('4DFHZtQYAZ7gC5_vBD1tq'),
      required: true, // 关键词是必须的
    },
    {
      name: 'content',
      label: t('yN2Xq2fwr0961KghamVei'),
      type: 'date-range',
    },
    {
      name: 'partyA',
      label: t('96WDQYmnYCYy_opsZtbiI'),
      type: 'grid-radio',
      options: [
        { label: t('CB_lMYLrLe3X_X8qhQDmd'), value: '1' },
        { label: t('9sWsSNz9zDWEf03fOvlhh'), value: '2' },
        { label: t('k1K1hQ9zAAapv6Iw66P4b'), value: '3' },
        { label: t('4U9p4C7Ts_rA5Sjl0HxqP'), value: '4' },
        { label: t('1w3rWe9tEtnkxJbHRMKUJ'), value: '5' },
        { label: t('Vt_O0DK8M4pHvxNTaer0C'), value: '' },
      ],
    },
    {
      name: 'partyB',
      label: t('hsCj3_mNHAeWGbPdQN7AV'),
      type: 'grid-radio',
      options: [
        { label: t('iM2vyMDVJKMw9Xki0UpD2'), value: '1' },
        { label: t('HV67dpQA3dPKrcwT1ruC_'), value: '2' },
        { label: t('gQvnO5JFSkWQwoM2p1UIG'), value: '3' },
        { label: t('ZSL-vpK_G0JtsygMlNUZV'), value: '4' },
        { label: t('Vt_O0DK8M4pHvxNTaer0C'), value: '' },
      ],
    },
  ]

  const schema = {
    title: t('K6muFxI4R8oLhLoayHG0i'),
    submitText: t('toepebiMD8WxhwGqE2uPQ'),
    submitHint: t('GjNFCNGzRHYllP1yiRkkz'),
    hasSceneSwitch: true,
    categories: [
      {
        id: 'civil_case',
        title: t('d_uJQZeDyn74xUeNppZB9'),
        description: t('lMsp9Sl_ViqHvInWvKIO4'),
        icon: <ShopOutlined />,
        formFields,
      },
      {
        id: 'criminal_case',
        title: t('5j03-LmIkiWag8j_eCo4u'),
        description: t('YUOkkLgf7F95KuyKVe-w7'),
        icon: <CopyOutlined />,
        formFields,
      },
      {
        id: 'labor_dispute',
        title: t('WiKgJOz_x9BAgEOuwnLE2'),
        description: t('xsOehM2qboKuMBGUjipg_'),
        icon: <FundOutlined />,
        formFields,
      },
      {
        id: 'commercial_case',
        title: t('b5Cys68nDO8L1pz7T6t4T'),
        description: t('GwIjK37yO1LvjvaieX2Lt'),
        icon: <PlaySquareOutlined />,
        formFields,
      },
      {
        id: 'administrative_case',
        title: t('_oSy-_sraRP7iE8ExTWk4'),
        description: t('qNCXhySnDIkCZrM1-0uWk'),
        icon: <HeartOutlined />,
        formFields,
      },
      {
        id: 'intellectual_property',
        title: t('g6P-lxiw4wl7OwPgfjT4R'),
        description: t('zhafo1IaEByi117I6R37e'),
        icon: <FormOutlined />,
        formFields,
      },
      {
        id: 'family_case',
        title: t('GkVYG4CGdWa6I61a8TP38'),
        description: t('5ouL_iYICrROf03fGUkhM'),
        icon: <MessageOutlined />,
        formFields,
      },
    ],
  }

  // 🚀 初始化状态
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
      setActiveCategoryId(null)
      form.resetFields()
    }
  }, [id, form])

  useEffect(() => {
    if (historyFormValues) {
      // 这里的逻辑需要根据实际历史数据返回的 categoryId 自动切换场景
      if (historyFormValues.categoryId) {
        setActiveCategoryId(historyFormValues.categoryId)
      }
      form.setFieldsValue(historyFormValues)
    }
  }, [historyFormValues, form])

  const fetchHistoryData = async (_documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: t('YaBCnl6tvfWnAGBfQSJaq'),
            partyA: '3',
            partyB: '2',
          },
          generatedResult: {
            title: t('3m5i1Q2VPoDDVJFN6KqPv'),
            markdownContent: t('MS49vqHaM_KoSQrcRc-9x'),
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
          title: t('3m5i1Q2VPoDDVJFN6KqPv'),
          markdownContent: res.data,
        })
        message.success(t('CBy4zalzaA5oMw39uUxlw'))
      } else {
        message.error(res.message || t('VOKXsXqVnXQyt4Fs-AV-d'))
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
      .then(() => message.success(t('rzDlGvz7sXbl6bygQc2qK')))
      .catch(() => message.error(t('w8mZWy1TYZfrI-B-fKlnW')))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t('e78sbe7XyxOaSoKWUhjx7'),
    onAfterPrint: () => message.success(t('iOG-eFwD9sUZjVmAn0-1G')),
  })

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <div className="w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative">
          <div className="sticky top-0 bg-white z-10 pb-4 mb-2">
            <h2 className="text-xl font-bold text-gray-800 px-1">{t('K6muFxI4R8oLhLoayHG0i')}</h2>
          </div>

          {/* 场景 A：分类列表 */}
          {!activeCategoryId && (
            <div className="flex flex-col gap-4 pb-6">
              {loading ? (
                <SidebarSkeleton count={6} />
              ) : (
                schema.categories.map((cat: any) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setActiveCategoryId(cat.id)
                      form.resetFields()
                    }}
                    className="flex items-center gap-4 p-4 h-20 rounded-xl bg-[#f7f8fb] hover:bg-[#f0f2f7] transition-all cursor-pointer group"
                  >
                    <div className="text-primary text-[25px] font-light shrink-0 mt-0.5 opacity-90 group-hover:opacity-100 transition-transform">
                      {cat.icon}
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[16px] font-bold text-gray-800 mb-1">{cat.title}</div>
                      <div className="text-[12px] text-gray-500 leading-tight line-clamp-2">
                        {cat.description}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 场景 B：具体表单 */}
          {activeCategoryId && (
            <div className="flex flex-col flex-1 animate-fade-in">
              <div
                onClick={() => !loading && setActiveCategoryId(null)}
                className={`flex items-center justify-between p-4 rounded-xl transition-all mb-6 group ${
                  loading
                    ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'bg-[#f7f8fb] hover:bg-[#f0f2f7] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-primary text-[20px] flex items-center">
                    {schema.categories.find((c: any) => c.id === activeCategoryId)?.icon}
                  </div>
                  <span className="font-bold text-gray-800 text-[15px]">
                    {schema.categories.find((c: any) => c.id === activeCategoryId)?.title}
                  </span>
                </div>
                <div className="text-[13px] text-gray-400 group-hover:text-primary transition-colors flex items-center gap-0.5">
                  {t('2OXNVjX7By70r2VKRpvS_')} <RightOutlined className="text-[10px]" />
                </div>
              </div>

              <Form
                form={form}
                layout="vertical"
                onFinish={(values) => handleSubmit({ ...values, categoryId: activeCategoryId })}
                disabled={loading}
                className="flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5"
              >
                <div className="flex-1">
                  <Form.Item
                    name="docType"
                    label={t('vrc8FMiOMJLfy5TV-Z1df')}
                    rules={[
                      {
                        required: true,
                        message: t('qUdlcEfyqonQ-gEzyF7ab', { label: t('vrc8FMiOMJLfy5TV-Z1df') }),
                      },
                    ]}
                    className="mb-5"
                  >
                    <TextArea
                      placeholder={t('4DFHZtQYAZ7gC5_vBD1tq')}
                      size="large"
                      maxLength={50}
                      autoSize={{ minRows: 3, maxRows: 5 }}
                      className="rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                    />
                  </Form.Item>

                  <Form.Item name="content" label={t('yN2Xq2fwr0961KghamVei')} className="mb-5">
                    <RangePicker
                      size="large"
                      className="w-full rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                      placeholder={[t('_R6bivQM7nE5ms5Y9ufU0'), t('DMPDGt_10Y5-qpkliXr_a')]}
                    />
                  </Form.Item>

                  <Form.Item name="partyA" label={t('96WDQYmnYCYy_opsZtbiI')} className="mb-6">
                    <GridRadio
                      options={[
                        { label: t('CB_lMYLrLe3X_X8qhQDmd'), value: '1' },
                        { label: t('9sWsSNz9zDWEf03fOvlhh'), value: '2' },
                        { label: t('k1K1hQ9zAAapv6Iw66P4b'), value: '3' },
                        { label: t('4U9p4C7Ts_rA5Sjl0HxqP'), value: '4' },
                        { label: t('1w3rWe9tEtnkxJbHRMKUJ'), value: '5' },
                        { label: t('Vt_O0DK8M4pHvxNTaer0C'), value: '' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item name="partyB" label={t('hsCj3_mNHAeWGbPdQN7AV')} className="mb-6">
                    <GridRadio
                      options={[
                        { label: t('iM2vyMDVJKMw9Xki0UpD2'), value: '1' },
                        { label: t('HV67dpQA3dPKrcwT1ruC_'), value: '2' },
                        { label: t('gQvnO5JFSkWQwoM2p1UIG'), value: '3' },
                        { label: t('ZSL-vpK_G0JtsygMlNUZV'), value: '4' },
                        { label: t('Vt_O0DK8M4pHvxNTaer0C'), value: '' },
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
                    {loading ? t('d5TNTW2YxRAQIzHiaFYiC') : t('toepebiMD8WxhwGqE2uPQ')}
                    {!loading && t('GjNFCNGzRHYllP1yiRkkz') && (
                      <span className="text-sm opacity-80">{t('GjNFCNGzRHYllP1yiRkkz')}</span>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </PortalSidebar>

      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            <div className="mb-6">
              <SearchOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t('wkI81IUK5upf5-Ix4UElT')}{' '}
            </h2>
            <p className="text-[15px] text-gray-500">{t('I5wW3yZFXg1ekNa4asx9k')} </p>
          </div>
        )}

        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('acGT3-7Tezrp4ITE8HyLh')}{' '}
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
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:mt-8
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

export default CaseSearchPage
