import octicons from "@primer/octicons";

/**
 * Имена иконок @primer/octicons.
 *
 * Пакет отдаёт единственный default-экспорт — объект из 408 иконок, у каждой
 * есть `name` и `toSVG()`. Тип выводится из ключей этого объекта, поэтому
 * неверное имя иконки ловится на этапе `vue-tsc`.
 */
export type OcticonName = keyof typeof octicons;

/** Размеры контролов: 28 / 32 / 40 px. */
export type GhControlSize = "sm" | "md" | "lg";

export type GhButtonVariant = "default" | "primary" | "danger" | "invisible";

export type GhLabelVariant =
  | "accent"
  | "success"
  | "danger"
  | "attention"
  | "neutral";

export type GhCounterVariant = "default" | "accent" | "primary";

export type GhTableAlign = "left" | "center" | "right";

/** Пункт навигационных вкладок GhUnderlineNav. */
export type GhNavItem = {
  name: string;
  label: string;
  icon?: OcticonName;
  count?: number;
  disabled?: boolean;
};

/** Пункт выпадающего меню GhActionMenu. */
export type GhActionMenuItem = {
  id: string;
  label: string;
  icon?: OcticonName;
  danger?: boolean;
  disabled?: boolean;
  /** Показать тонкий разделитель перед пунктом. */
  separatorBefore?: boolean;
};

/**
 * Колонка GhTable.
 *
 * Поле можно задать строкой (ключ строки) или функцией доступа, чтобы
 * компонент не зависел от внутренней формы данных.
 */
export type GhTableColumn<T extends Record<string, unknown>> = {
  name: string;
  label: string;
  field?: (keyof T & string) | ((row: T) => unknown);
  align?: GhTableAlign;
  sortable?: boolean;
  format?: (value: unknown, row: T) => string;
  headerStyle?: string;
  style?: string;
};

/** Пункт вертикальной навигации GhSideNav. */
export type GhSideNavItem = {
  id: string;
  label: string;
  icon?: OcticonName;
  to?: string;
  counter?: number | null;
  disabled?: boolean;
};

/** Группа пунктов GhSideNav. */
export type GhSideNavGroup = {
  id: string;
  label?: string;
  items: GhSideNavItem[];
};

/** Публичные props GhCheckbox. */
export type GhCheckboxProps = {
  modelValue?: boolean;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Промежуточное состояние (dash вместо галочки). */
  indeterminate?: boolean;
  ariaLabel?: string;
};

/** Опция GhSelect. */
export type GhSelectOption = {
  value: string | number | null;
  label: string;
  description?: string;
};

/** Опция GhSegmentedControl. */
export type GhSegmentedOption = {
  value: string;
  label?: string;
  icon?: OcticonName;
};

export type GhBannerVariant = "accent" | "success" | "attention" | "danger";

export type GhSkeletonVariant = "text" | "circle" | "rect";

export type GhSkeletonAnimation = "wave" | "pulse" | "none";
