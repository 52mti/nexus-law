import React, { useState, useRef, useEffect } from 'react'
import { message, Button } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 侧边栏配置保持不变
const contractReviewSchema: SidebarSchema = {
  title: '合规审查',
  submitText: '开始审查',
  hasSceneSwitch: false, // 纯表单页，没列表
  categories: [
    {
      id: 'contract_review',
      title: '',
      formFields: [
        {
          name: 'contractFile',
          label: '合同/协议资料上传',
          type: 'upload-dragger',
          required: true,
          placeholder: '支持上传pdf/word格式文件，单个文件不能超过50M',
        },
        {
          name: 'reviewAngle',
          label: '审查角度',
          type: 'color-radio',
          required: true,
          options: [
            { label: '甲方', value: 'partyA' },
            { label: '乙方', value: 'partyB' },
            { label: '中立', value: 'neutral' },
          ],
        },
      ],
    },
  ],
}

export const CaseReviewPage = () => {
  // 1. 路由参数与状态管理
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(Boolean(id))
  const [docData, setDocData] = useState<{
    title: string
    markdownContent: string
  } | null>(null)
  const [historyFormValues, setHistoryFormValues] = useState<any>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  // 2. 监听 URL ID 变化，拉取历史记录
  useEffect(() => {
    if (id) {
      fetchHistoryData(id)
    } else {
      setDocData(null)
      setHistoryFormValues(null)
    }
  }, [id])

  // 3. 模拟拉取历史记录
  const fetchHistoryData = async (documentId: string) => {
    setLoading(true)
    try {
      setTimeout(() => {
        const mockResponse = {
          formValues: {
            reviewAngle: 'partyA',
          },
          generatedResult: {
            title: '法律合规审查报告',
            markdownContent:
              '# 法律合规审查报告\n\n## 审查概述\n本次审查为历史记录拉取展示，基于**甲方**立场对所提供文件进行合规性分析。\n\n## 核心风险提示\n1. 违约责任条款缺失。\n2. 管辖法院约定不明。',
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

  // 4. 提交表单：模拟 AI 生成审查报告
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 提取审查角度文本用于展示
      const angleMap: Record<string, string> = {
        partyA: '甲方（提供产品/服务方）',
        partyB: '乙方（采购/受让方）',
        neutral: '中立',
      }
      const currentAngle = angleMap[values.reviewAngle] || '中立'

      setTimeout(() => {
        setDocData({
          title: '法律合规审查报告',
          markdownContent: `
# 法律合规审查报告

## 一、 审查基本信息
- **审查视角**：基于**${currentAngle}**立场。
- **文件状态**：已上传并解析完成。
- **审查依据**：《中华人民共和国民法典》及相关商事实体法律规范。

## 二、 核心风险与修改建议

### 1. 违约责任条款不对等 ⚠️
**【存在问题】** 当前协议中针对${currentAngle}的违约责任惩罚过重，而对方的违约成本极低，存在显失公平的法律风险。
**【修改建议】** 建议在第 X 条加入对等约束条款，或者设置违约金上限为合同总金额的 20%。

### 2. 管辖权与争议解决 ⚠️
**【存在问题】** 原合同约定的争议解决机构为对方所在地法院，一旦发生诉讼，将极大增加己方的维权成本。
**【修改建议】** 强烈建议修改为：“因本合同引起的争议，双方应友好协商解决；协商不成的，应向**己方所在地**有管辖权的人民法院提起诉讼。”

## 三、 审查结论
总体来看，该合同存在 **2处高风险点** 和 **3处一般性瑕疵**。建议业务部门在与对方盖章确立合作前，严格按照上述建议进行磋商修改。

---
**审查出具系统**：汇动法律 AI  
**生成日期**：2026年 03月 22日
          `.trim(),
        })
        message.success('合规审查完毕，已扣除 2 积分')
        setLoading(false)
      }, 2500) // 模拟大模型阅读文件并生成报告的耗时
    } catch (error) {
      setLoading(false)
    }
  }

  // 5. 复制文书功能
  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('审查报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  // 6. 导出 PDF 功能
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '合规审查报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      {/* 侧边栏 */}
      <PortalSidebar>
        <SmartSidebar
          schema={contractReviewSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧主体区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {/* 状态一：AI 审查加载中 */}
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              <BulbOutlined className='text-[80px] text-[#666cff] animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 审查中
            </h2>
            <p className='text-[15px] text-gray-500'>正在深度研读合同条款，请稍后</p>
          </div>
        )}

        {/* 状态二：空状态 */}
        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧上传合同文件并选择审查角度，点击“开始审查”
          </div>
        )}

        {/* 状态三：审查结果呈现 */}
        {docData && !loading && (
          <div className='w-full h-full flex flex-col gap-6 max-w-4xl'>
            {/* A4 纸张容器 */}
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
                prose-h3:text-lg prose-h3:mt-6
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-strong:text-black prose-strong:font-bold
              '
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {docData.markdownContent}
                </ReactMarkdown>
              </div>
            </div>

            {/* 操作按钮 */}
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