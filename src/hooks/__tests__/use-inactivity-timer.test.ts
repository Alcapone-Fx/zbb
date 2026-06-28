import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInactivityTimer } from '../use-inactivity-timer'

const mockSignOut = vi.fn().mockResolvedValue({})
const mockPush = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signOut: mockSignOut },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('useInactivityTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSignOut.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('signs out and redirects after 30 minutes of inactivity', async () => {
    renderHook(() => useInactivityTimer())

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
    })

    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('does not sign out before 30 minutes', async () => {
    renderHook(() => useInactivityTimer())

    await act(async () => {
      vi.advanceTimersByTime(29 * 60 * 1000)
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('resets timer on user activity', async () => {
    renderHook(() => useInactivityTimer())

    // Advance 20 minutes
    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000)
    })

    // Simulate user activity — triggers 'mousemove'
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove'))
    })

    // Advance another 20 minutes (40 total but timer reset at 20)
    await act(async () => {
      vi.advanceTimersByTime(20 * 60 * 1000)
    })

    // Should NOT have signed out — only 20 minutes since last activity
    expect(mockSignOut).not.toHaveBeenCalled()

    // Advance remaining 10 minutes to reach 30 since last activity
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })

    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it('clears timer on unmount', async () => {
    const { unmount } = renderHook(() => useInactivityTimer())

    unmount()

    await act(async () => {
      vi.advanceTimersByTime(30 * 60 * 1000)
    })

    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
