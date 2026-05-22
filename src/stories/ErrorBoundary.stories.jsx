import { ErrorBoundary } from '../components/ErrorBoundary.jsx'

/** Helper that throws on render — used to trigger the boundary. */
function BombComponent() {
  throw new Error('Simulated render crash')
}

/**
 * ErrorBoundary wraps children and shows a friendly fallback when any
 * child throws. Uses a class component so it's compatible with React's
 * error boundary lifecycle.
 */
export default {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
  },
}

/** Fallback state — shown when a child throws. */
export const FallbackVisible = {
  args: { message: 'El Pokémon no pudo cargarse. Intenta de nuevo.' },
  render: (args) => (
    <ErrorBoundary {...args}>
      <BombComponent />
    </ErrorBoundary>
  ),
}

/** Happy path — children render normally. */
export const ChildrenRender = {
  args: { message: 'Algo salió mal.' },
  render: (args) => (
    <ErrorBoundary {...args}>
      <p style={{ fontWeight: 700 }}>Todo funciona correctamente ✓</p>
    </ErrorBoundary>
  ),
}
