import { PositionCode, RegistrationType, PermissionType } from './permissions';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  tenantId: string;
  profilePhoto?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  birthDate?: string | null;
  notes?: string | null;

  // ILPI Permissions Fields
  positionCode?: PositionCode | null;
  registrationType?: RegistrationType | null;
  registrationNumber?: string | null;
  registrationState?: string | null;
  isTechnicalManager?: boolean;
  isNursingCoordinator?: boolean;

  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;

  // Relations
  user?: User;
}

export interface UserWithProfile extends User {
  profile?: UserProfile | null;
}

export interface CustomPermission {
  id: string;
  userId: string;
  tenantId: string;
  permission: PermissionType;
  createdAt: string;
  createdBy: string;
}

export interface UserPermissions {
  inherited: PermissionType[]; // Permissões do cargo (PositionCode)
  custom: PermissionType[]; // Permissões customizadas
  all: PermissionType[]; // União de inherited + custom
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  sendInviteEmail?: boolean;
  temporaryPassword?: string;
}

export interface CreateUserProfileRequest {
  profilePhoto?: string;
  phone?: string;
  position?: string;
  department?: string;
  birthDate?: string;
  notes?: string;
  positionCode?: PositionCode;
  registrationType?: RegistrationType;
  registrationNumber?: string;
  registrationState?: string;
  isTechnicalManager?: boolean;
  isNursingCoordinator?: boolean;
}

export interface UpdateUserProfileRequest extends Partial<CreateUserProfileRequest> {}

export interface ManageCustomPermissionsRequest {
  add?: PermissionType[];
  remove?: PermissionType[];
}
