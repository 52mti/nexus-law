// src/components/Skeleton/SidebarSkeleton.tsx
import React from 'react'

interface SidebarSkeletonProps {
  /** 骨架卡片的数量，默认为 6 */
  count?: number
}

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='flex items-center gap-4 p-4 h-20 rounded-xl bg-[#f7f8fb] animate-pulse'
        >
          {/* 🌟 图标骨架 */}
          <div className='w-6.25 h-6.25 rounded-full bg-gray-200 shrink-0'></div>
          
          {/* 🌟 文本骨架 */}
          <div className='flex flex-col gap-2 w-full mt-1'>
            {/* 标题占位：宽度 1/3 */}
            <div className='h-4 bg-gray-200 rounded-md w-1/3'></div>
            {/* 描述占位：宽度 2/3 */}
            <div className='h-3 bg-gray-200 rounded-md w-2/3'></div>
          </div>
        </div>
      ))}
    </>
  )
}