/**
 * Fixtures de Residents para testes
 */

import { Gender, CivilStatus, BloodType } from '@prisma/client';

export const mockResident = {
  id: 'resident-123',
  tenantId: 'tenant-test-123',
  fullName: 'Maria da Silva Santos',
  cpf: '12345678901',
  rg: '123456789',
  birthDate: new Date('1950-05-15'),
  gender: Gender.FEMININO,
  civilStatus: CivilStatus.VIUVO,
  bloodType: BloodType.A_POSITIVO,
  status: 'Ativo', // String, não enum
  admissionDate: new Date('2024-01-10'),
  dischargeDate: null,
  bedId: 'bed-123',
  photoUrl: null,
  createdAt: new Date('2024-01-10T00:00:00.000Z'),
  updatedAt: new Date('2024-01-10T00:00:00.000Z'),
  deletedAt: null,
};

export const mockResidentMale = {
  id: 'resident-456',
  tenantId: 'tenant-test-123',
  fullName: 'João Pedro Oliveira',
  cpf: '98765432100',
  rg: '987654321',
  birthDate: new Date('1945-08-20'),
  gender: Gender.MASCULINO,
  civilStatus: CivilStatus.CASADO,
  bloodType: BloodType.O_POSITIVO,
  status: 'Ativo',
  admissionDate: new Date('2024-02-01'),
  dischargeDate: null,
  bedId: 'bed-456',
  photoUrl: null,
  createdAt: new Date('2024-02-01T00:00:00.000Z'),
  updatedAt: new Date('2024-02-01T00:00:00.000Z'),
  deletedAt: null,
};

// Residente de outro tenant (para testes de isolamento)
export const mockResidentOtherTenant = {
  id: 'resident-other-999',
  tenantId: 'tenant-other-999',
  fullName: 'Ana Paula Costa',
  cpf: '11122233344',
  rg: '111222333',
  birthDate: new Date('1952-03-10'),
  gender: Gender.FEMININO,
  civilStatus: CivilStatus.SOLTEIRO,
  bloodType: BloodType.B_POSITIVO,
  status: 'Ativo',
  admissionDate: new Date('2024-01-05'),
  dischargeDate: null,
  bedId: 'bed-other-999',
  photoUrl: null,
  createdAt: new Date('2024-01-05T00:00:00.000Z'),
  updatedAt: new Date('2024-01-05T00:00:00.000Z'),
  deletedAt: null,
};

export const mockResidentInactive = {
  id: 'resident-inactive-111',
  tenantId: 'tenant-test-123',
  fullName: 'Carlos Eduardo Ferreira',
  cpf: '55566677788',
  rg: '555666777',
  birthDate: new Date('1948-11-25'),
  gender: Gender.MASCULINO,
  civilStatus: CivilStatus.DIVORCIADO,
  bloodType: BloodType.AB_POSITIVO,
  status: 'Inativo',
  admissionDate: new Date('2023-06-01'),
  dischargeDate: new Date('2024-03-15'),
  bedId: null,
  photoUrl: null,
  createdAt: new Date('2023-06-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-15T00:00:00.000Z'),
  deletedAt: null,
};
