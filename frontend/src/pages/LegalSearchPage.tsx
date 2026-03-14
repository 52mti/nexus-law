import { BlockOutlined, ApartmentOutlined } from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'

const docSchema: SidebarSchema = {
  title: '法律文书生成',
  submitText: '立即生成',
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: false, // 开启场景切换逻辑
  categories: [
    {
      id: 'civil_life_contract',
      title: '',
      description: '个人之间因日常生活、交易产生的各类协议',
      icon: <ApartmentOutlined />,
      formFields: [
        {
          name: 'docType',
          label: '条文类型',
          type: 'select',
          options: [
            { label: '劳动法', value: '1' },
            { label: '刑法', value: '2' },
            { label: '公司法', value: '3' },
            { label: '其他', value: '4' },
          ],
        },
        { name: 'partyA', label: '条款编号', type: 'input' },
        { name: 'partyB', label: '模糊搜索', type: 'textarea', maxLength: 300 },
      ],
    },
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
