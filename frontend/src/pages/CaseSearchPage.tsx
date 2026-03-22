import React, { useState, useRef, useEffect } from 'react'
import { message, Button } from 'antd'
import {
  ShopOutlined,
  CopyOutlined,
  FundOutlined,
  PlaySquareOutlined,
  HeartOutlined,
  FormOutlined,
  MessageOutlined,
  DownloadOutlined,
  SearchOutlined, // 🚀 引入搜索专属图标
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import {
  SmartSidebar,
  type SidebarSchema,
  type SchemaField,
} from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const formFields: SchemaField[] = [
  {
    name: 'docType',
    label: '关键词信息',
    type: 'textarea',
    maxLength: 50,
    minRows: 3,
    maxRows: 5,
    placeholder: '请输入案由、争议焦点或关键法条',
  },
  {
    name: 'content',
    label: '判决时间',
    type: 'date-range',
  },
  {
    name: 'partyA',
    label: '涉案金额',
    type: 'grid-radio',
    options: [
      { label: '1 万比尔以下', value: '1' },
      { label: '1-5 万比尔', value: '2' },
      { label: '5-20 万比尔', value: '3' },
      { label: '20-100 万比尔', value: '4' },
      { label: '100万比尔以上', value: '5' },
      { label: '不限', value: '' },
    ],
  },
  {
    name: 'partyB',
    label: '判决法院等级',
    type: 'grid-radio',
    options: [
      { label: '联邦最高法院', value: '1' },
      { label: '地区高等法院', value: '2' },
      { label: '基层法院', value: '3' },
      { label: '专门法院', value: '4' },
      { label: '不限', value: '' },
    ],
  },
]

const schema: SidebarSchema = {
  title: '案例智能检索',
  submitText: '开始检索', // 🚀 贴合搜索场景
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: true,
  categories: [
    {
      id: 'civil_case',
      title: '民事案件',
      description: '含婚姻家庭、邻里纠纷、债务借贷、人身损害、财产权属等',
      icon: <ShopOutlined />,
      formFields,
    },
    {
      id: 'criminal_case',
      title: '刑事案件',
      description: '含盗窃、故意伤害、诈骗、交通肇事、职务犯罪',
      icon: <CopyOutlined />,
      formFields,
    },
    {
      id: 'labor_dispute',
      title: '劳动争议案件',
      description: '含劳动合同解除、工资拖欠、工伤赔偿、社保缴纳、解雇补偿等',
      icon: <FundOutlined />,
      formFields,
    },
    {
      id: 'commercial_case',
      title: '商业案件',
      description: '含合同违约、股权纠纷、商业欺诈、知识产权侵权、企业借贷等',
      icon: <PlaySquareOutlined />,
      formFields,
    },
    {
      id: 'administrative_case',
      title: '行政案件',
      description: '含行政许可、行政处罚、行政强制、政府信息公开等',
      icon: <HeartOutlined />,
      formFields,
    },
    {
      id: 'intellectual_property',
      title: '知识产权案件',
      description: '含商标侵权、专利纠纷、著作权保护、商业秘密侵权等',
      icon: <FormOutlined />,
      formFields,
    },
    {
      id: 'family_case',
      title: '家事案件',
      description: '含离婚、子女抚养、财产分割、遗产继承、收养关系等',
      icon: <MessageOutlined />,
      formFields,
    },
  ],
}

export const CaseSearchPage = () => {
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

  // 模拟从后端拉取历史检索记录
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            docType: '民间借贷、举证责任倒置',
            partyA: '3', // 5-20万
            partyB: '2', // 地区高等法院
          },
          generatedResult: {
            title: '案例智能检索报告',
            markdownContent:
              '# 案例智能检索报告\n\n## 历史检索记录\n这份报告为您之前保存的案例检索结果。',
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

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 提取表单数据进行展示映射
      const amountMap: Record<string, string> = { '1': '1万比尔以下', '2': '1-5万比尔', '3': '5-20万比尔', '4': '20-100万比尔', '5': '100万比尔以上', '': '不限' }
      const courtMap: Record<string, string> = { '1': '联邦最高法院', '2': '地区高等法院', '3': '基层法院', '4': '专门法院', '': '不限' }
      
      const keyword = values.docType || '未提供明确关键词'
      const amountStr = amountMap[values.partyA] || '不限'
      const courtStr = courtMap[values.partyB] || '不限'

      // 模拟 AI 检索海量判例库的过程
      setTimeout(() => {
        setDocData({
          title: '案例智能检索报告',
          markdownContent: `
# 案例智能检索报告

## 一、 检索条件回顾
- **核心关键词**：${keyword}
- **涉案金额区间**：${amountStr}
- **判决法院等级**：${courtStr}

---

## 二、 智能匹配判例汇编

### 案例一：张某诉李某民间借贷纠纷案
**【案号】** (2024) 某某高法民终 112 号
**【判决法院】** 地区高等法院
**【裁判要旨】**
在借贷关系中，若仅有转账凭证而无借条，且被告主张为其他债务往来的，原告应承担进一步举证责任。本案中，原告提供的微信聊天记录足以形成完整的证据链，法院予以支持。
**【AI 相似度】** ⭐️⭐️⭐️⭐️⭐️ (98%)

### 案例二：某贸易公司诉赵某不当得利案
**【案号】** (2023) 某某高法民终 85 号
**【判决法院】** 地区高等法院
**【裁判要旨】**
虽无书面合同，但双方存在长期交易习惯，原告错误汇款至被告账户后，被告拒不返还。法院认为，被告无合法根据取得利益，致使原告受损，构成不当得利。
**【AI 相似度】** ⭐️⭐️⭐️⭐️ (85%)

---

## 三、 AI 检索总结与趋势分析
根据您提供的筛选条件，系统从判例库中共为您精准匹配到 **15 篇** 生效判决。
**司法倾向分析**：多数法院在处理涉及 \`${keyword}\` 的同类纠纷时，极其看重**书面证据的连贯性**与**资金流水的对应关系**。建议您在后续办案中，优先固定上述两类证据。

> **检索平台**：汇动法律 AI 案例大数据系统  
> **报告生成时间**：2026年 03月 22日
          `.trim(),
        })
        message.success('案例检索完毕，已扣除 2 积分')
        setLoading(false)
      }, 3000)
    } catch (error) {
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
    documentTitle: docData?.title || '案例检索报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      {/* 左侧智能表单 */}
      <PortalSidebar>
        <SmartSidebar
          schema={schema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧主内容区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {/* 状态一：AI 检索中 */}
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              {/* 🚀 专属的搜索放大镜图标 */}
              <SearchOutlined className='text-[80px] text-[#666cff] animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 全库检索中
            </h2>
            <p className='text-[15px] text-gray-500'>正在为您匹配最相关的历史判例，请稍后</p>
          </div>
        )}

        {/* 状态二：空状态 */}
        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧选择案件类型并输入检索条件，点击“开始检索”
          </div>
        )}

        {/* 状态三：检索结果展示 */}
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
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:text-[#666cff]
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-800
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-blockquote:border-l-4 prose-blockquote:border-[#666cff] prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:mt-8
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

export default CaseSearchPage