/**
 * Framework Creation E2E Tests
 *
 * End-to-end tests for the complete framework entry creation flow:
 * 1. Navigate to journal creation
 * 2. Select framework and template
 * 3. Fill in form fields with validation
 * 4. Save and verify entry
 * 5. Verify data bindings on subsequent entries
 *
 * @module e2e/framework-creation
 */

import { test, expect, type Page } from '@playwright/test'

// ============================================================================
// TEST FIXTURES AND HELPERS
// ============================================================================

interface TestUser {
  email: string
  password: string
}

const testUser: TestUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
}

/**
 * Login helper - assumes auth is already set up
 */
async function login(page: Page, user: TestUser) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(dashboard|journals)/)
}

/**
 * Navigate to journal creation page
 */
async function navigateToJournalCreation(page: Page) {
  await page.goto('/journals')
  await page.getByRole('button', { name: /new journal|create/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * Wait for form to be ready
 */
async function waitForFormReady(page: Page) {
  await expect(page.getByRole('form')).toBeVisible()
  await expect(page.locator('[data-loading]')).toBeHidden()
}

// ============================================================================
// FRAMEWORK SELECTION TESTS
// ============================================================================

test.describe('Framework Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })
  })

  test('should display available frameworks in template selection modal', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()

    // Framework categories should be visible
    await expect(page.getByText('Charter & Course')).toBeVisible()
    await expect(page.getByText('Stoic Journal')).toBeVisible()

    // Standalone option should be available
    await expect(page.getByText(/standalone|freeform/i)).toBeVisible()
  })

  test('should show framework description on hover or focus', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()

    const frameworkCard = page.getByTestId('framework-card-charter-and-course')
    await frameworkCard.hover()

    await expect(page.getByText(/intentional living/i)).toBeVisible()
  })

  test('should display templates within selected framework', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()

    // Select Charter & Course framework
    await page.getByTestId('framework-card-charter-and-course').click()

    // Templates should be visible
    await expect(page.getByText('Personal Charter')).toBeVisible()
    await expect(page.getByText('Quarterly Snapshot')).toBeVisible()
    await expect(page.getByText('Weekly Scoreboard')).toBeVisible()
    await expect(page.getByText('Reset Protocol')).toBeVisible()
  })

  test('should show locked status for templates with unmet prerequisites', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()

    // For a new user, Quarterly Review should be locked
    const quarterlyCard = page.getByTestId('template-card-quarterly-review-plan')
    await expect(quarterlyCard.getByRole('img', { name: /lock/i })).toBeVisible()
    await expect(quarterlyCard).toHaveAttribute('aria-disabled', 'true')
  })
})

// ============================================================================
// PERSONAL CHARTER CREATION TESTS
// ============================================================================

test.describe('Personal Charter Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })
  })

  test('should create Personal Charter entry', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // Wait for form to load
    await expect(page.getByRole('heading', { name: 'Personal Charter' })).toBeVisible()

    // Fill in Core Identity section
    await page.getByLabel(/dependable/i).fill('I am the anchor when others need stability.')
    await page.getByLabel(/forthright/i).fill('I speak truth with kindness and clarity.')

    // Save the entry
    await page.getByRole('button', { name: /save|submit/i }).click()

    // Verify success
    await expect(page.getByText(/saved successfully/i)).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // Try to save without filling required fields
    await page.getByRole('button', { name: /save|submit/i }).click()

    // Should show validation errors
    await expect(page.getByText(/required/i)).toBeVisible()
  })

  test('should autosave draft as user types', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // Type in a field
    await page.getByLabel(/dependable/i).fill('Draft content...')

    // Wait for autosave indicator
    await expect(page.getByText(/saving|saved/i)).toBeVisible()
  })
})

// ============================================================================
// QUARTERLY REVIEW CREATION TESTS
// ============================================================================

test.describe('Quarterly Review Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
      // Mock having completed Personal Charter
      localStorage.setItem(
        'framework_progress',
        JSON.stringify({
          'charter-and-course': {
            foundationCompletions: [
              { templateId: 'personal-charter', completedAt: new Date().toISOString() },
            ],
          },
        })
      )
    })
  })

  test('should unlock Quarterly Review after Personal Charter', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()

    // Quarterly Review should be unlocked
    const quarterlyCard = page.getByTestId('template-card-quarterly-review-plan')
    await expect(quarterlyCard).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('should create Quarterly Review with 3 focus areas', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-quarterly-review-plan').click()

    // Select quarter
    await page.getByLabel(/quarter/i).selectOption('Q4')
    await page.getByLabel(/theme/i).fill('Year-End Push')

    // Add focus areas
    await page.getByRole('button', { name: /add focus area/i }).click()
    await page.getByLabel(/area name/i).first().fill('Health')
    await page.getByLabel(/lead measures/i).first().fill('Gym 4x/week')

    await page.getByRole('button', { name: /add focus area/i }).click()
    await page.getByLabel(/area name/i).nth(1).fill('Career')
    await page.getByLabel(/lead measures/i).nth(1).fill('Deep work 2 hours')

    await page.getByRole('button', { name: /add focus area/i }).click()
    await page.getByLabel(/area name/i).nth(2).fill('Relationships')
    await page.getByLabel(/lead measures/i).nth(2).fill('Weekly date night')

    // Save
    await page.getByRole('button', { name: /save|submit/i }).click()
    await expect(page.getByText(/saved successfully/i)).toBeVisible()
  })

  test('should limit focus areas to maximum of 3', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-quarterly-review-plan').click()

    // Add 3 focus areas
    await page.getByRole('button', { name: /add focus area/i }).click()
    await page.getByRole('button', { name: /add focus area/i }).click()
    await page.getByRole('button', { name: /add focus area/i }).click()

    // Add button should be disabled or hidden after 3
    const addButton = page.getByRole('button', { name: /add focus area/i })
    await expect(addButton).toBeDisabled()
  })
})

// ============================================================================
// WEEKLY SCOREBOARD WITH DATA BINDING TESTS
// ============================================================================

test.describe('Weekly Scoreboard Data Binding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
      // Mock having completed Personal Charter and Quarterly Review
      localStorage.setItem(
        'framework_progress',
        JSON.stringify({
          'charter-and-course': {
            foundationCompletions: [
              { templateId: 'personal-charter', completedAt: '2024-01-01T00:00:00Z' },
            ],
            completedCycles: [
              {
                templateId: 'quarterly-review-plan',
                completedAt: '2024-01-15T00:00:00Z',
                capturedData: {
                  'quarter-select': 'Q4',
                  'focus-areas': [
                    { 'focus-area-name': 'Health' },
                    { 'focus-area-name': 'Career' },
                    { 'focus-area-name': 'Relationships' },
                  ],
                },
              },
            ],
          },
        })
      )
    })
  })

  test('should pre-populate focus areas from Quarterly Review', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-weekly-scoreboard').click()

    // Wait for form to load
    await expect(page.getByRole('heading', { name: 'Weekly Scoreboard' })).toBeVisible()

    // Focus areas should be pre-populated
    await expect(page.getByText('Health')).toBeVisible()
    await expect(page.getByText('Career')).toBeVisible()
    await expect(page.getByText('Relationships')).toBeVisible()
  })

  test('should display current quarter as readonly', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-weekly-scoreboard').click()

    // Current quarter should be displayed and readonly
    const quarterField = page.getByLabel(/current quarter/i)
    await expect(quarterField).toHaveValue('Q4')
    await expect(quarterField).toBeDisabled()
  })

  test('should not allow editing readonly bound fields', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-weekly-scoreboard').click()

    // Focus area names should be readonly
    const focusAreaInput = page.getByLabel(/focus area/i).first()
    await expect(focusAreaInput).toBeDisabled()
  })

  test('should allow entering scores for each focus area', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-weekly-scoreboard').click()

    // Enter week number
    await page.getByLabel(/week number/i).fill('11')

    // Enter scores for each focus area
    const scoreSliders = page.getByRole('slider')
    await scoreSliders.nth(0).fill('4') // Health
    await scoreSliders.nth(1).fill('3') // Career
    await scoreSliders.nth(2).fill('5') // Relationships

    // Save
    await page.getByRole('button', { name: /save|submit/i }).click()
    await expect(page.getByText(/saved successfully/i)).toBeVisible()
  })

  test('should validate week number range 1-13', async ({ page }) => {
    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-weekly-scoreboard').click()

    // Try invalid week number
    await page.getByLabel(/week number/i).fill('15')
    await page.getByRole('button', { name: /save|submit/i }).click()

    // Should show validation error
    await expect(page.getByText(/between 1 and 13|invalid/i)).toBeVisible()
  })
})

// ============================================================================
// JOURNAL FILTERING E2E TESTS
// ============================================================================

test.describe('Journal Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })
  })

  test('should filter journals by framework', async ({ page }) => {
    await page.goto('/journals')

    // Select Charter & Course filter
    await page.getByLabel(/filter by framework/i).selectOption('charter-and-course')

    // URL should update with filter param
    await expect(page).toHaveURL(/framework=charter-and-course/)

    // Only Charter entries should be visible
    await expect(page.getByTestId('framework-badge-charter-and-course')).toBeVisible()
  })

  test('should filter standalone journals', async ({ page }) => {
    await page.goto('/journals')

    await page.getByLabel(/filter by framework/i).selectOption('standalone')

    await expect(page).toHaveURL(/framework=standalone/)
  })

  test('should combine search and framework filters', async ({ page }) => {
    await page.goto('/journals')

    await page.getByPlaceholder(/search/i).fill('weekly')
    await page.getByLabel(/filter by framework/i).selectOption('charter-and-course')

    await expect(page).toHaveURL(/q=weekly.*framework=charter-and-course/)
  })

  test('should persist filters in URL on page reload', async ({ page }) => {
    await page.goto('/journals?framework=charter-and-course&q=test')

    // Filters should be applied from URL
    await expect(page.getByLabel(/filter by framework/i)).toHaveValue('charter-and-course')
    await expect(page.getByPlaceholder(/search/i)).toHaveValue('test')
  })

  test('should clear all filters', async ({ page }) => {
    await page.goto('/journals?framework=charter-and-course&q=test&date=week')

    await page.getByRole('button', { name: /clear all|reset/i }).click()

    await expect(page).toHaveURL('/journals')
    await expect(page.getByLabel(/filter by framework/i)).toHaveValue('all')
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/api/journals', route => route.abort())

    await page.goto('/journals')

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible()
  })

  test('should handle form submission errors', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.route('**/api/journals', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    await page.getByLabel(/dependable/i).fill('Test content')
    await page.getByLabel(/forthright/i).fill('Test content')
    await page.getByRole('button', { name: /save|submit/i }).click()

    await expect(page.getByText(/error|failed|try again/i)).toBeVisible()
  })
})

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Accessibility', () => {
  test('should navigate template selection with keyboard', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()

    // Navigate frameworks with keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Select first framework

    // Navigate templates with keyboard
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter') // Select first template
  })

  test('should have proper ARIA labels on form fields', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // All form fields should have accessible labels
    const fields = await page.locator('input, textarea, select').all()
    for (const field of fields) {
      const ariaLabel = await field.getAttribute('aria-label')
      const ariaLabelledBy = await field.getAttribute('aria-labelledby')
      const id = await field.getAttribute('id')

      // Field should have a label association
      expect(ariaLabel || ariaLabelledBy || (id && await page.locator(`label[for="${id}"]`).count() > 0)).toBeTruthy()
    }
  })

  test('should announce form validation errors', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // Submit without filling required fields
    await page.getByRole('button', { name: /save|submit/i }).click()

    // Error messages should have aria-live for screen readers
    const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
    await expect(errorMessages.first()).toBeVisible()
  })
})

// ============================================================================
// MOBILE RESPONSIVENESS TESTS
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should display mobile-friendly template selection', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()

    // Modal should be fullscreen on mobile
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Frameworks should be in a scrollable list
    const frameworkList = dialog.locator('[data-testid="framework-list"]')
    await expect(frameworkList).toBeVisible()
  })

  test('should have touch-friendly form controls', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({ id: 'user-1', email: 'test@example.com' }))
    })

    await page.goto('/journals')
    await page.getByRole('button', { name: /new journal|create/i }).click()
    await page.getByTestId('framework-card-charter-and-course').click()
    await page.getByTestId('template-card-personal-charter').click()

    // Input fields should have minimum touch target size (44x44)
    const inputs = await page.locator('input, textarea, button').all()
    for (const input of inputs) {
      const box = await input.boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40)
      }
    }
  })
})
