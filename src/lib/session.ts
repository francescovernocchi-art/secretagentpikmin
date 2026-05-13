export type Role = "papa" | "lorenzo";

const KEY = "pikmin.session.v1";

export interface Session {
  role: Role;
  name: string;
  loggedAt: number;
}

// PIN segreti famiglia. Cambia in produzione.
export const PINS: Record<string, { role: Role; name: string }> = {
  "0077": { role: "papa", name: "Papà" },
  "1234": { role: "lorenzo", name: "Lorenzo" },
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function loginWithPin(pin: string): Session | null {
  const found = PINS[pin];
  if (!found) return null;
  const session: Session = { ...found, loggedAt: Date.now() };
  setSession(session);
  return session;
}
