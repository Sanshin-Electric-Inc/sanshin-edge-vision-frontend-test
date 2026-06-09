// types/auth.ts
export interface Tenant {
  tenant_id: string;
  tenant_name: string;
  created_at: string;
}

export interface AuthUser {
  id: bigint;
  tenant_id: string;
  name: string;
  email: string;
  role_id: number;
  is_super_admin: boolean;
  created_at: string;
  tenant: Tenant;
  permissions: string[];
}