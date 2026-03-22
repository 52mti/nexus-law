import React, { useState, useRef, useEffect } from 'react'
import { message, Button } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReadOutlined, // 🚀 换成“阅读/梳理”意象的图标
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'
import { useParams } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// 侧边栏配置
const caseReviewSchema: SidebarSchema = {
  title: '案件快梳',
  submitText: '开始梳理', // 适配业务文案
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: false, // 纯表单页
  categories: [
    {
      id: 'case_summary',
      title: '',
      formFields: [
        {
          name: 'caseMaterials',
          label: '案件资料上传',
          type: 'upload-dragger',
          required: true,
          placeholder: '支持上传起诉状、证据清单、合同等资料，可打包PDF上传',
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
            caseMaterials: [], // 历史上传的文件回显列表
          },
          generatedResult: {
            title: '案件核心事实与争议焦点梳理',
            markdownContent:
              '# 案件核心事实与争议焦点梳理\n\n## 历史记录回显\n此份报告为历史生成的案件梳理记录。',
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

  // 4. 提交表单：模拟 AI 提取案件要素
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      // 模拟大模型阅读繁杂的案卷材料并生成结构化总结
      setTimeout(() => {
        setDocData({
          title: '案件核心事实与争议焦点梳理',
          markdownContent: `
# 案件核心事实与争议焦点梳理

## 一、 案件时间线事实
- **2023年05月10日**：原被告双方正式签订《建材采购合同》。
- **2023年08月15日**：被告单方面停止发货，并发送邮件称原材料价格上涨。
- **2023年09月01日**：原告委托律师发送《催告函》，要求3日内恢复供货。
- **2023年09月05日**：被告未予回复，原告因此停工，产生直接停工损失。

## 二、 核心争议焦点归纳
### 1. 被告停止发货的行为是否构成根本性违约？
被告主张“原材料价格上涨”属于情势变更，但根据现有材料，未见价格异常波动的官方证据，大概率将被法院认定为正常的商业风险。因此，被告停发货涉嫌根本违约。

### 2. 原告主张的“停工损失”是否具备充足证据支持？
原告虽然提出了停工损失，但目前上传的材料中**缺乏**具体的财务审计报告、工人工资流水等直接定损证据，存在因举证不能被驳回该项诉求的风险。

## 三、 关键证据链审查
| 证据名称 | 证明目的 | 证据效力初步评估 |
| :--- | :--- | :--- |
| **《建材采购合同》** | 证明双方买卖合同关系成立及违约责任约定。 | 原件，**效力高**。 |
| **往来邮件截图** | 证明被告单方拒绝发货的事实。 | 电子证据，建议补充**公证程序**。 |
| **《催告函》及快递单** | 证明原告已尽到催告义务，合同具备解除条件。 | 完整，**效力高**。 |

## 四、 AI 综合办案建议
本案法律关系明确，原告胜诉率较高。但在正式立案前，**强烈建议补充以下材料**：
1. 寻找第三方鉴定机构对停工损失进行明确的造价/损失评估。
2. 对被告发送拒不发货的往来邮件进行电子证据保全公证。

---
**梳理引擎**：汇动法律 AI 深度解析模型  
**生成日期**：2026年 03月 22日
          `.trim(),
        })
        message.success('案卷材料梳理完毕，已扣除 2 积分')
        setLoading(false)
      }, 3500) // 案卷通常比较长，模拟较长的解析时间
    } catch (error) {
      setLoading(false)
    }
  }

  // 5. 复制内容功能
  const handleCopy = () => {
    if (!paperRef.current) return
    const textToCopy = paperRef.current.innerText
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => message.success('梳理报告已复制到剪贴板'))
      .catch(() => message.error('复制失败，请手动选择复制'))
  }

  // 6. 导出 PDF 功能
  const handleDownloadPDF = useReactToPrint({
    contentRef: paperRef,
    documentTitle: docData?.title || '案件梳理报告',
    onAfterPrint: () => message.success('PDF 导出成功'),
  })

  return (
    <div className='flex h-full bg-gray-50'>
      {/* 侧边栏 */}
      <PortalSidebar>
        <SmartSidebar
          schema={caseReviewSchema}
          onSubmit={handleSubmit}
          isLoading={loading}
          initialValues={historyFormValues}
        />
      </PortalSidebar>

      {/* 右侧主体区 */}
      <div className='flex-1 overflow-y-auto p-8 flex flex-col items-center relative'>
        
        {/* 状态一：AI 梳理加载中 */}
        {loading && (
          <div className='flex flex-col h-full items-center justify-center text-center animate-fade-in'>
            <div className='mb-6'>
              {/* 🚀 换成了书本阅读的图标，更贴合“看案卷”的动作 */}
              <ReadOutlined className='text-[80px] text-[#666cff] animate-pulse' />
            </div>
            <h2 className='text-2xl font-bold text-gray-800 tracking-wide mb-2'>
              AI 案卷梳理中
            </h2>
            <p className='text-[15px] text-gray-500'>正在提取时间线与核心证据，请稍后</p>
          </div>
        )}

        {/* 状态二：空状态 */}
        {!docData && !loading && (
          <div className='flex h-full items-center justify-center text-gray-400'>
            请在左侧上传繁杂的案件资料，让 AI 为您一键生成清晰的案件脉络
          </div>
        )}

        {/* 状态三：梳理结果呈现 */}
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
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-gray-700
                prose-p:leading-relaxed prose-p:mb-4
                prose-li:my-1
                prose-table:w-full prose-table:my-6 prose-th:bg-gray-50 prose-th:p-3 prose-td:p-3 prose-td:border-b
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