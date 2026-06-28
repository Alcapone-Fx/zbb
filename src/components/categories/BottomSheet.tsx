'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full animate-[slideUp_0.28s_cubic-bezier(0.34,1.1,0.64,1)]"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '0 20px 40px',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
        </div>

        <div className="flex items-center justify-between py-4">
          <h2
            className="text-[18px] font-extrabold tracking-[-0.3px]"
            style={{ color: 'var(--text-main)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-dim)' }}
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
