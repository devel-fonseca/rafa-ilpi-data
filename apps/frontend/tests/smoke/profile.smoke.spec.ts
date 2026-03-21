import { expect, test } from '@playwright/test'
import {
  baseProfile,
  mockAuthenticatedSession,
  mockCommonAppApi,
  mockSuccessfulRefresh,
} from './support/fixtures'

test('renovação de sessão mantém o usuário no fluxo protegido', async ({ page }) => {
  await mockCommonAppApi(page)
  await mockSuccessfulRefresh(page)

  await page.goto('/dashboard/meu-perfil')

  await expect(page).toHaveURL(/\/dashboard\/meu-perfil$/)
  await expect(page.getByRole('heading', { name: 'Meu Perfil' })).toBeVisible()
})

test('edição do perfil salva dados pessoais com sucesso', async ({ page }) => {
  let lastPatchedProfile: Record<string, unknown> | null = null

  await mockAuthenticatedSession(page)
  await mockCommonAppApi(page, {
    onProfilePatch: (body) => {
      lastPatchedProfile = body

      return {
        ...baseProfile,
        phone: body.phone ?? baseProfile.phone,
        notes: body.notes ?? baseProfile.notes,
      }
    },
  })

  await page.goto('/dashboard/meu-perfil')
  await page.getByRole('tab', { name: 'Dados Pessoais' }).click()
  await page.getByLabel('Telefone').fill('(11) 98888-7777')
  await page.getByLabel('Notas / Observações').fill('Observação alterada pelo smoke test')
  await page.getByRole('button', { name: 'Salvar Alterações' }).click()

  await expect(page.getByLabel('Telefone')).toHaveValue('(11) 98888-7777')
  expect(lastPatchedProfile).toMatchObject({
    phone: '(11) 98888-7777',
    notes: 'Observação alterada pelo smoke test',
  })
})
