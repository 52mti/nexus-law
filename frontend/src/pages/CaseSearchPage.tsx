import {
  ShopOutlined,
  CopyOutlined,
  FundOutlined,
  PlaySquareOutlined,
  HeartOutlined,
  FormOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { PortalSidebar } from '@/components/layout/PortalSidebar'
import {
  SmartSidebar,
  type SidebarSchema,
  type SchemaField,
} from '@/components/SmartSidebar'

const formFields: SchemaField[] = [
  {
    name: 'docType',
    label: '关键词信息',
    type: 'textarea',
    maxLength: 50,
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
  title: '法律文书生成',
  submitText: '立即生成',
  submitHint: '(消耗2点积分)',
  hasSceneSwitch: true, // 开启场景切换逻辑
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
  const handleSubmit = (values: any) => console.log('案例检索:', values)

  return (
    <>
      <PortalSidebar>
        <SmartSidebar schema={schema} onSubmit={handleSubmit} />
      </PortalSidebar>
      <div className='p-8'>这是案例检索页面的主体内容...</div>
    </>
  )
}
export default CaseSearchPage
