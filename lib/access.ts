import type { Role } from "./types";

/** Qaysi rol qaysi sahifalarni ochishi mumkin (mijoz tomonida yo'naltirish uchun;
 *  haqiqiy himoya API'da — qarang lib/auth.ts). */
export const ACCESS: Record<Role, string[]> = {
  admin: ["/pos", "/orders", "/kassa", "/kitchen", "/admin", "/print"],
  cashier: ["/pos", "/orders", "/kassa", "/kitchen", "/print"],
  waiter: ["/pos", "/orders", "/print"],
  cook: ["/kitchen", "/print"],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  cashier: "Kassir",
  waiter: "Ofitsiant",
  cook: "Oshpaz",
};

export function canOpen(role: Role, path: string): boolean {
  return ACCESS[role].some((p) => path === p || path.startsWith(p + "/"));
}

export function homeFor(role: Role): string {
  return role === "cook" ? "/kitchen" : "/pos";
}
