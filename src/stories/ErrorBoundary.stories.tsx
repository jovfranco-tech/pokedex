import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorBoundary } from '../components/ErrorBoundary.tsx'

/** Helper that throws on render — used to trigger the boundary. */
function BombComponent(): never {
  throw new Error('Simulated render crash')
}

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
  },
} satisfies Meta<typeof ErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

/** Fallback state — shown when a child throws. */
export const FallbackVisible: Story = {
  args: { message: 'El Pokémon no pudo cargarse. Intenta de nuevo.' },
  render: (args) => (
    <ErrorBoundary {...args}>
      <BombComponent />
    </ErrorBoundary>
  ),
}

/** Happy path — children render normally. */
export const ChildrenRender: Story = {
  args: { message: 'Algo salió mal.' },
  render: (args) => (
    <ErrorBoundary {...args}>
      <p style={{ fontWeight: 700 }}>Todo funciona correctamente ✓</p>
    </ErrorBoundary>
  ),
}
