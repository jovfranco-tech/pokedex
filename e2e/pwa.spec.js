/**
 * E2E — PWA & meta checks
 *
 * Verifies PWA requirements and critical meta tags are present.
 */
import { expect, test } from '@playwright/test'

test.describe('PWA & meta', () => {
  test('manifest is linked and has display:standalone', async ({ page }) => {
    await page.goto('/')
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifest).toBeTruthy()

    const response = await page.request.get(manifest)
    expect(response.ok()).toBe(true)
    const json = await response.json()
    expect(json.display).toBe('standalone')
    expect(json.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  test('page has color-scheme meta tag', async ({ page }) => {
    await page.goto('/')
    const colorScheme = await page.locator('meta[name="color-scheme"]').getAttribute('content')
    expect(colorScheme).toContain('dark')
  })

  test('page has OG meta tags', async ({ page }) => {
    await page.goto('/')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toBeTruthy()
  })

  test('theme-color meta is set', async ({ page }) => {
    await page.goto('/')
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(themeColor).toBeTruthy()
  })

  test('service worker is registered', async ({ page }) => {
    await page.goto('/')
    // Give SW time to register
    await page.waitForTimeout(1000)
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const regs = await navigator.serviceWorker.getRegistrations()
      return regs.length > 0
    })
    expect(swRegistered).toBe(true)
  })
})
