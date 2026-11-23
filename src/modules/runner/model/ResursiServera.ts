/**
 * Модели снимка ресурсов сервера раннера.
 *
 * Контракт совпадает с `HealthPayload.resources` раннера и ответом
 * `GET /api/runner/resources`: проценты и уровни считает раннер,
 * фронтенд только отображает.
 */

/** Уровень угрозы по потреблению ресурса. */
export type UrovenResursov = "ok" | "warning" | "critical" | "blocker";

/** Загрузка CPU и load average хоста. */
export type ResursCpu = {
  usagePercent: number;
  cores: number;
  load1: number;
  load5: number;
  load15: number;
};

/** Потребление оперативной памяти. */
export type ResursPamyati = {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  level: UrovenResursov;
};

/** Заполнение одного диска. */
export type ResursDiska = {
  path: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  level: UrovenResursov;
};

/** Занятое место Docker. */
export type ResursDocker = {
  layersBytes: number;
  containersBytes: number;
  volumesBytes: number;
  buildCacheBytes: number;
  totalBytes: number;
  reclaimableBytes: number;
};

/** Снимок ресурсов сервера. */
export type ResursiServera = {
  hostname: string;
  uptimeSeconds: number;
  collectedAt: number;
  cpu: ResursCpu;
  memory: ResursPamyati;
  disks: ResursDiska[];
  docker?: ResursDocker | null;
  level: UrovenResursov;
  blocked: boolean;
  blockReason?: string | null;
};

/** Состояние ресурсов раннера по умолчанию. */
export type SostoyanieResursovServera = {
  active: boolean;
  healthFresh: boolean;
  lastHealthAt: number;
  blocked: boolean;
  resources: ResursiServera | null;
};

/** Легаси-снимок `/proc/meminfo` (килобайты). */
export type ResursPamyatiLegacy = {
  totalAsKb: number;
  freeAsKb: number;
};

/** Карточка раннера в разделе «Раннеры» (только администраторы). */
export type RannerKarta = {
  id: string;
  taskQueue: string;
  active: boolean;
  healthFresh: boolean;
  lastHealthAt: number;
  level: UrovenResursov;
  blocked: boolean;
  blockReason?: string | null;
  resources: ResursiServera | null;
  /** Присутствует у старых раннеров без структурированного снимка ресурсов. */
  memoryInfo?: ResursPamyatiLegacy | null;
};

/** Краткая угроза по одному раннеру для шапки сайта. */
export type UgrozaRannera = {
  id: string;
  level: UrovenResursov;
  blocked: boolean;
  healthFresh: boolean;
};

/** Сводка угроз по раннерам для шапки сайта (доступна всем). */
export type UgrozyRannerov = {
  hasThreats: boolean;
  worstLevel: UrovenResursov;
  count: number;
  runners: UgrozaRannera[];
};
