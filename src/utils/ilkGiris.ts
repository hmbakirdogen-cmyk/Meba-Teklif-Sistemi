export function ilkGirisGerekli(kullanici: { mustChangePassword?: boolean; profilFotoUrl?: string } | null): boolean {
  if (!kullanici) return false;
  if (kullanici.mustChangePassword) return true;
  if (!kullanici.profilFotoUrl) return true;
  return false;
}
