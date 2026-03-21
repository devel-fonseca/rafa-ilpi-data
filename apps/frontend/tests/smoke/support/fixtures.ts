import type { Page, Route } from '@playwright/test'

const now = new Date('2026-03-21T12:00:00.000Z').toISOString()
const API_BASE = 'http://localhost:3000/api'

export const baseUser = {
  id: 'user-1',
  name: 'Patrícia Camargo',
  email: 'admin@ilpiteste.com.br',
  role: 'ADMIN',
  tenantId: 'tenant-1',
  passwordResetRequired: false,
  tenant: {
    id: 'tenant-1',
    name: 'Minha Casa de Repouso',
    status: 'ACTIVE',
    plan: 'PRO',
    profile: {
      tradeName: 'Minha Casa de Repouso',
    },
  },
  profile: {
    positionCode: null,
    profilePhoto: null,
    registrationType: null,
    registrationNumber: null,
    registrationState: null,
    isTechnicalManager: false,
    isNursingCoordinator: false,
    preferences: null,
  },
}

export const baseProfile = {
  id: 'profile-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  profilePhoto: null,
  phone: '(11) 99999-9999',
  positionCode: null,
  registrationType: null,
  registrationNumber: null,
  registrationState: null,
  department: null,
  birthDate: '1990-05-15T00:00:00.000Z',
  notes: 'Perfil inicial',
  createdAt: now,
  updatedAt: now,
  user: {
    id: 'user-1',
    name: 'Patrícia Camargo',
    email: 'admin@ilpiteste.com.br',
    role: 'ADMIN',
    isActive: true,
    cpf: '123.456.789-00',
  },
}

export const basePermissions = {
  inherited: [
    'VIEW_BEDS',
    'MANAGE_BEDS',
    'MANAGE_INFRASTRUCTURE',
    'VIEW_MESSAGES',
    'SEND_MESSAGES',
  ],
  custom: [],
  all: [
    'VIEW_BEDS',
    'MANAGE_BEDS',
    'MANAGE_INFRASTRUCTURE',
    'VIEW_MESSAGES',
    'SEND_MESSAGES',
  ],
}

export const baseFeatures = {
  plan: 'PRO',
  planType: 'PRO',
  features: {
    agenda: true,
    mapa_leitos: true,
    gestao_leitos: true,
    quartos: true,
    mensagens: true,
    relatorios: true,
  },
  subscribedFeatures: null,
  customOverrides: null,
  hasCustomizations: false,
  maxUsers: 100,
  maxResidents: 200,
  lastFetch: Date.now(),
}

export const bedsHierarchy = {
  buildings: [
    {
      id: 'building-1',
      name: 'Clínica 1',
      code: 'C',
      totalFloors: 1,
      totalRooms: 2,
      totalBeds: 4,
      occupiedBeds: 1,
      availableBeds: 3,
      createdAt: now,
      updatedAt: now,
      floors: [
        {
          id: 'floor-1',
          buildingId: 'building-1',
          name: 'Térreo',
          code: 'T',
          floorNumber: 0,
          description: null,
          roomsCount: 2,
          bedsCount: 4,
          occupiedBeds: 1,
          availableBeds: 3,
          createdAt: now,
          updatedAt: now,
          rooms: [
            {
              id: 'room-1',
              floorId: 'floor-1',
              name: 'Quarto 6',
              code: '006',
              roomNumber: '6',
              roomType: 'DUPLO',
              capacity: 2,
              totalBeds: 2,
              occupiedBeds: 1,
              availableBeds: 1,
              hasPrivateBathroom: false,
              accessible: true,
              createdAt: now,
              updatedAt: now,
              beds: [
                {
                  id: 'bed-occupied',
                  roomId: 'room-1',
                  code: 'CT-006-A',
                  status: 'Ocupado',
                  residentId: 'resident-1',
                  resident: {
                    id: 'resident-1',
                    fullName: 'Tiago Regufe de Souza',
                    fotoUrl: null,
                  },
                  occupiedSince: now,
                  createdAt: now,
                  updatedAt: now,
                },
                {
                  id: 'bed-available-1',
                  roomId: 'room-1',
                  code: 'CT-006-B',
                  status: 'Disponível',
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
            {
              id: 'room-2',
              floorId: 'floor-1',
              name: 'Quarto 7',
              code: '007',
              roomNumber: '7',
              roomType: 'TRIPLO',
              capacity: 2,
              totalBeds: 2,
              occupiedBeds: 0,
              availableBeds: 2,
              hasPrivateBathroom: false,
              accessible: true,
              createdAt: now,
              updatedAt: now,
              beds: [
                {
                  id: 'bed-available-2',
                  roomId: 'room-2',
                  code: 'CT-007-A',
                  status: 'Disponível',
                  createdAt: now,
                  updatedAt: now,
                },
                {
                  id: 'bed-available-3',
                  roomId: 'room-2',
                  code: 'CT-007-B',
                  status: 'Disponível',
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  stats: {
    totalBuildings: 1,
    totalFloors: 1,
    totalRooms: 2,
    totalBeds: 4,
    occupiedBeds: 1,
    availableBeds: 3,
  },
}

function persistedState(state: unknown) {
  return JSON.stringify({ state, version: 0 })
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

export async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript(
    ({ authState, featuresState, userId }) => {
      localStorage.setItem('rafa-ilpi-auth', authState)
      localStorage.setItem('rafa-ilpi-features', featuresState)
      localStorage.setItem(`rafa-cookie-consent-${userId}`, 'accepted')
      localStorage.setItem(`rafa-cookie-consent-date-${userId}`, new Date().toISOString())
    },
    {
      authState: persistedState({
        user: baseUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isAuthenticated: true,
      }),
      featuresState: persistedState(baseFeatures),
      userId: baseUser.id,
    }
  )
}

export async function mockCommonAppApi(
  page: Page,
  options?: {
    onProfilePatch?: (body: Record<string, unknown>) => unknown
    profileOverrides?: Record<string, unknown>
  }
) {
  const profile = { ...baseProfile, ...(options?.profileOverrides ?? {}) }

  await page.route(`${API_BASE}/tenants/me/features`, (route) => fulfillJson(route, baseFeatures))
  await page.route(`${API_BASE}/permissions/me`, (route) => fulfillJson(route, basePermissions))
  await page.route(`${API_BASE}/institutional-profile`, (route) =>
    fulfillJson(route, { profile: { logoUrl: null } })
  )
  await page.route(`${API_BASE}/tenant-profile/completion-status`, (route) =>
    fulfillJson(route, { isComplete: true })
  )
  await page.route(`${API_BASE}/notifications/unread/count**`, (route) =>
    fulfillJson(route, { count: 0 })
  )
  await page.route(`${API_BASE}/notifications**`, (route) =>
    fulfillJson(route, { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } })
  )
  await page.route(`${API_BASE}/messages/unread/count`, (route) => fulfillJson(route, { count: 0 }))
  await page.route(`${API_BASE}/messages/inbox**`, (route) =>
    fulfillJson(route, { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })
  )
  await page.route(`${API_BASE}/messages/stats`, (route) =>
    fulfillJson(route, { unread: 0, received: 0, sent: 0 })
  )
  await page.route(`${API_BASE}/resident-schedule/tasks/daily**`, (route) => fulfillJson(route, []))
  await page.route(`${API_BASE}/institutional-events**`, (route) => fulfillJson(route, []))
  await page.route(`${API_BASE}/user-profiles/me**`, (route) => fulfillJson(route, profile))
  await page.route(`${API_BASE}/user-profiles/user-1`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const requestBody = route.request().postDataJSON() as Record<string, unknown>
      const responseBody = options?.onProfilePatch?.(requestBody) ?? { ...profile, ...requestBody }
      await fulfillJson(route, responseBody)
      return
    }

    await fulfillJson(route, profile)
  })
}

export async function mockLogin(page: Page) {
  await page.route(`${API_BASE}/auth/login`, async (route) => {
    const body = route.request().postDataJSON() as { email?: string }

    await fulfillJson(route, {
      user: {
        ...baseUser,
        email: body.email ?? baseUser.email,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
  })
}

export async function mockLogout(page: Page) {
  await page.route(`${API_BASE}/auth/logout`, (route) => fulfillJson(route, { success: true }))
}

export async function mockSuccessfulRefresh(page: Page) {
  let refreshed = false

  await page.route(`${API_BASE}/user-profiles/me**`, async (route) => {
    if (!refreshed) {
      await fulfillJson(route, { message: 'Token expirado' }, 401)
      return
    }

    await fulfillJson(route, baseProfile)
  })

  await page.route(`${API_BASE}/auth/refresh`, (route) => {
    refreshed = true
    return fulfillJson(route, {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    })
  })
}

export async function mockBedsFlow(page: Page) {
  await page.route(`${API_BASE}/beds/map/full`, (route) => fulfillJson(route, bedsHierarchy))
  await page.route(`${API_BASE}/residents/resident-1/transfer-bed`, (route) =>
    fulfillJson(route, { success: true })
  )
}
