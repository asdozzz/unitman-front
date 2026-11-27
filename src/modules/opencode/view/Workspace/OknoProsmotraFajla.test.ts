import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import type { WorkspaceAttachment } from '@/modules/opencode/model/WorkspaceSession';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('@/bootstrap/apiClient', () => ({
  default: {
    post: mocks.post,
    get: vi.fn(),
  },
}));

import OknoProsmotraFajla from '@/modules/opencode/view/Workspace/OknoProsmotraFajla.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  messages: {
    ru: {
      opencode: {
        workspace: {
          chat: {
            preview: 'Предпросмотр',
            download: 'Скачать',
            preview_loading: 'Загрузка файла…',
            preview_error: 'Не удалось открыть файл',
            preview_unsupported: 'Предпросмотр недоступен',
            preview_too_large: 'Файл слишком большой для предпросмотра',
            download_error: 'Не удалось скачать файл',
            preview_binary: 'Файл не является текстом',
          },
        },
      },
    },
  },
});

const stubs = {
  GhDialog: {
    props: ['modelValue', 'title', 'width'],
    template: '<div class="gh-dialog-stub"><slot /><slot name="footer" /></div>',
  },
  GhBanner: {
    props: ['variant'],
    template: '<div class="gh-banner-stub" :data-variant="variant"><slot /></div>',
  },
  GhSkeleton: {
    template: '<div class="gh-skeleton-stub" />',
  },
  GhButton: {
    props: ['label', 'icon', 'ariaLabel', 'loading'],
    emits: ['click'],
    template: '<button class="gh-button-stub" :data-icon="icon" @click="$emit(\'click\')">{{ label }}</button>',
  },
  GhIcon: {
    template: '<span class="gh-icon-stub" />',
  },
};

function vlozhenie(name: string, contentType = 'text/markdown'): WorkspaceAttachment {
  return {
    FileId: 'file-1',
    Name: name,
    Size: 1024,
    ContentType: contentType,
    Previewable: true,
  };
}

function smontirovat(attachment: WorkspaceAttachment) {
  return mount(OknoProsmotraFajla, {
    props: {
      modelValue: true,
      turnId: 'turn-1',
      attachment,
    },
    global: {
      plugins: [i18n],
      stubs,
    },
  });
}

function uspeh(content: string) {
  mocks.post.mockResolvedValue({
    status: 'success',
    data: { fileId: 'file-1', name: 'file', contentType: 'text/plain', content },
  });
}

describe('OknoProsmotraFajla', () => {
  beforeEach(() => {
    mocks.post.mockReset();
  });

  it('показывает skeleton, пока текст загружается', () => {
    mocks.post.mockReturnValue(new Promise(() => undefined));

    const wrapper = smontirovat(vlozhenie('notes.txt', 'text/plain'));

    expect(wrapper.find('.gh-skeleton-stub').exists()).toBe(true);
    expect(wrapper.find('.gh-banner-stub').exists()).toBe(false);
  });

  it('рендерит markdown-заголовки, списки и код', async () => {
    uspeh('# Заголовок\n\n- один\n- два\n\n```\nconst x = 1;\n```');

    const wrapper = smontirovat(vlozhenie('plan.md'));
    await flushPromises();

    expect(wrapper.find('.okno-prosmotra__markdown h1').exists()).toBe(true);
    expect(wrapper.find('.okno-prosmotra__markdown ul').exists()).toBe(true);
    expect(wrapper.find('.okno-prosmotra__markdown pre code').exists()).toBe(true);
  });

  it('вычищает script, onerror, iframe и img', async () => {
    uspeh([
      '<script>window.__x = 1</script>',
      '<iframe src="https://example.com"></iframe>',
      '<img src="x" onerror="window.__x = 2">',
      '<a href="https://example.com" onclick="window.__x = 3">link</a>',
    ].join('\n'));

    const wrapper = smontirovat(vlozhenie('plan.md'));
    await flushPromises();

    const html = wrapper.html();

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(wrapper.find('.okno-prosmotra__markdown a').attributes('target')).toBe('_blank');
    expect(wrapper.find('.okno-prosmotra__markdown a').attributes('rel')).toBe('noopener noreferrer');
  });

  it('рендерит текст в <pre> и не интерпретирует HTML', async () => {
    uspeh('<b>bold</b>');

    const wrapper = smontirovat(vlozhenie('notes.txt', 'text/plain'));
    await flushPromises();

    const pre = wrapper.find('.okno-prosmotra__text');

    expect(pre.exists()).toBe(true);
    expect(pre.text()).toBe('<b>bold</b>');
    expect(pre.find('b').exists()).toBe(false);
  });

  it('показывает banner ошибки и оставляет кнопку скачивания', async () => {
    mocks.post.mockResolvedValue({
      status: 'fail',
      data: { message: 'opencode.artifact.preview_unsupported' },
    });

    const wrapper = smontirovat(vlozhenie('plan.md'));
    await flushPromises();

    expect(wrapper.find('.gh-banner-stub').text()).toBe('Предпросмотр недоступен');
    expect(wrapper.find('.gh-button-stub[data-icon="download"]').exists()).toBe(true);
  });

  it('маппит preview_too_large на отдельное сообщение', async () => {
    mocks.post.mockResolvedValue({
      status: 'fail',
      data: { message: 'preview_too_large' },
    });

    const wrapper = smontirovat(vlozhenie('plan.md'));
    await flushPromises();

    expect(wrapper.find('.gh-banner-stub').text()).toBe('Файл слишком большой для предпросмотра');
  });
});
