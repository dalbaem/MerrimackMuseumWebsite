import type { AppRole } from "@/shared/types/user";

export interface UserRecord {
  id: number;
  email: string;
  role: AppRole;
}
