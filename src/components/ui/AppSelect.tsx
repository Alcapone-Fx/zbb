'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sub?: string
}

export interface SelectSection {
  label: string
  options: SelectOption[]
}

interface Props {
  value: string
  onChange: (value: string) => void
  options?: SelectOption[]
  sections?: SelectSection[]
  searchable?: boolean
  placeholder?: string
  disabled?: boolean
}

export function AppSelect({
  value,
  onChange,
  options,
  sections,
  searchable,
  placeholder = 'Seleccionar…',
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const allOptions = sections ? sections.flatMap((s) => s.options) : options ?? []
  const selected = allOptions.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (!open) {
      Promise.resolve().then(() => setQuery(''))
    }
  }, [open])

  const q = query.trim().toLowerCase()

  const filteredSections = sections
    ?.map((s) => ({
      ...s,
      options: q
        ? s.options.filter(
            (o) => o.label.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
          )
        : s.options,
    }))
    .filter((s) => s.options.length > 0)

  const filteredOptions = !sections
    ? q
      ? (options ?? []).filter((o) => o.label.toLowerCase().includes(q))
      : options ?? []
    : undefined

  const noResults = sections ? (filteredSections?.length ?? 0) === 0 : filteredOptions?.length === 0

  function renderOption(opt: SelectOption, isFirstInList: boolean) {
    const isSelected = opt.value === value
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => { onChange(opt.value); setOpen(false) }}
        className="w-full px-3 py-2.5 text-left text-sm flex items-start gap-2 transition-opacity hover:opacity-75"
        style={{
          background: isSelected ? 'var(--ab)' : 'transparent',
          borderTop: !isFirstInList ? '1px solid var(--border-card)' : undefined,
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
  }

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
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-card)',
          }}
        >
          {searchable && (
            <div className="p-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-dim)' }}
                />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full rounded-lg border pl-8 pr-3 py-1.5 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {noResults && (
              <p className="px-3 py-3 text-sm text-center" style={{ color: 'var(--text-dim)' }}>
                Sin resultados
              </p>
            )}

            {sections
              ? filteredSections?.map((section) => (
                  <div key={section.label}>
                    <p
                      className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wide"
                      style={{ color: 'var(--text-dim)', background: 'var(--bg-elevated)' }}
                    >
                      {section.label}
                    </p>
                    {section.options.map((opt, i) => renderOption(opt, i === 0))}
                  </div>
                ))
              : filteredOptions?.map((opt, i) => renderOption(opt, i === 0))}
          </div>
        </div>
      )}
    </div>
  )
}
