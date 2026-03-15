import React, { useState, useEffect } from 'react'
import { Form, Input, Select, Button, DatePicker, Upload } from 'antd'
import { RightOutlined, CloudUploadOutlined } from '@ant-design/icons'

const { TextArea } = Input
const { RangePicker } = DatePicker
const { Dragger } = Upload

// ==========================================
// 1. 类型定义 (Type Definitions)
// ==========================================
export type FormFieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'date-range'
  | 'grid-radio'
  | 'upload-dragger'
  | 'color-radio'

export interface SchemaField {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  maxLength?: number
  options?: { label: string; value: string | number }[]
}

export interface CategorySchema {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  formFields: SchemaField[]
}

export interface SidebarSchema {
  title: string // 侧边栏总标题，如 "法律文书生成"
  submitText: string // 提交按钮文字，如 "立即生成"
  submitHint?: string // 提交按钮副文本，如 "(消耗2点积分)"
  hasSceneSwitch: boolean // 🚀 核心控制开关：是否需要场景切换功能
  categories: CategorySchema[]
}

// ==========================================
// 2. 自定义控件：网格单选 (GridRadio)
// ==========================================
const GridRadio: React.FC<{
  value?: any
  onChange?: (val: any) => void
  options: any[]
}> = ({ value, onChange, options }) => (
  <div className='grid grid-cols-3 gap-2'>
    {options.map((opt) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          onClick={() => onChange?.(opt.value)}
          className={`flex items-center justify-center py-2 px-1 text-[13px] rounded-md cursor-pointer transition-all border ${
            isSelected
              ? 'bg-blue-50/50 border-[#666cff] text-[#666cff]'
              : 'bg-[#f7f8fb] border-transparent text-gray-600 hover:bg-[#f0f2f7]'
          }`}
        >
          {opt.label}
        </div>
      )
    })}
  </div>
)

// ==========================================
// 🚀 自定义控件 2：色块单选 (高度还原审查角度)
// ==========================================
const ColorRadio: React.FC<{
  value?: any
  onChange?: (val: any) => void
  options: any[]
}> = ({ value, onChange, options }) => (
  <div className='flex items-center gap-6'>
    {options.map((opt) => {
      const isSelected = value === opt.value
      return (
        <div
          key={opt.value}
          onClick={() => onChange?.(opt.value)}
          className={`flex items-center gap-2.5 cursor-pointer transition-all ${
            isSelected ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {/* 颜色方块 */}
          <div
            className={`w-5 h-5 rounded-sm transition-colors ${
              isSelected ? 'bg-[blue]' : 'bg-gray-500' // 原型图选中是高亮纯蓝，未选是深灰
            }`}
          />
          <span className='text-[14px]'>{opt.label}</span>
        </div>
      )
    })}
  </div>
)
// Antd Upload 需要用来提取文件列表的工具函数
const normFile = (e: any) => {
  if (Array.isArray(e)) return e
  return e?.fileList
}

// ==========================================
// 3. 智能侧边栏主组件 (SmartSidebar)
// ==========================================
export const SmartSidebar: React.FC<{
  schema: SidebarSchema
  onSubmit: (values: any) => void
}> = ({ schema, onSubmit }) => {
  const [form] = Form.useForm()
  // 如果不需要场景切换，默认选中第一个场景；否则初始为 null（显示列表）
  const [activeId, setActiveId] = useState<string | null>(
    schema.hasSceneSwitch ? null : schema.categories[0]?.id,
  )

  useEffect(() => {
    if (activeId) {
      form.resetFields()
    }
  }, [activeId, form])

  const activeCategory = schema.categories.find((c) => c.id === activeId)
  const inputStyles =
    'rounded-lg bg-[#f7f8fb] border-transparent focus:bg-white'

  return (
    <div className='w-86 h-full bg-white p-5 flex flex-col overflow-y-auto custom-scrollbar animate-fade-in relative'>
      {/* 统一的吸顶总标题 */}
      <div className='sticky top-0 bg-white z-10 pb-4 mb-2'>
        <h2 className='text-xl font-bold text-gray-800 px-1'>{schema.title}</h2>
      </div>

      {/* 场景 A：显示列表 (需要场景切换 && 当前未选中) */}
      {schema.hasSceneSwitch && !activeId && (
        <div className='flex flex-col gap-4 pb-6'>
          {schema.categories.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className='flex items-center gap-4 p-4 h-20 rounded-xl bg-[#f7f8fb] hover:bg-[#f0f2f7] transition-all cursor-pointer group'
            >
              <div className='text-[#666cff] text-[25px] font-light shrink-0 mt-0.5 opacity-90 group-hover:opacity-100 transition-transform'>
                {item.icon}
              </div>
              <div className='flex flex-col'>
                <div className='text-[16px] font-bold text-gray-800 mb-1 tracking-wide'>
                  {item.title}
                </div>
                <div className='text-[12px] text-gray-500 leading-tight line-clamp-2'>
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 场景 B：显示表单 (不需要场景切换 || 当前已选中) */}
      {activeCategory && (
        <div className='flex flex-col flex-1 animate-fade-in'>
          {/* 如果需要场景切换，则渲染顶部带有原型的“返回”卡片 */}
          {schema.hasSceneSwitch && (
            <div
              onClick={() => setActiveId(null)}
              className='flex items-center justify-between p-4 rounded-xl bg-[#f7f8fb] hover:bg-[#f0f2f7] transition-all cursor-pointer mb-6 group'
            >
              <div className='flex items-center gap-3'>
                <div className='text-[#666cff] text-[20px] flex items-center'>
                  {activeCategory.icon}
                </div>
                <span className='font-bold text-gray-800 text-[15px]'>
                  {activeCategory.title}
                </span>
              </div>
              <div className='text-[13px] text-gray-400 group-hover:text-[#666cff] transition-colors flex items-center gap-0.5'>
                切换场景 <RightOutlined className='text-[10px]' />
              </div>
            </div>
          )}

          {/* 动态表单渲染区 */}
          <Form
            form={form}
            layout='vertical'
            onFinish={onSubmit}
            className='flex-1 flex flex-col [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item-label>label]:text-[15px] [&_.ant-form-item-label]:pb-1.5'
          >
            <div className='flex-1'>
              {activeCategory.formFields.map((field) => {
                const rules = [
                  { required: field.required, message: `请填写${field.label}` },
                ]
                switch (field.type) {
                  case 'input':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-5'
                      >
                        <Input
                          placeholder={field.placeholder}
                          size='large'
                          className={inputStyles}
                        />
                      </Form.Item>
                    )
                  case 'textarea':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-5'
                      >
                        <TextArea
                          placeholder={field.placeholder}
                          showCount
                          maxLength={field.maxLength}
                          autoSize={{ minRows: 4, maxRows: 8 }}
                          className={inputStyles}
                        />
                      </Form.Item>
                    )
                  case 'select':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-5'
                      >
                        <Select
                          placeholder={field.placeholder}
                          size='large'
                          className='w-full'
                          options={field.options}
                        ></Select>
                      </Form.Item>
                    )
                  case 'date-range':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-5'
                      >
                        <RangePicker
                          size='large'
                          className={`w-full ${inputStyles} [&_.ant-picker-active-bar]:hidden w-full`}
                          placeholder={['开始时间', '结束时间']}
                        />
                      </Form.Item>
                    )
                  case 'grid-radio':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-6'
                      >
                        <GridRadio options={field.options || []} />
                      </Form.Item>
                    )
                  // 🚀 新增零件 1：拖拽上传
                  case 'upload-dragger':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        valuePropName='fileList'
                        getValueFromEvent={normFile}
                        className='mb-6'
                      >
                        {/* 覆盖 Antd 原生样式以匹配原型图 */}
                        <Dragger
                          name='file'
                          multiple={false}
                          beforeUpload={() => false}
                          className='bg-[#f9fafc] border-gray-200 hover:border-[#666cff] transition-all'
                        >
                          <p className='ant-upload-drag-icon pt-2'>
                            <CloudUploadOutlined className='text-gray-400 text-6xl' />
                          </p>
                          <p className='ant-upload-text text-[14px] text-gray-600 mt-2'>
                            将文件拖到此处或
                            <span className='text-[#666cff] px-1'>
                              点击上传
                            </span>
                          </p>
                          <p className='ant-upload-hint text-[12px] text-gray-400 mt-2 pb-2 px-4'>
                            {field.placeholder ||
                              '支持上传pdf/word格式文件，单个文件不能超过50M'}
                          </p>
                        </Dragger>
                      </Form.Item>
                    )

                  // 🚀 新增零件 2：色块单选
                  case 'color-radio':
                    return (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={rules}
                        className='mb-6'
                      >
                        <ColorRadio options={field.options || []} />
                      </Form.Item>
                    )
                  default:
                    return null
                }
              })}
            </div>

            {/* 吸底的提交按钮 */}
            <div className='sticky bottom-0 bg-white pt-4 pb-2 mt-4 z-10 border-t border-gray-50'>
              <Button
                type='primary'
                htmlType='submit'
                className='w-full h-12 bg-[#666cff] hover:bg-[#585ee6] border-none rounded-lg text-[16px] font-medium '
              >
                {schema.submitText}{' '}
                {schema.submitHint && (
                  <span className='text-sm opacity-80'>
                    {schema.submitHint}
                  </span>
                )}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  )
}
