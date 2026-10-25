// ponytail: mapa en memoria, por proceso; si hay más de una instancia, pasar a un almacén compartido
const attempts = new Map<string, { count: number; firstAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function checkLoginAllowed(correo: string): boolean {
  const key = correo.toLowerCase();
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    return true;
  }
  return entry.count < MAX_ATTEMPTS;
}

export function recordFailedLogin(correo: string): void {
  const key = correo.toLowerCase();
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(correo: string): void {
  attempts.delete(correo.toLowerCase());
}
