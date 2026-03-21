import { expect, test } from '@playwright/test'
import {
  baseUser,
  mockCommonAppApi,
  mockLogin,
  mockLogout,
  seedAuthenticatedSession,
} from './support/fixtures'

test('login via UI leva ao dashboard autenticado', async ({ page }) => {
  await mockCommonAppApi(page)
  await mockLogin(page)

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Email').fill(baseUser.email)
  await page.getByLabel('Senha').fill('Senha@123')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText(`Bem-vindo, ${baseUser.name.split(' ')[0]}!`)).toBeVisible()
})

test('logout pelo menu do usuário limpa a sessão e volta ao login', async ({ page }) => {
  await seedAuthenticatedSession(page)
  await mockCommonAppApi(page)
  await mockLogout(page)

  await page.goto('/dashboard/meu-perfil', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: baseUser.name }).click()
  await expect(page.getByRole('menu', { name: new RegExp(baseUser.name) })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Sair' }).click({ force: true })

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})
