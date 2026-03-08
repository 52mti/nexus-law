import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'

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
          // 原型图中写的是 prd，估计是设计打错字了，我在这里帮你修成了 pdf
          placeholder: '支持上传pdf/word格式文件，单个文件不能超过50M',
        },
      ],
    },
  ],
}

export const CompliancePage = () => {
  const handleSubmit = (values: any) => console.log('生成文书:', values)

  return (
    <>
      <PortalSidebar>
        <SmartSidebar schema={contractReviewSchema} onSubmit={handleSubmit} />
      </PortalSidebar>
      <div className='p-8'>这是文书生成页面的主体内容...</div>
    </>
  )
}
export default CompliancePage
