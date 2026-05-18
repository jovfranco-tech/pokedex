import { domAnimation, LazyMotion } from 'framer-motion'
import '../src/index.css'

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  decorators: [
    (Story) => (
      <LazyMotion features={domAnimation} strict>
        <Story />
      </LazyMotion>
    ),
  ],
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f7fb' },
        { name: 'dark',  value: '#0f1117' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'error',   // fail stories on a11y violations
    },
  },
}

export default preview
