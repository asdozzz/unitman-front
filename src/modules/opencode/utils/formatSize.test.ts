import { describe, expect, it } from 'vitest';
import { formatSize } from '@/modules/opencode/utils/formatSize';

describe('formatSize', () => {
  it('renders bytes below 1 KiB without a fractional part', () => {
    expect(formatSize(0)).toBe('0 Б');
    expect(formatSize(1)).toBe('1 Б');
    expect(formatSize(1023)).toBe('1023 Б');
  });

  it('switches to KiB at 1024 bytes with one decimal', () => {
    expect(formatSize(1024)).toBe('1.0 КБ');
    expect(formatSize(1536)).toBe('1.5 КБ');
  });

  it('switches to MiB at 1 MiB with one decimal', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 МБ');
    expect(formatSize(18432)).toBe('18.0 КБ');
  });

  it('falls back to zero for invalid input', () => {
    expect(formatSize(Number.NaN)).toBe('0 Б');
    expect(formatSize(-10)).toBe('0 Б');
  });
});
