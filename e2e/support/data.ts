/**
 * Фабрики тестовых данных.
 *
 * Формы объектов повторяют схемы бэкенда (`src/api/generated/unitman.d.ts`),
 * поэтому моки не расходятся с контрактом на уровне полей, которые читает UI.
 */

type Overrides = Record<string, unknown>;

/** Элемент списка юнитов (`UnitListItem`). */
export function unit(overrides: Overrides = {}) {
  return {
    authorId: "00000000-0000-4000-8000-000000000001",
    authorName: "admin@e2e.local",
    branch: "feature/e2e-1",
    commands: [],
    deistviya: [],
    error: false,
    id: "11111111-1111-4111-8111-111111111111",
    links: [],
    name: "feature/e2e-1",
    peremenie: [],
    projectId: "22222222-2222-4222-8222-222222222222",
    projectName: "E2E Project",
    prozesi: [],
    svyazi: [],
    namereniya: [],
    unitSozdanSystemoi: false,
    unixtimePoslednegoObnovleniyaUnita: 1_730_000_000,
    zapushen: false,
    ...overrides,
  };
}

/** Проект (`ProjectListItem`). */
export function project(overrides: Overrides = {}) {
  return {
    code: "e2e-project",
    id: "22222222-2222-4222-8222-222222222222",
    isActive: true,
    mainBranch: "main",
    memoryLimit: 3072,
    name: "E2E Project",
    nastroikiHukaProekta: {
      avtoobnovlenie: true,
      avtosozdanie: true,
      avtoudalenie: false,
      obnovlenieBezSbrosaPodgotovki: false,
      vebhukNastroen: true,
    },
    repoId: "33333333-3333-4333-8333-333333333333",
    state: "NEW",
    users: [],
    variables: [],
    waitResultRunner: false,
    zashishennieVetki: [],
    ...overrides,
  };
}

/** Репозиторий (`Repo`). */
export function repo(overrides: Overrides = {}) {
  return {
    confirmed: true,
    id: "33333333-3333-4333-8333-333333333333",
    name: "e2e-repo",
    repoUrl: "https://gitlab.example.com/group/e2e-repo.git",
    token: "***",
    type: "gitlab",
    ...overrides,
  };
}

/** Аккаунт для администрирования (`ManagedAccount`). */
export function account(overrides: Overrides = {}) {
  return {
    email: "user@e2e.local",
    id: "00000000-0000-4000-8000-000000000002",
    isBlocked: false,
    nickname: "E2E User",
    password: "",
    roles: "ROLE_USER",
    ...overrides,
  };
}

/** Строка статистики проекта (`ProjectStatistics`). */
export function projectStatistics(overrides: Overrides = {}) {
  return {
    active: 2,
    deleted: 1,
    projectId: "22222222-2222-4222-8222-222222222222",
    projectName: "E2E Project",
    total: 5,
    ...overrides,
  };
}

/** Снимок ресурсов раннера. */
export function runnerResources(overrides: Overrides = {}) {
  return {
    hostname: "runner-e2e-1.example.com",
    uptimeSeconds: 86_400,
    collectedAt: 1_730_000_000,
    cpu: {
      usagePercent: 12.5,
      cores: 8,
      load1: 0.5,
      load5: 0.4,
      load15: 0.3,
    },
    memory: {
      totalBytes: 8_589_934_592,
      usedBytes: 4_294_967_296,
      availableBytes: 4_294_967_296,
      usedPercent: 50,
      level: "ok",
    },
    disks: [
      {
        path: "/",
        totalBytes: 100_000_000_000,
        usedBytes: 50_000_000_000,
        availableBytes: 50_000_000_000,
        usedPercent: 50,
        level: "ok",
      },
    ],
    docker: {
      layersBytes: 1_024,
      containersBytes: 2_048,
      volumesBytes: 4_096,
      buildCacheBytes: 512,
      totalBytes: 7_680,
      reclaimableBytes: 256,
    },
    level: "ok",
    blocked: false,
    blockReason: null,
    ...overrides,
  };
}

/** Карточка раннера (`RannerKarta`). */
export function runner(overrides: Overrides = {}) {
  return {
    id: "runner-e2e-1",
    taskQueue: "runner-e2e-1",
    active: true,
    healthFresh: true,
    lastHealthAt: 1_730_000_000,
    level: "ok",
    blocked: false,
    blockReason: null,
    resources: runnerResources(),
    memoryInfo: null,
    publicAddress: "https://runner-e2e-1.example.com",
    registeredAt: 1_730_000_000,
    hasPublicAddress: true,
    ...overrides,
  };
}

/** Уведомление (`Uvedomlenie`). */
export function notification(overrides: Overrides = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    type: "unit_started",
    severity: "info",
    requiresRead: false,
    payload: {
      unitName: "feature/e2e-1",
      projectId: "22222222-2222-4222-8222-222222222222",
    },
    createdAt: 1_730_000_000,
    read: false,
    ...overrides,
  };
}

/** Карточка сессии AI-чата (`AiChatSession`). */
export function aiSession(overrides: Overrides = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    title: "E2E AI session",
    provider: "openai",
    model: "gpt-4o",
    archived: false,
    archiveReason: null,
    credentialDeleted: false,
    preview: "Привет, это e2e-сессия",
    createdAt: 1_730_000_000,
    updatedAt: 1_730_000_100,
    expiresAt: 1_730_086_400,
    messageCount: 2,
    ...overrides,
  };
}

/** Сессия OpenCode (`OpenCodeSession`). */
export function openCodeSession(overrides: Overrides = {}) {
  return {
    archived: false,
    archiveReason: null,
    createdAt: 1_730_000_000,
    credentialId: "66666666-6666-4666-8666-666666666666",
    externalSessionId: null,
    id: "77777777-7777-4777-8777-777777777777",
    ideLink: null,
    model: "gpt-4o",
    title: "E2E OpenCode session",
    type: "unit",
    unitId: "11111111-1111-4111-8111-111111111111",
    unitProjectId: "22222222-2222-4222-8222-222222222222",
    units: [
      {
        unitId: "11111111-1111-4111-8111-111111111111",
        unitProjectId: "22222222-2222-4222-8222-222222222222",
      },
    ],
    updatedAt: 1_730_000_100,
    workspace: null,
    ...overrides,
  };
}
