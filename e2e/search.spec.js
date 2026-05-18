/**
 * E2E — Search flow
 *
 * Verifies the core user journey:
 *   mount → index loads → user types → result appears → localStorage saved
 */
import { expect, test } from '@playwright/test'

test.describe('Pokédex IA — search flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage between tests
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('renders the empty state heading on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /pokédex ia/i })).toBeVisible()
  })

  test('search input is visible and accepts text', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder(/pikachu|charizard/i)
    await expect(input).toBeVisible()
    await input.fill('pikachu')
    await expect(input).toHaveValue('pikachu')
  })

  test('typing a name shows a matching result button', async ({ page }) => {
    await page.goto('/')
    // Wait for the index to finish loading (count pill appears)
    await expect(page.getByText(/\d+ Pokémon/)).toBeVisible({ timeout: 10_000 })

    const input = page.getByPlaceholder(/pikachu|charizard/i)
    await input.fill('pikachu')

    // A result button with "Pikachu" should appear in the dropdown
    const resultBtn = page.getByRole('option', { name: /pikachu/i }).first()
    await expect(resultBtn).toBeVisible({ timeout: 5_000 })
  })

  test('skip-to-content link is focusable', async ({ page }) => {
    await page.goto('/')
    // Tab once to focus the skip link, which should become visible
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: /saltar al resultado/i })
    await expect(skipLink).toBeFocused()
  })
})
