// @ts-check
import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration.
 * Tests run against the Vite dev server (started automatically).
 * CI uses --reporter=github for annotations; locally uses list.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // CI: serve the production build via vite preview (faster, stable port)
    // Local: reuse the already-running dev server if available
    command: process.env.CI ? 'npm run build && npm run preview -- --port 5173' : 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
