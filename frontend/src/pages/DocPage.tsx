import { useState, useRef } from 'react'
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
import request from '@/utils/request'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm' // 支持表格、中划线等

const formFields: SchemaField[] = [
  {
    name: 'docType',
    label: '文书类型',
    type: 'select',
    options: [
      { label: '个人借款', value: '0' },
      { label: '房屋租凭合同', value: '1' },
      { label: '房屋买卖合同', value: '2' },
      { label: '赠与合同', value: '3' },
      { label: '借款合同', value: '4' },
      { label: '委托合同', value: '5' },
      { label: '借款合同', value: '6' },
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
    minRows: 10, // 🚀 这个框比较重要，默认展示 6 行高
    maxRows: 18, // 最多展开到 12 行
  },
  {
    name: 'partyA',
    label: '甲方信息',
    type: 'textarea',
    maxLength: 100,
  },
  {
    name: 'partyB',
    label: '乙方信息',
    type: 'textarea',
    maxLength: 100,
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
  const [loading, setLoading] = useState(false)
  // 🌟 只存标题和 Markdown 正文
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      // 真实请求示例：
      // const res = await request.post('/document/generate', values);
      // if (res.code === 0) { setDocData(res.data); }

      // 模拟后端返回的 Markdown 数据
      setTimeout(() => {
        setDocData({
          title: '民事起诉状',
          markdownContent: `
# 民事起诉状

## 起诉人信息
**甲方**：${values.partyA || '张三，男，1985年生，住址：北京市朝阳区某街道某号'}

## 被起诉人信息
**乙方**：${values.partyB || '李四，男，1982年生，住址：上海市浦东新区某街道某号'}

## 诉讼请求
1. 请求法院判令被告立即偿还借款本金人民币10万元（¥100,000.00）。
2. 请求法院判令被告支付逾期利息。
3. 本案诉讼费用由被告承担。

## 事实与理由
${values.content || '2024年3月20日，被告因资金周转需要，向原告借款...'}

综上所述，被告的行为已严重侵害原告合法权益，为维护原告合法权益，特向贵院提起诉讼，恳请依法判决。

此致  
**XXX 人民法院**


**起诉人**：___________________ (签字/盖章)  
**日 期**：2026年 03月 22日
          `.trim(),
        })
        message.success('文书生成成功，已扣除 2 积分')
        setLoading(false)
      }, 2000)
    } catch (error) {
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
        />
      </PortalSidebar>

      {/* 右侧预览区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            {/* 🚀 2. 替换为 Antd 的 BulbOutlined，加上呼吸灯动画 */}
            <div className='mb-6'>
              <BulbOutlined className='text-[80px] text-[#666cff] animate-pulse' />
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
