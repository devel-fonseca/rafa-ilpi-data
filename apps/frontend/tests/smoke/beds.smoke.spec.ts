import { expect, test } from '@playwright/test'
import {
  mockBedsFlow,
  mockCommonAppApi,
  seedAuthenticatedSession,
} from './support/fixtures'

test('fluxo de transferência de leito abre seleção e confirma movimentação', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockCommonAppApi(page)
  await mockBedsFlow(page)

  await page.goto('/dashboard/beds/map')

  await page.getByRole('button', { name: /Clínica 1/ }).click()
  await page.getByRole('button', { name: /Térreo/ }).click()
  await page.getByRole('button', { name: /Quarto 6/ }).click()
  await page.getByRole('button', { name: 'Transferir' }).click()

  const destinationDialog = page.getByRole('dialog')
  await expect(destinationDialog.getByRole('heading', { name: 'Selecionar Leito de Destino' })).toBeVisible()
  await destinationDialog.getByText('CT-006-B', { exact: true }).click()
  await destinationDialog.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByRole('heading', { name: 'Confirmar Transferência de Leito' })).toBeVisible()
  await page.getByLabel(/Motivo da Transferência/i).fill('Transferência validada pelo smoke automatizado')
  await page.getByRole('button', { name: 'Confirmar Transferência' }).click()

  await expect(page.getByText('Transferência realizada com sucesso!')).toBeVisible()
})
