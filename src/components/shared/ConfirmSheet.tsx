'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from './BottomSheet'

interface ConfirmSheetProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void>
  destructive?: boolean
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: ConfirmSheetProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <p className="text-sm mb-6" style={{ color: 'var(--text-sub)' }}>
        {description}
      </p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'default'}
          className="flex-1"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Procesando…' : confirmLabel}
        </Button>
      </div>
    </BottomSheet>
  )
}
