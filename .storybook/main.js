/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@chromatic-com/storybook',
  ],
  framework: '@storybook/react-vite',
  docs: { autodocs: 'tag' },

  async viteFinal(config) {
    // Remove vite-plugin-pwa from Storybook builds — it tries to generate
    // a service worker and manifest, which breaks the Storybook output.
    if (config.plugins) {
      config.plugins = config.plugins.filter((plugin) => {
        if (!plugin) return false
        const name = Array.isArray(plugin) ? plugin[0]?.name : plugin.name
        return !name?.toLowerCase().includes('pwa') && !name?.toLowerCase().includes('workbox')
      })
    }
    return config
  },
}
export default config
