import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScanHistoryStrip } from '../ScanHistoryStrip.tsx'
import type { ScanHistoryEntry } from '../../hooks/useCollection.ts'

const mk = (id: number, name: string, overrides: Partial<ScanHistoryEntry> = {}): ScanHistoryEntry => ({
  id,
  speciesId: id,
  apiName: name.toLowerCase(),
  name,
  displayNumber: `#${String(id).padStart(4, '0')}`,
  sprite: `https://img/${id}.png`,
  type: 'normal',
  confidenceScore: 95,
  scannedAt: new Date(2024, 0, id).toISOString(),
  scanMode: 'búsqueda por texto',
  ...overrides,
})

describe('ScanHistoryStrip', () => {
  it('renders nothing when history is empty', () => {
    const { container } = render(<ScanHistoryStrip history={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when history is undefined', () => {
    const { container } = render(<ScanHistoryStrip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when history is not an array', () => {
    const { container } = render(
      <ScanHistoryStrip history={null as unknown as ScanHistoryEntry[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the "Recientes" header', () => {
    render(<ScanHistoryStrip history={[mk(25, 'Pikachu')]} />)
    expect(screen.getByText('Recientes')).toBeInTheDocument()
  })

  it('caps the visible list at 6 entries', () => {
    const history = Array.from({ length: 10 }, (_, i) => mk(i + 1, `Mon${i + 1}`))
    render(<ScanHistoryStrip history={history} />)
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('renders the confidence score when present', () => {
    render(<ScanHistoryStrip history={[mk(25, 'Pikachu', { confidenceScore: 97 })]} />)
    expect(screen.getByText(/· 97%/)).toBeInTheDocument()
  })

  it('does not render the confidence suffix when score is 0', () => {
    render(<ScanHistoryStrip history={[mk(25, 'Pikachu', { confidenceScore: 0 })]} />)
    expect(screen.queryByText(/· 0%/)).not.toBeInTheDocument()
  })

  it('calls onSelect with the clicked history entry', () => {
    const onSelect = vi.fn()
    const entry = mk(25, 'Pikachu')
    render(<ScanHistoryStrip history={[entry]} onSelect={onSelect} />)

    fireEvent.click(screen.getByLabelText('Volver a abrir Pikachu'))
    expect(onSelect).toHaveBeenCalledWith(entry)
  })

  it('does not crash when onSelect is not provided', () => {
    render(<ScanHistoryStrip history={[mk(25, 'Pikachu')]} />)
    expect(() => fireEvent.click(screen.getByLabelText('Volver a abrir Pikachu')))
      .not.toThrow()
  })

  it('renders each entry with its displayNumber', () => {
    render(<ScanHistoryStrip history={[mk(1, 'Bulbasaur'), mk(150, 'Mewtwo')]} />)
    expect(screen.getByText(/#0001/)).toBeInTheDocument()
    expect(screen.getByText(/#0150/)).toBeInTheDocument()
  })
})
