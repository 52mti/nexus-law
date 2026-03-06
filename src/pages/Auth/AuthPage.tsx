import React, { useState } from 'react'
import { PasswordLoginForm } from './PasswordLoginForm'
import { PhoneLoginForm } from './PhoneLoginForm'
import { RegisterForm } from './RegisterForm'
import { ResetPwdForm } from './ResetPwdForm'

export const AuthPage: React.FC = () => {
  // 统一管理当前处于什么模式，默认为密码登录
  const [currentMode, setCurrentMode] = useState<AuthMode>('pwd_login')

  // 1. 定义一个“组件字典”，根据不同状态渲染不同表单
  const FormMap = {
    pwd_login: <PasswordLoginForm onSwitchMode={setCurrentMode} />,
    phone_login: <PhoneLoginForm onSwitchMode={setCurrentMode} />,
    register: <RegisterForm onSwitchMode={setCurrentMode} />,
    reset_pwd: <ResetPwdForm onSwitchMode={setCurrentMode} />,
  }

  return (
    <div className='min-h-screen bg-[#f5f6f9] flex flex-col items-center justify-center relative pb-20'>
      <div className='bg-white w-110 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 transition-all duration-300 pb-20'>
        {/* 共享的 Logo 区域 */}
        <div className='flex items-center justify-center mb-10'>
          <div className='w-8 h-8 bg-[#0e1118] rounded-md flex items-center justify-center mr-3'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path d='M5 4H9V20H5V4Z' fill='#4f6bff' />
              <path d='M15 4H19V20H15V4Z' fill='#4f6bff' />
              <path d='M9 11H15V14H9V11Z' fill='#4f6bff' />
            </svg>
          </div>
          <span className='text-[22px] font-bold text-gray-800'>
            汇动法律AI
          </span>
        </div>

        {/* 2. 动态渲染对应的表单模块 */}
        {FormMap[currentMode]}
      </div>
      {/* 🚀 新增：底部版权信息小字 */}
      <div className="absolute bottom-8 text-[#b1b3b8] text-[13px] tracking-wide text-center">
        Copyright © hui dong AI, All Rights Reserved.
      </div>
    </div>
  )
}

export default AuthPage
