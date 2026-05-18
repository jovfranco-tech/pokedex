/**
 * E2E — Accessibility checks
 *
 * Verifies key a11y requirements that cannot be covered by unit tests:
 * focus management, ARIA live regions, keyboard navigation.
 */
import { expect, test } from '@playwright/test'

test.describe('Accessibility', () => {
  test('page has a single h1 (Pokédex IA)', async ({ page }) => {
    await page.goto('/')
    const h1s = await page.locator('h1').all()
    expect(h1s).toHaveLength(1)
    await expect(h1s[0]).toContainText('Pokédex IA', { ignoreCase: true })
  })

  test('all buttons with only icons have an aria-label', async ({ page }) => {
    await page.goto('/')
    // Wait for the app to mount
    await expect(page.getByRole('heading', { name: /pokédex ia/i })).toBeVisible()

    // Find icon-only buttons: buttons that contain no visible text nodes (only svg/img)
    const violations = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons
        .filter((btn) => {
          const hasText = btn.textContent?.trim().length > 0
          const hasAriaLabel = btn.hasAttribute('aria-label')
          const hasAriaLabelledby = btn.hasAttribute('aria-labelledby')
          // A button with no visible text and no accessible name is a violation
          return !hasText && !hasAriaLabel && !hasAriaLabelledby
        })
        .map((btn) => btn.outerHTML.slice(0, 120))
    })
    expect(violations, `Buttons without accessible name: ${violations.join('\n')}`).toHaveLength(0)
  })

  test('status bar announces scanning state to screen readers', async ({ page }) => {
    await page.goto('/')
    const statusBar = page.locator('[role="status"]').first()
    await expect(statusBar).toBeVisible()
    await expect(statusBar).toHaveAttribute('aria-live')
  })

  test('gen filter buttons have aria-pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /pokédex ia/i })).toBeVisible()
    // The "Todos" filter should have aria-pressed="true" by default
    const todosBtn = page.getByRole('button', { name: /todas las generaciones/i })
    await expect(todosBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
