import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScanCandidateStrip } from '../ScanCandidateStrip.tsx'
import type { ScanCandidate } from '../../services/visionSimulator.ts'

const mk = (id: number, name: string, overrides: Partial<ScanCandidate> = {}): ScanCandidate => ({
  id,
  apiName: name.toLowerCase(),
  name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  sprite: `https://img/${id}.png`,
  confidenceScore: 80,
  reason: 'AI similarity',
  ...overrides,
})

describe('ScanCandidateStrip', () => {
  it('renders nothing when no candidates are provided', () => {
    const { container } = render(<ScanCandidateStrip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when candidates is an empty array', () => {
    const { container } = render(<ScanCandidateStrip candidates={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when candidates is not an array', () => {
    const { container } = render(
      <ScanCandidateStrip candidates={null as unknown as ScanCandidate[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the header copy when there are candidates', () => {
    render(<ScanCandidateStrip candidates={[mk(25, 'Pikachu')]} />)
    expect(screen.getByText('¿No era este?')).toBeInTheDocument()
    expect(screen.getByText(/Elige otra opción/i)).toBeInTheDocument()
  })

  it('caps the visible list at 3 candidates', () => {
    const candidates = Array.from({ length: 6 }, (_, i) => mk(i + 1, `Mon${i + 1}`))
    render(<ScanCandidateStrip candidates={candidates} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('renders the confidence score when present', () => {
    render(<ScanCandidateStrip candidates={[mk(6, 'Charizard', { confidenceScore: 88 })]} />)
    expect(screen.getByText(/· 88%/)).toBeInTheDocument()
  })

  it('does not render the confidence suffix when score is 0', () => {
    render(<ScanCandidateStrip candidates={[mk(6, 'Charizard', { confidenceScore: 0 })]} />)
    expect(screen.queryByText(/· 0%/)).not.toBeInTheDocument()
  })

  it('calls onSelect with the chosen candidate', () => {
    const onSelect = vi.fn()
    const candidate = mk(25, 'Pikachu')
    render(<ScanCandidateStrip candidates={[candidate]} onSelect={onSelect} />)

    fireEvent.click(screen.getByLabelText('Seleccionar Pikachu como resultado'))
    expect(onSelect).toHaveBeenCalledWith(candidate)
  })

  it('does not crash when onSelect is not provided', () => {
    render(<ScanCandidateStrip candidates={[mk(25, 'Pikachu')]} />)
    expect(() => fireEvent.click(screen.getByLabelText('Seleccionar Pikachu como resultado')))
      .not.toThrow()
  })
})
