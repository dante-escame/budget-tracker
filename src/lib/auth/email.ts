import 'server-only';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toDisplayEmail(email: string): string {
  return email.trim();
}
