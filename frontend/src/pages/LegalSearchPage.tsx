import { BlockOutlined, ApartmentOutlined } from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'

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
      formFields: [{ name: 'plaintiff', label: '原告信息', type: 'textarea' }],
    },
    {
      id: 'civil_life_contract',
      title: '日常民事合同',
      description: '个人之间因日常生活、交易产生的各类协议',
      icon: <ApartmentOutlined />,
      formFields: [
        {
          name: 'docType',
          label: '文书类型',
          type: 'select',
          options: [{ label: '个人借款', value: '1' }],
        },
        {
          name: 'content',
          label: '文书内容描述',
          type: 'textarea',
          maxLength: 1000,
        },
        { name: 'partyA', label: '甲方信息', type: 'textarea', maxLength: 100 },
        { name: 'partyB', label: '乙方信息', type: 'textarea', maxLength: 100 },
      ],
    },
    // ... 其他分类
  ],
}

export const LegalSearchPage = () => {
  const handleSubmit = (values: any) => console.log('生成文书:', values)

  return (
    <>
      <PortalSidebar>
        <SmartSidebar schema={docSchema} onSubmit={handleSubmit} />
      </PortalSidebar>
      <div className='p-8'>这是条文检索页面的主体内容...</div>
    </>
  )
}
export default LegalSearchPage
