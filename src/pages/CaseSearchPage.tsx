import {
  BlockOutlined,
  AimOutlined,
  PartitionOutlined,
  ClusterOutlined,
  FormOutlined,
  ApartmentOutlined,
  BuildOutlined,
  ProfileOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import { SmartSidebar, type SidebarSchema } from '@/components/SmartSidebar'

const docCategories = [
  {
    id: 'civil_lawsuit',
    title: '民事起诉状',
    description: '公民 / 法人因民事纠纷向法院提起诉讼',
    icon: <BlockOutlined />
  },
  {
    id: 'civil_defense',
    title: '民事答辩状',
    description: '被告针对原告起诉状作出回应和辩解',
    icon: <AimOutlined />
  },
  {
    id: 'property_evidence',
    title: '财产 / 证据类申请书',
    description: '向法院申请财产保全、强制执行等事项',
    icon: <PartitionOutlined />
  },
  {
    id: 'labor_contract',
    title: '劳动相关合同',
    description: '企业与员工之间确立劳动关系、约定权利义务的协议',
    icon: <ClusterOutlined />
  },
  {
    id: 'commercial_contract',
    title: '商事经营合同',
    description: '企业之间开展经营合作、交易的各类协议',
    icon: <FormOutlined />
  },
  {
    id: 'civil_life_contract',
    title: '民事生活合同',
    description: '个人之间因日常生活、交易产生的各类协议',
    icon: <ApartmentOutlined />
  },
  {
    id: 'marriage_family_agreement',
    title: '婚姻家庭协议',
    description: '婚姻家庭中关于财产、子女抚养等事项的约定协议',
    icon: <BuildOutlined />
  },
  {
    id: 'labor_arbitration',
    title: '劳动仲裁文书',
    description: '劳动争议中向仲裁委提交的申请、答辩等文书',
    icon: <ProfileOutlined />
  },
  {
    id: 'administrative_document',
    title: '行政类文书',
    description: '对行政行为不服，申请复议、提起诉讼的文书',
    icon: <DeploymentUnitOutlined />
  }
];

console.log(docCategories)

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

export const CaseSearchPage = () => {
  const handleSubmit = (values: any) => console.log('生成文书:', values)

  return (
    <>
      <PortalSidebar>
        <SmartSidebar schema={docSchema} onSubmit={handleSubmit} />
      </PortalSidebar>
      <div className='p-8'>这是文书生成页面的主体内容...</div>
    </>
  )
}
export default CaseSearchPage
