// src/lib/auth/permissions.ts

import { USER_ROLES } from '@/types/admin';

/**
 * ユーザーが管理者かどうかをチェック
 */
export const isAdmin = (roleId: number): boolean => {
  return roleId === USER_ROLES.ADMIN;
};

/**
 * ユーザーが一般ユーザー以上の権限を持つかチェック
 */
export const isUserOrAbove = (roleId: number): boolean => {
  return roleId === USER_ROLES.ADMIN || roleId === USER_ROLES.USER;
};

/**
 * 特定の権限を持つかチェック
 */
export const hasRole = (roleId: number, requiredRole: number): boolean => {
  return roleId === requiredRole;
};

/**
 * 指定された権限のいずれかを持つかチェック
 */
export const hasAnyRole = (roleId: number, requiredRoles: number[]): boolean => {
  return requiredRoles.includes(roleId);
};

/**
 * 権限レベルをチェック（数値が小さいほど権限が高い）
 */
export const hasMinimumRole = (roleId: number, minimumRoleId: number): boolean => {
  return roleId <= minimumRoleId;
};