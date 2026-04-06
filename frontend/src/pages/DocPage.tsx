import { useState, useRef, useEffect } from 'react'
import { App, Button } from 'antd'
import {
  BlockOutlined,
  AimOutlined,
  PartitionOutlined,
  ClusterOutlined,
  FormOutlined,
  ApartmentOutlined,
  BuildOutlined,
  ProfileOutlined,
  DeploymentUnitOutlined,
  CopyOutlined,
  DownloadOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SidebarSkeleton } from '@/components/Skeleton/SidebarSkeleton'
import { RightOutlined } from '@ant-design/icons'
import { Form, Input, Select } from 'antd'

const { TextArea } = Input
// 🚀 1. 引入 useNavigate
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, saveDocument, getDocumentDetail } from '@/api/document'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'

export const DocPage = () => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { id } = useParams<{ id: string }>()

  // 🚀 2. 初始化 useNavigate
  const navigate = useNavigate()
  // 🚀 3. 新增一个 useRef 标记，用来判断是否是“刚刚生成完毕”
  const isJustGenerated = useRef(false)

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
      label: t('O3lW7GA0P-29WSOC79z4s'),
      type: 'select',
      placeholder: t('IeuYDSfa4a16iCUpkCX4n'),
      options: [
        { label: t('CLz9ayEhi1_W7diFk9Dci'), value: '0' },
        { label: t('UkrqIKSlFb-yYHCNPeoKC'), value: '1' },
        { label: t('3tDSz4-nfMFQDmLdK_1I0'), value: '2' },
        { label: t('dvji6mpyXI-zm3GFxZ3wJ'), value: '3' },
        { label: t('Gbfu7J2vR3GcTsqb9Eq8A'), value: '4' },
        { label: t('9ExzHanpbBUmWRpvUu4-j'), value: '5' },
        { label: t('YJZLOi3212XFt5zAOJUvx'), value: '8' },
        { label: t('GOAkpRo2e5RLaffi1zO1I'), value: '9' },
      ],
    },
    {
      name: 'content',
      label: t('2PA2wuQkr2YQ_r2W-Mp8S'),
      type: 'textarea',
      maxLength: 1000,
      minRows: 10,
      maxRows: 18,
      placeholder: t('FLOQLls0LWj91JvI_65tn'),
    },
    {
      name: 'partyA',
      label: t('3Ciew_RfVQBCLYEuoubMA'),
      type: 'textarea',
      maxLength: 100,
      placeholder: t('9QScDxuO43b-aylXttgio'),
    },
    {
      name: 'partyB',
      label: t('CccrIZftBpy9Pp3TumH2U'),
      type: 'textarea',
      maxLength: 100,
      placeholder: t('hIKILc_dVjVipLHKKSAIQ'),
    },
  ]

  const docSchema = {
    title: t('oyui4_Zm6W2vEYCn7Gw3T'),
    submitText: t('D44eZM-z5xabv94vnapBw'),
    submitHint: t('GjNFCNGzRHYllP1yiRkkz'),
    hasSceneSwitch: true,
    categories: [
      {
        id: 'civil_lawsuit',
        title: t('pZG3HWwoUi_2FNM0-XJLG'),
        description: t('br3gSnrLbTzuZm7z2vOHI'),
        icon: <BlockOutlined />,
        formFields,
      },
      {
        id: 'civil_defense',
        title: t('014CHY3Fzw5q_meNNYzht'),
        description: t('FF1nlJ5KmY42QiYDvlwPa'),
        icon: <AimOutlined />,
        formFields,
      },
      {
        id: 'property_evidence',
        title: t('0QhqHWkQPX_FSZge52sFv'),
        description: t('c9VlT4QbER-13OVsL48rV'),
        icon: <PartitionOutlined />,
        formFields,
      },
      {
        id: 'labor_contract',
        title: t('-53FdczzsCVuhoCMrOAiF'),
        description: t('xh8cMb3JMB9Vy2R4HuzBZ'),
        icon: <ClusterOutlined />,
        formFields,
      },
      {
        id: 'commercial_contract',
        title: t('rKyONUfIHLRFphguByAqC'),
        description: t('hNKDJ6pkRPsV9_iOtQkL1'),
        icon: <FormOutlined />,
        formFields,
      },
      {
        id: 'civil_life_contract',
        title: t('5MQH81eDckRvzfiupAwqI'),
        description: t('ykpT12Fo8GoHBQuMtaF9D'),
        icon: <ApartmentOutlined />,
        formFields,
      },
      {
        id: 'marriage_family_agreement',
        title: t('9lWi3DFaW1k_dMyPircOl'),
        description: t('Ou7hKe9L5uDMcO8VAICfE'),
        icon: <BuildOutlined />,
        formFields,
      },
      {
        id: 'labor_arbitration',
        title: t('L8fLLN3IBKkidwcjLy3Lt'),
        description: t('EH6Wz6kR6Nq_oMVCzy_Bg'),
        icon: <ProfileOutlined />,
        formFields,
      },
      {
        id: 'administrative_document',
        title: t('-dE1F8eJXwMTGwUV_DssC'),
        description: t('7zPo9FqWqA9AzrBxDJKwe'),
        icon: <DeploymentUnitOutlined />,
        formFields,
      },
    ],
  }

  // 🚀 2. 初始化 activeCategoryId
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
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
      setActiveCategoryId(null)
      form.resetFields()
    }
  }, [id, form])

  // 🚀 2.1 监听 historyFormValues 变化并定位侧边栏
  useEffect(() => {
    if (historyFormValues?.category) {
      setActiveCategoryId(historyFormValues.category)
      form.setFieldsValue(historyFormValues)
    }
  }, [historyFormValues, form])

  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      // 🚀 1. 发起真实请求，传入 url 解析出来的 id
      // 注意：如果你的 API 定义是接收单个字符串，请改成 getDocumentDetail(documentId)
      const res = await getDocumentDetail(documentId)

      if (res?.successful && res?.data) {
        const historyData = res.data

        // 🚀 2. 还原左侧表单数据 (喂给 SmartSidebar 的 initialValues)
        setHistoryFormValues({
          category: historyData.senseId, // 还原侧边栏选中的场景 (如 civil_lawsuit)
          docType: historyData.typeId, // 还原下拉框选中的文档类型 (如 "3")
          partyA: historyData.partyA,
          partyB: historyData.partyB,
          content: historyData.content,
        })

        // 🚀 3. 还原右侧生成的文书内容
        setDocData({
          title: t('oyui4_Zm6W2vEYCn7Gw3T'), // 右侧展示的默认标题
          // ⚠️ 这里非常关键：依赖后端把当初存进去的 Markdown 原封不动地还给你！
          // 我先假设后端存的字段叫 result，如果不是，请根据后端实际字段修改。
          markdownContent: historyData.result || historyData.content || '',
        })
      } else {
        message.error(res?.message || t('7gEeqjRG-8JBLFMo_Ol_G')) // 获取失败的提示
        setDocData(null)
      }
    } catch (error) {
      console.error('获取文书历史记录异常:', error)
      message.error(t('7gEeqjRG-8JBLFMo_Ol_G'))
      setDocData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const res = await getDocument(values)

      if (res.code === 0 || res.code === 200) {
        setDocData(res.data)
        const sessionId = crypto.randomUUID()

        try {
          saveDocument({
            senseId: values.category || values.categoryId,
            typeId: values.docType,
            partyA: values.partyA,
            partyB: values.partyB,
            content: values.content,
            result: res.data.markdownContent,
            id: sessionId,
          })

          if (!id) {
            // 打上防抖标记，告诉 useEffect 不要去发请求拿数据了
            isJustGenerated.current = true
            // 使用 replace 替换当前 URL，这样用户点返回键时不会退回到空白表单
            navigate(`/doc/${sessionId}`, { replace: true })
          }
        } catch (saveError) {
          console.error('❌ 保存历史记录失败:', saveError)
        }

        message.success(t('CBy4zalzaA5oMw39uUxlw'))
      } else {
        message.error((res as any).message || t('VOKXsXqVnXQyt4Fs-AV-d'))
      }
    } catch (error) {
      console.error('文书生成请求异常:', error)
      message.error(t('w78_GpuwYhHX8r7ssNAwH'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success(t('pK7S2o5NXlBVx9ouR0faR')))
      .catch(() => message.error(t('w8mZWy1TYZfrI-B-fKlnW')))
  }

  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || t('mMn_ySGuShQh_PuWdR-LB'),
    onAfterPrint: () => message.success(t('iOG-eFwD9sUZjVmAn0-1G')),
  })

  return (
    <div className="flex h-full bg-gray-50">
      <PortalSidebar>
        <div className="w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative">
          {/* 吸顶总标题 */}
          <div className="sticky top-0 bg-white z-10 pb-4 mb-2 border-b border-gray-50">
            <h2 className="text-xl font-bold text-gray-800 px-1">{t('oyui4_Zm6W2vEYCn7Gw3T')}</h2>
          </div>

          {/* 场景 A：显示分类列表 */}
          {!activeCategoryId && (
            <div className="flex flex-col gap-4 pb-6">
              {loading ? (
                <SidebarSkeleton count={6} />
              ) : (
                docSchema.categories.map((cat: any) => (
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

          {/* 场景 B：显示具体表单项 */}
          {activeCategoryId && (
            <div className="flex flex-col flex-1 animate-fade-in">
              {/* 返回按钮 */}
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
                    {docSchema.categories.find((c: any) => c.id === activeCategoryId)?.icon}
                  </div>
                  <span className="font-bold text-gray-800 text-[15px]">
                    {docSchema.categories.find((c: any) => c.id === activeCategoryId)?.title}
                  </span>
                </div>
                <div className="text-[13px] text-gray-400 group-hover:text-primary transition-colors flex items-center gap-0.5">
                  {t('2OXNVjX7By70r2VKRpvS_')} <RightOutlined className="text-[10px]" />
                </div>
              </div>

              {/* 显式的 Antd Form，直接编写所有 Item */}
              <Form
                form={form}
                layout="vertical"
                onFinish={(values) => handleSubmit({ ...values, category: activeCategoryId })}
                disabled={loading}
                className="flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5"
              >
                <div className="flex-1">
                  {/* 文档类型 */}
                  <Form.Item name="docType" label={t('O3lW7GA0P-29WSOC79z4s')} className="mb-5">
                    <Select
                      size="large"
                      placeholder={t('IeuYDSfa4a16iCUpkCX4n')}
                      options={[
                        { label: t('CLz9ayEhi1_W7diFk9Dci'), value: '0' },
                        { label: t('UkrqIKSlFb-yYHCNPeoKC'), value: '1' },
                        { label: t('3tDSz4-nfMFQDmLdK_1I0'), value: '2' },
                        { label: t('dvji6mpyXI-zm3GFxZ3wJ'), value: '3' },
                        { label: t('Gbfu7J2vR3GcTsqb9Eq8A'), value: '4' },
                        { label: t('9ExzHanpbBUmWRpvUu4-j'), value: '5' },
                        { label: t('YJZLOi3212XFt5zAOJUvx'), value: '8' },
                        { label: t('GOAkpRo2e5RLaffi1zO1I'), value: '9' },
                      ]}
                    />
                  </Form.Item>

                  {/* 核心需求内容 */}
                  <Form.Item
                    name="content"
                    label={t('2PA2wuQkr2YQ_r2W-Mp8S')}
                    className="mb-5"
                    extra={
                      <span className="text-[12px] text-gray-400 whitespace-pre-line">
                        {t('FLOQLls0LWj91JvI_65tn')}
                      </span>
                    }
                  >
                    <TextArea
                      placeholder={t('DocPage_Content_Placeholder')}
                      showCount
                      maxLength={1000}
                      autoSize={{ minRows: 5, maxRows: 18 }}
                      className="rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                    />
                  </Form.Item>

                  {/* 甲方 */}
                  <Form.Item
                    name="partyA"
                    label={t('3Ciew_RfVQBCLYEuoubMA')}
                    className="mb-5"
                    extra={
                      <span className="text-[12px] text-gray-400 whitespace-pre-line">
                        {t('9QScDxuO43b-aylXttgio')}
                      </span>
                    }
                  >
                    <TextArea
                      placeholder={t('DocPage_PartyA_Placeholder')}
                      maxLength={100}
                      autoSize={{ minRows: 3, maxRows: 10 }}
                      className="rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white"
                    />
                  </Form.Item>

                  {/* 乙方 */}
                  <Form.Item
                    name="partyB"
                    label={t('CccrIZftBpy9Pp3TumH2U')}
                    className="mb-5"
                    extra={
                      <span className="text-[12px] text-gray-400 whitespace-pre-line">
                        {t('hIKILc_dVjVipLHKKSAIQ')}
                      </span>
                    }
                  >
                    <TextArea
                      placeholder={t('DocPage_PartyB_Placeholder')}
                      maxLength={100}
                      autoSize={{ minRows: 3, maxRows: 10 }}
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
                    {loading ? t('d5TNTW2YxRAQIzHiaFYiC') : t('D44eZM-z5xabv94vnapBw')}
                    {!loading && (
                      <span className="text-sm opacity-80">{t('GjNFCNGzRHYllP1yiRkkz')}</span>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </PortalSidebar>

      {/* 右侧预览区 */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center relative">
        {loading && (
          <div className="flex flex-col h-full items-center justify-center text-center animate-fade-in">
            {/* 🚀 2. 替换为 Antd 的 BulbOutlined，加上呼吸灯动画 */}
            <div className="mb-6">
              <BulbOutlined className="text-[80px] text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
              {t('DlyDIpTbRIY_ZZ2Ol8T4M')}{' '}
            </h2>
            <p className="text-[15px] text-gray-500">{t('NeYml9t4SpB1yGU3t8r87')}</p>
          </div>
        )}
        {!docData && !loading && (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t('VX9R6K8IPuw845fJu14ZQ')}{' '}
          </div>
        )}
        {docData && !loading && (
          <div className="w-full h-full flex flex-col gap-6 max-w-4xl">
            {/* 🌟 A4 纸张容器 */}
            <div
              id="legal-document-paper"
              ref={paperRef}
              className="flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in"
            >
              {/* 使用 Tailwind 排版类名模拟 Markdown 样式。
                注意：这里对 h1, h2, p, strong 进行了底层的样式覆盖，
                以确保它看起来像一份严肃的法律文件。
              */}
              <div
                className="
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-8
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                prose-p:leading-relaxed prose-p:mb-4 prose-p:indent-8
                prose-li:my-1
                prose-strong:text-black prose-strong:font-bold
              "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{docData.markdownContent}</ReactMarkdown>
              </div>
            </div>

            {/* 悬浮操作按钮 */}
            <div className="flex gap-4 m-auto">
              <Button type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
                {t('qxEoDfJTtO8dsJnMzfqyg')}{' '}
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

export default DocPage
