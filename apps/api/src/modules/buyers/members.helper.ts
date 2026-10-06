import { ErrorCode, type MemberDto, type UserType } from '@tawreed/contracts';
import { AppError } from '../../common/http/app-error.js';
import type { Tx } from '../../infrastructure/prisma/prisma.service.js';

/** Finds or creates a user for an invitation, enforcing one user type per phone. */
export async function findOrCreateInvitee(tx: Tx, input: { name: string; phone: string; type: UserType }) {
  const existing = await tx.user.findUnique({ where: { phone: input.phone } });
  if (existing) {
    if (existing.type !== input.type) throw AppError.conflict(ErrorCode.ACCOUNT_TYPE_MISMATCH);
    return existing;
  }
  return tx.user.create({ data: { type: input.type, name: input.name, phone: input.phone } });
}

export function memberDto(
  m: { id: string; userId: string; role: string; status: string; createdAt: Date; user: { name: string; phone: string | null; email: string | null; lastLoginAt: Date | null } },
  currentUserId: string,
): MemberDto {
  return {
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    phone: m.user.phone,
    email: m.user.email,
    role: m.role as MemberDto['role'],
    status: m.status as MemberDto['status'],
    lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    isYou: m.userId === currentUserId,
  };
}
