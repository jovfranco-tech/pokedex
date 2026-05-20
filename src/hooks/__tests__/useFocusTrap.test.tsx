import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useFocusTrap } from '../useFocusTrap.ts'

// ── Helper component ──────────────────────────────────────────────────────────

function TrapHost({ isOpen }: { isOpen: boolean }) {
  const ref = useFocusTrap(isOpen)

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <button id="first">First</button>
      <button id="second">Second</button>
      <button id="last">Last</button>
    </div>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns a ref object', () => {
    let capturedRef: React.RefObject<HTMLElement | null> | undefined
    function Probe() {
      capturedRef = useFocusTrap(false)
      return <div />
    }
    render(<Probe />)
    expect(capturedRef).toBeDefined()
    expect(typeof capturedRef?.current).toBe('object')
  })

  it('focuses the first focusable element when isOpen becomes true', () => {
    const { getByText } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()
    expect(document.activeElement).toBe(getByText('First'))
  })

  it('does not alter focus when isOpen is false', () => {
    const focused = document.createElement('button')
    document.body.appendChild(focused)
    focused.focus()

    render(<TrapHost isOpen={false} />)
    vi.runAllTimers()

    expect(document.activeElement).toBe(focused)
    document.body.removeChild(focused)
  })

  it('wraps Tab forward from last to first element', () => {
    const { getByText } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()

    getByText('Last').focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })

    expect(document.activeElement).toBe(getByText('First'))
  })

  it('wraps Shift+Tab backward from first to last element', () => {
    const { getByText } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()

    getByText('First').focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(document.activeElement).toBe(getByText('Last'))
  })

  it('dispatches trap:escape custom event on Escape key', () => {
    const { container } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()

    const escapeListener = vi.fn()
    container.firstChild?.addEventListener('trap:escape', escapeListener)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(escapeListener).toHaveBeenCalledOnce()
  })

  it('restores focus to previously active element on close (unmount)', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()

    unmount()
    expect(document.activeElement).toBe(trigger)
    document.body.removeChild(trigger)
  })

  it('does not throw when no focusable elements are inside the trap', () => {
    function EmptyTrap() {
      const ref = useFocusTrap(true)
      return <div ref={ref as React.RefObject<HTMLDivElement>} />
    }
    expect(() => {
      render(<EmptyTrap />)
      vi.runAllTimers()
      fireEvent.keyDown(document, { key: 'Tab' })
    }).not.toThrow()
  })

  it('ignores non-Tab/Escape keys', () => {
    const { getByText } = render(<TrapHost isOpen={true} />)
    vi.runAllTimers()

    getByText('First').focus()
    fireEvent.keyDown(document, { key: 'Enter' })

    // Focus should remain on first
    expect(document.activeElement).toBe(getByText('First'))
  })
})
