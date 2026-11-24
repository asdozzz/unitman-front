/**
 * Клиентская валидация публичного адреса раннера.
 *
 * Повторяет правила бэкенда: абсолютный http/https URL, непустой host,
 * без userinfo (`user:pass@`). Окончательное решение всё равно за бэкендом.
 */

export type OshibkaPublicAddress =
  | "required"
  | "invalid"
  | "scheme"
  | "host"
  | "userinfo";

/** Возвращает код ошибки или `null`, если адрес корректен. */
export function proveritPublicAddress(
  value: string,
): OshibkaPublicAddress | null {
  const address = value.trim();

  if (address === "") {
    return "required";
  }

  let parsed: URL;

  try {
    parsed = new URL(address);
  } catch {
    return "invalid";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "scheme";
  }

  if (parsed.host === "") {
    return "host";
  }

  if (parsed.username !== "" || parsed.password !== "") {
    return "userinfo";
  }

  return null;
}
