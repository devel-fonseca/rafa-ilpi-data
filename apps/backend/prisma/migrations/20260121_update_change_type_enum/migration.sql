-- Migration: Adicionar novos valores ao enum ChangeType
-- Data: 2026-01-21
-- Descrição: Adiciona valores específicos para versionamento de plantões (shifts)

-- Adicionar novos valores ao enum ChangeType
ALTER TYPE "ChangeType" ADD VALUE IF NOT EXISTS 'TEAM_ASSIGNMENT';
ALTER TYPE "ChangeType" ADD VALUE IF NOT EXISTS 'TEAM_SUBSTITUTION';
ALTER TYPE "ChangeType" ADD VALUE IF NOT EXISTS 'MEMBER_SUBSTITUTION';
ALTER TYPE "ChangeType" ADD VALUE IF NOT EXISTS 'MEMBER_ADDITION';
ALTER TYPE "ChangeType" ADD VALUE IF NOT EXISTS 'MEMBER_REMOVAL';
