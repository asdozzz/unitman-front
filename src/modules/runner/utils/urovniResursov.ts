import type { GhLabelVariant, OcticonName } from "@/components/ui";
import type { UrovenResursov } from "@/modules/runner/model/ResursiServera";

/** Вариант бейджа для уровня угрозы. */
export const VARIANT_UROVNYA: Record<UrovenResursov, GhLabelVariant> = {
  ok: "success",
  warning: "attention",
  critical: "danger",
  blocker: "danger",
};

/** Иконка для уровня угрозы. */
export const IKONKA_UROVNYA: Record<UrovenResursov, OcticonName> = {
  ok: "check-circle",
  warning: "alert",
  critical: "stop",
  blocker: "no-entry",
};

/**
 * Уровень по проценту потребления (те же пороги, что на раннере).
 * Используется для CPU — он не влияет на блокировку, но подсвечивается.
 */
export function urovenPoProcentu(percent: number): UrovenResursov {
  if (!Number.isFinite(percent)) {
    return "ok";
  }
  if (percent >= 90) {
    return "blocker";
  }
  if (percent >= 85) {
    return "critical";
  }
  if (percent >= 70) {
    return "warning";
  }

  return "ok";
}

/** Байты в двоичные единицы (B/KiB/MiB/GiB/TiB/PiB). */
export function formatirovatBayty(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  const rounded = index === 0 ? Math.round(size) : Math.round(size * 10) / 10;

  return `${rounded} ${units[index]}`;
}
