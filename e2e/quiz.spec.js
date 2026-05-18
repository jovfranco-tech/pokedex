/**
 * E2E — Quiz flow
 *
 * Opens the quiz modal and verifies the question/answer cycle.
 */
import { expect, test } from '@playwright/test'

test.describe('Pokédex IA — Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to fully mount
    await expect(page.getByRole('heading', { name: /pokédex ia/i })).toBeVisible()
  })

  test('quiz button is visible and opens the modal', async ({ page }) => {
    const quizBtn = page.getByRole('button', { name: /quiz/i })
    await expect(quizBtn).toBeVisible()
    await quizBtn.click()

    await expect(page.getByText('¿Quién es ese Pokémon?')).toBeVisible()
  })

  test('quiz shows a silhouette image and 4 options', async ({ page }) => {
    await page.getByRole('button', { name: /quiz/i }).click()

    // Wait for quiz to fully render
    await expect(page.getByText('¿Quién es ese Pokémon?')).toBeVisible()

    // Should have exactly 4 option buttons (plus close button)
    const optionGroup = page.getByRole('group', { name: /opciones/i })
    await expect(optionGroup).toBeVisible()
    const options = optionGroup.getByRole('button')
    await expect(options).toHaveCount(4)
  })

  test('answering a question reveals the result and next button', async ({ page }) => {
    await page.getByRole('button', { name: /quiz/i }).click()
    await expect(page.getByText('¿Quién es ese Pokémon?')).toBeVisible()

    // Click the first option
    const optionGroup = page.getByRole('group', { name: /opciones/i })
    const firstOption = optionGroup.getByRole('button').first()
    await firstOption.click()

    // Score should now show /1
    await expect(page.getByText(/\/1/)).toBeVisible()
    // Siguiente button should appear
    await expect(page.getByRole('button', { name: /siguiente/i })).toBeVisible()
  })

  test('close button dismisses the quiz', async ({ page }) => {
    await page.getByRole('button', { name: /quiz/i }).click()
    await expect(page.getByText('¿Quién es ese Pokémon?')).toBeVisible()

    await page.getByRole('button', { name: /cerrar quiz/i }).click()
    await expect(page.getByText('¿Quién es ese Pokémon?')).not.toBeVisible()
  })
})
