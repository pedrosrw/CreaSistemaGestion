import { USER_ROLES, type UserRole } from "@/types/auth";
import type { AccessPolicy } from "./types";

export function buildAccessPolicy(readRoles: UserRole[], writeRoles: UserRole[]): AccessPolicy {
  const readSet = new Set<UserRole>([...readRoles, ...writeRoles]);
  const writeSet = new Set<UserRole>(writeRoles);

  return Object.fromEntries(
    USER_ROLES.map((role) => [
      role,
      {
        read: readSet.has(role),
        write: writeSet.has(role)
      }
    ])
  ) as AccessPolicy;
}
