import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary.tsx'

function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('boom')
  return <span>safe</span>
}

describe('ErrorBoundary', () => {
  // React logs caught errors via console.error — suppress to keep test output clean
  let consoleSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders its children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <span data-testid="child">hello</span>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders the default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Algo salió mal aquí.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })

  it('renders a custom message when provided', () => {
    render(
      <ErrorBoundary message="Falló la cámara">
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Falló la cámara')).toBeInTheDocument()
  })

  it('renders a custom fallback when provided (and skips the default UI)', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">custom</div>}>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('custom')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal aquí.')).not.toBeInTheDocument()
  })

  it('logs the error to console.error', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    // React itself logs once; ErrorBoundary logs again with the [ErrorBoundary] prefix
    const tagged = consoleSpy.mock.calls.some((call: unknown[]) =>
      String(call[0]).includes('[ErrorBoundary]'),
    )
    expect(tagged).toBe(true)
  })

  it('clears the error state when Reintentar is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Algo salió mal aquí.')).toBeInTheDocument()

    // Swap to a non-throwing child FIRST (boundary still in error state),
    // then click retry to reset hasError and render the new children.
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(screen.getByText('safe')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal aquí.')).not.toBeInTheDocument()
  })
})
