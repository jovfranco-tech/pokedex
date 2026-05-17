import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(isOpen) {
  const ref = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    previousFocus.current = document.activeElement

    // Focus the first focusable element inside the trap
    const frame = window.requestAnimationFrame(() => {
      const first = ref.current?.querySelector(FOCUSABLE)
      first?.focus()
    })

    function onKeyDown(event) {
      if (!ref.current) return

      if (event.key === 'Escape') {
        event.preventDefault()
        // Signal close via custom event; callers listen for it
        ref.current.dispatchEvent(new CustomEvent('trap:escape', { bubbles: true }))
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(ref.current.querySelectorAll(FOCUSABLE))
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      previousFocus.current?.focus()
    }
  }, [isOpen])

  return ref
}
