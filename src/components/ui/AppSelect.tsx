'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sub?: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}

export function AppSelect({ value, onChange, options, placeholder = 'Seleccionar…', disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg border px-3 py-2 text-sm text-left flex items-center justify-between gap-2 focus:outline-none transition-colors"
        style={{
          background: 'var(--bg-app)',
          borderColor: open ? 'var(--ac)' : 'var(--border-card)',
          color: selected ? 'var(--text-main)' : 'var(--text-dim)',
        }}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform duration-150"
          style={{
            color: 'var(--text-dim)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-y-auto shadow-xl"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-card)',
            maxHeight: 220,
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className="w-full px-3 py-2.5 text-left text-sm flex items-start gap-2 transition-opacity hover:opacity-75"
                style={{
                  background: isSelected ? 'var(--ab)' : 'transparent',
                  borderTop: i > 0 ? '1px solid var(--border-card)' : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span
                    className="block font-medium truncate"
                    style={{ color: isSelected ? 'var(--ac)' : 'var(--text-main)' }}
                  >
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                      {opt.sub}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--ac)' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
