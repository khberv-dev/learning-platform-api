import { UserRole } from '@/core/user/enum/user-role.enum';

export interface AuthUser {
  id: string;
  role: UserRole;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
}

type OwnerColumn = 'student' | 'mentor' | 'admin';

const OWNER_COLUMN: Record<UserRole, OwnerColumn> = {
  [UserRole.STUDENT]: 'student',
  [UserRole.MENTOR]: 'mentor',
  [UserRole.ADMIN]: 'admin',
};

export function ownerColumn(role: UserRole): OwnerColumn {
  return OWNER_COLUMN[role];
}

export function ownerRef(user: Pick<AuthUser, 'id' | 'role'>): Partial<Record<OwnerColumn, { id: string }>> {
  return { [ownerColumn(user.role)]: { id: user.id } };
}

export function resolveOwnerId(row: {
  student?: { id: string } | null;
  mentor?: { id: string } | null;
  admin?: { id: string } | null;
}): string | null {
  return row.student?.id ?? row.mentor?.id ?? row.admin?.id ?? null;
}
