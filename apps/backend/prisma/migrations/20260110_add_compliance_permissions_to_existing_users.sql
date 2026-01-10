-- Migration: Add new compliance permissions to existing ADMINISTRATOR and TECHNICAL_MANAGER users
-- Created: 2026-01-10
-- Purpose: Grant VIEW_COMPLIANCE_DASHBOARD and VIEW_SENTINEL_EVENTS to existing admin/RT users

-- This migration adds the new compliance permissions to existing users with
-- ADMINISTRATOR or TECHNICAL_MANAGER position codes.
-- For new users, permissions are granted automatically via position-profiles.config.ts

-- Add VIEW_COMPLIANCE_DASHBOARD to all ADMINISTRATOR users
INSERT INTO user_permissions (
  id,
  "userProfileId",
  "tenantId",
  permission,
  "isGranted",
  "grantedBy",
  "grantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  up.id,
  u."tenantId",
  'VIEW_COMPLIANCE_DASHBOARD',
  true,
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_COMPLIANCE_DASHBOARD'
  );

-- Add VIEW_SENTINEL_EVENTS to all ADMINISTRATOR users
INSERT INTO user_permissions (
  id,
  "userProfileId",
  "tenantId",
  permission,
  "isGranted",
  "grantedBy",
  "grantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  up.id,
  u."tenantId",
  'VIEW_SENTINEL_EVENTS',
  true,
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_SENTINEL_EVENTS'
  );

-- Add VIEW_COMPLIANCE_DASHBOARD to all TECHNICAL_MANAGER users
INSERT INTO user_permissions (
  id,
  "userProfileId",
  "tenantId",
  permission,
  "isGranted",
  "grantedBy",
  "grantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  up.id,
  u."tenantId",
  'VIEW_COMPLIANCE_DASHBOARD',
  true,
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'TECHNICAL_MANAGER'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_COMPLIANCE_DASHBOARD'
  );

-- Add VIEW_SENTINEL_EVENTS to all TECHNICAL_MANAGER users
INSERT INTO user_permissions (
  id,
  "userProfileId",
  "tenantId",
  permission,
  "isGranted",
  "grantedBy",
  "grantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  up.id,
  u."tenantId",
  'VIEW_SENTINEL_EVENTS',
  true,
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'TECHNICAL_MANAGER'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_SENTINEL_EVENTS'
  );
