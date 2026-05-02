import { expect, type Page, test } from '@playwright/test';

async function enterLocalPreview(page: Page) {
  await page.goto('/sign-in');
  await expect(page.getByText('Make daily applications visible.')).toBeVisible();
  await page.getByRole('button', { name: 'Continue local preview' }).click();
  await expect(page.getByText('Application Activity')).toBeVisible();
}

test('protected routes redirect to sign in before local preview starts', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText('Make daily applications visible.')).toBeVisible();
});

test('local preview opens the dashboard and supports today count plus heatmap controls', async ({
  page,
}) => {
  await enterLocalPreview(page);

  const todayInput = page.getByLabel("Today's application count");
  await expect(todayInput).toBeVisible();
  await todayInput.fill('11');
  await expect(todayInput).toHaveValue('11');

  await page.getByRole('button', { name: 'Add one application' }).click();
  await expect(todayInput).toHaveValue('12');

  await page.getByLabel("Decrease today's applications").click();
  await expect(todayInput).toHaveValue('11');

  await page.getByRole('button', { name: '12M' }).click();
  await expect(page.getByText('Application Activity')).toBeVisible();

  await page.locator('[aria-label*="applications on"]').first().hover();
  await expect(page.getByText('Activity tooltip')).toBeVisible();
});

test('tasks can be created with due dates, moved, edited, and deleted', async ({ page }) => {
  await enterLocalPreview(page);
  await page.goto('/tasks');
  await expect(page.getByText('Board Controls')).toBeVisible();

  await page.getByPlaceholder('Add a task').fill('Call hiring manager');
  await page.getByPlaceholder('Notes').fill('Ask about next steps');
  await page.getByPlaceholder('Due date').fill('2026-05-15');
  await page.getByRole('button', { name: 'Create' }).click();

  let taskCard = page.locator('[data-testid^="task-card-"]').filter({
    hasText: 'Call hiring manager',
  });
  await expect(taskCard).toBeVisible();
  await expect(taskCard.getByText('Due 2026-05-15')).toBeVisible();

  await taskCard.getByRole('button', { name: 'Move Call hiring manager to Doing' }).click();
  taskCard = page.locator('[data-testid^="task-card-"]').filter({
    hasText: 'Call hiring manager',
  });
  await expect(taskCard.getByRole('button', { name: 'Move Call hiring manager to Todo' })).toBeVisible();

  await taskCard.getByRole('button', { name: 'Edit task' }).click();
  await page.getByPlaceholder('Task title').fill('Call hiring manager today');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Call hiring manager today')).toBeVisible();

  const updatedTaskCard = page.locator('[data-testid^="task-card-"]').filter({
    hasText: 'Call hiring manager today',
  });
  await updatedTaskCard.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByText('Call hiring manager today')).toHaveCount(0);
});

test('friends can be searched by exact email and requested', async ({ page }) => {
  await enterLocalPreview(page);
  await page.goto('/friends');

  await page.getByPlaceholder('friend@example.com').fill('alex@example.com');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('alex@example.com')).toBeVisible();

  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText('Friend request queued.')).toBeVisible();
  await expect(page.getByText('Outgoing - alex@example.com')).toBeVisible();
});

test('accepted friends can be removed after confirmation', async ({ page }) => {
  await enterLocalPreview(page);
  await page.goto('/friends');

  await expect(page.getByText('maya@example.com').first()).toBeVisible();
  await page.getByText('Maya Chen').last().click();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove friend' }).click();

  await expect(page.getByText('Friend removed.')).toBeVisible();
  await expect(page.getByText('maya@example.com')).toHaveCount(0);
});

test('settings save profile changes and explain timezone policy', async ({ page }) => {
  await enterLocalPreview(page);
  await page.goto('/settings');

  await expect(page.getByText(/Timezone controls which local date receives today/)).toBeVisible();
  await page.getByPlaceholder('Display name').fill('Playwright User');
  await page.getByPlaceholder('Timezone').fill('UTC');
  await page.getByRole('button', { name: 'Save profile' }).click();

  await expect(page.getByText('Profile updated.')).toBeVisible();
  await expect(page.getByText('Playwright User')).toBeVisible();
});
