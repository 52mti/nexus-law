import { useState, useRef, useEffect } from 'react'
import { message, Button } from 'antd'
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
import {
  SmartSidebar,
  type SidebarSchema,
  type SchemaField,
} from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { getDocument } from '@/api/document'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm' // 支持表格、中划线等

const formFields: SchemaField[] = [
  {
    name: 'docType',
    label: '文书类型',
    type: 'select',
    placeholder: '请选择您需要生成的文书类型', // 🚀 新增
    options: [
      { label: '个人借款', value: '0' },
      { label: '房屋租凭合同', value: '1' },
      { label: '房屋买卖合同', value: '2' },
      { label: '赠与合同', value: '3' },
      { label: '借款合同', value: '4' },
      { label: '委托合同', value: '5' },
      { label: '借款合同', value: '6' }, // 注意：这里有个重复的“借款合同”和“委托合同”，可以顺手清理一下
      { label: '委托合同', value: '7' },
      { label: '承揽合同', value: '8' },
      { label: '其他', value: '9' },
    ],
  },
  {
    name: 'content',
    label: '文书内容描述',
    type: 'textarea',
    maxLength: 1000,
    minRows: 10,
    maxRows: 18,
    // 🚀 新增：引导用户输入时间、地点、事件经过和诉求
    placeholder:
      '请详细描述事件的背景、经过及核心诉求。\n\n例如：\n2023年5月10日，被告因资金周转困难向原告借款10万元，约定月息1%，于同年12月底前还清。现期限已届满，被告以各种理由推脱拒不还款。现请求法院判令被告立即偿还本金及逾期利息...',
  },
  {
    name: 'partyA',
    label: '甲方信息',
    type: 'textarea',
    maxLength: 100,
    // 🚀 新增：提示标准的身份要素
    placeholder:
      '请输入甲方（原告/出租方/出借方等）基本信息：\n姓名/公司名称、性别、出生年月、身份证号/统一社会信用代码、联系地址、电话等。',
  },
  {
    name: 'partyB',
    label: '乙方信息',
    type: 'textarea',
    maxLength: 100,
    // 🚀 新增：提示标准的身份要素
    placeholder:
      '请输入乙方（被告/承租方/借款方等）基本信息：\n姓名/公司名称、性别、出生年月、身份证号/统一社会信用代码、联系地址、电话等。',
  },
]

const docSchema: SidebarSchema = {
  title: '法律文书生成',
  submitText: '立即生成',
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: true, // 开启场景切换逻辑
  categories: [
    {
      id: 'civil_lawsuit',
      title: '民事起诉状',
      description: '公民 / 法人因民事纠纷向法院提起诉讼',
      icon: <BlockOutlined />,
      formFields,
    },
    {
      id: 'civil_defense',
      title: '民事答辩状',
      description: '被告针对原告起诉状作出回应和辩解',
      icon: <AimOutlined />,
      formFields,
    },
    {
      id: 'property_evidence',
      title: '财产 / 证据类申请书',
      description: '向法院申请财产保全、强制执行等事项',
      icon: <PartitionOutlined />,
      formFields,
    },
    {
      id: 'labor_contract',
      title: '劳动相关合同',
      description: '企业与员工之间确立劳动关系、约定权利义务的协议',
      icon: <ClusterOutlined />,
      formFields,
    },
    {
      id: 'commercial_contract',
      title: '商事经营合同',
      description: '企业之间开展经营合作、交易的各类协议',
      icon: <FormOutlined />,
      formFields,
    },
    {
      id: 'civil_life_contract',
      title: '民事生活合同',
      description: '个人之间因日常生活、交易产生的各类协议',
      icon: <ApartmentOutlined />,
      formFields,
    },
    {
      id: 'marriage_family_agreement',
      title: '婚姻家庭协议',
      description: '婚姻家庭中关于财产、子女抚养等事项的约定协议',
      icon: <BuildOutlined />,
      formFields,
    },
    {
      id: 'labor_arbitration',
      title: '劳动仲裁文书',
      description: '劳动争议中向仲裁委提交的申请、答辩等文书',
      icon: <ProfileOutlined />,
      formFields,
    },
    {
      id: 'administrative_document',
      title: '行政类文书',
      description: '对行政行为不服，申请复议、提起诉讼的文书',
      icon: <DeploymentUnitOutlined />,
      formFields,
    },
  ],
}

export const DocPage = () => {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  // 🌟 只存标题和 Markdown 正文
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  // 🚀 4. 核心逻辑：当页面加载，或者 URL 的 id 发生变化时触发
  useEffect(() => {
    if (id) {
      // 场景 A：带有 ID，说明是从“历史记录”点进来的
      fetchHistoryData(id)
    } else {
      // 场景 B：没有 ID，说明是点击“新建文书”进来的，清空所有状态
      setDocData(null)
      setHistoryFormValues(null)
    }
  }, [id])

  // 模拟从后端拉取历史数据的函数
  const fetchHistoryData = async (documentId: string) => {
    console.log(documentId)
    setLoading(true)
    try {
      // 真实请求：const res = await request.get(`/document/${documentId}`)

      // 模拟接口返回的数据 (包含了当时填写的表单，以及最终生成的 Markdown)
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: 'civil_lawsuit',
            partyA: '王五（历史记录读取的）',
            partyB: '赵六（历史记录读取的）',
            content: '这是一条从历史记录里恢复的测试数据...',
          },
          generatedResult: {
            title: '民事起诉状',
            markdownContent:
              '# 历史民事起诉状\n\n## 起诉人信息\n**甲方**：王五...\n\n（这里是从数据库原样读取的已生成内容）',
          },
        }

        // 把数据分别喂给左侧表单和右侧 A4 纸
        setHistoryFormValues(mockResponse.formValues)
        setDocData(mockResponse.generatedResult)
        setLoading(false)
      }, 800) // 模拟一个极快的历史记录拉取时间
    } catch (error) {
      message.error('获取历史记录失败')
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      const res = await getDocument(values)
      if (res.code === 0) {
        setDocData(res.data)
      }

      message.success('文书生成成功，已扣除 2 积分')
      setLoading(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 复制纯文本 (提取渲染后的文本，而不是带有 # 的源码，更适合用户粘贴到 Word)
  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('文书内容已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  // 🌟 终极解决方案：使用 react-to-print
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef, // 只打印这个 ref 包裹的内容
    documentTitle: docData?.title || '法律文书', // 导出的默认文件名
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      <PortalSidebar>
        <SmartSidebar
          schema={docSchema}
          onSubmit={handleSubmit}
          isLoading={loading} // 如果你的组件支持 loading 属性
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧预览区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            {/* 🚀 2. 替换为 Antd 的 BulbOutlined，加上呼吸灯动画 */}
            <div className='mb-6'>
              <BulbOutlined className='text-[80px] text-primary animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI生成中
            </h2>
            <p className='text-[15px] text-gray-500'>请稍后,正在生成中</p>
          </div>
        )}
        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧填写信息并点击“立即生成”以获取法律文书
          </div>
        )}
        {docData && !loading && (
          <div className='w-full h-full flex flex-col gap-6 max-w-4xl'>
            {/* 🌟 A4 纸张容器 */}
            <div
              id='legal-document-paper'
              ref={paperRef}
              className='flex-1 bg-white shadow-lg rounded-sm p-12 text-gray-800 overflow-y-scroll custom-scrollbar animate-fade-in'
            >
              {/* 使用 Tailwind 排版类名模拟 Markdown 样式。
                注意：这里对 h1, h2, p, strong 进行了底层的样式覆盖，
                以确保它看起来像一份严肃的法律文件。
              */}
              <div
                className='
                prose prose-slate max-w-none 
                prose-h1:text-3xl prose-h1:text-center prose-h1:tracking-widest prose-h1:mb-8
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
                prose-p:leading-relaxed prose-p:mb-4 prose-p:indent-8
                prose-li:my-1
                prose-strong:text-black prose-strong:font-bold
              '
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            {/* 悬浮操作按钮 */}
            <div className='flex gap-4 m-auto'>
              <Button
                type='primary'
                icon={<CopyOutlined />}
                onClick={handleCopy}
              >
                复制文书
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

export default DocPage
