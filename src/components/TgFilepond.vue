<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { Icon } from '@iconify/vue'
import * as VueFilePondModule from 'vue-filepond'
import 'filepond/dist/filepond.min.css'
import FilePondPluginImageCrop from 'filepond-plugin-image-crop'
import FilePondPluginImageResize from 'filepond-plugin-image-resize'
import FilePondPluginImageFilter from 'filepond-plugin-image-filter'
import FilePondPluginImageTransform from 'filepond-plugin-image-transform'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css'
import type { PinturaEditorDefaultOptions } from '@pqina/pintura'

/**
 * Vite + CJS/ESM：`import * as VueFilePondModule from 'vue-filepond'` 后取真正的工厂函数。
 */
function resolveVueFilePondFactory(): (...plugins: unknown[]) => unknown {
  const mod = VueFilePondModule as unknown as Record<string, unknown>
  let cur: unknown = mod.default ?? mod

  for (let i = 0; i < 4; i += 1) {
    if (typeof cur === 'function') return cur as (...plugins: unknown[]) => unknown
    if (cur && typeof cur === 'object' && 'default' in (cur as object))
      cur = (cur as { default: unknown }).default
    else break
  }

  throw new TypeError(
    'vue-filepond: 无法解析为函数，请确认已安装 vue-filepond@7 与 filepond@4',
  )
}

/**
 * 插件顺序：裁剪 → 缩放 → **变换（把裁剪/缩放/滤镜落到真实像素）** → 滤镜 → 预览 → 编辑
 * @see https://pqina.nl/filepond/docs/api/plugins/image-transform/
 */
const FilePond = resolveVueFilePondFactory()(
  FilePondPluginImageCrop,
  FilePondPluginImageResize,
  FilePondPluginImageTransform,
  FilePondPluginImageFilter,
  FilePondPluginImagePreview,
) as import('vue').Component

const model = defineModel<File | null>({ default: null })

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    accept?: string
    size?: 'sm' | 'md' | 'lg'
    customClass?: string
    /** 与外壳一致的方框逻辑下，FilePond 仍允许多文件（一般保持 1） */
    maxFiles?: number
    /** 点击图片缩略图时全屏查看原图 */
    lightbox?: boolean
    /** accept 为图片时是否启用 FilePond 裁剪元数据（与预览联动） */
    allowImageCrop?: boolean
    /** 裁剪宽高比，如 1 为正方形；不传为自由比例 */
    imageCropAspectRatio?: number | null
    /** 是否启用缩放元数据（与预览联动；导出仍为原文件，除非另行接入 image-transform） */
    allowImageResize?: boolean
    imageResizeTargetWidth?: number | null
    imageResizeTargetHeight?: number | null
    imageResizeMode?: 'cover' | 'contain' | 'force'
    imageResizeUpscale?: boolean
    /** 客户端把裁剪/缩放/滤镜等写成最终图片（需配合 preparefile 写回 v-model，外壳预览/lightbox 才一致） */
    allowImageTransform?: boolean
    /** 输出 JPEG/PNG 质量 0–100，不设则走浏览器默认 */
    imageTransformOutputQuality?: number | null
    /** 输出 MIME，如 image/jpeg；不设则尽量沿用原图类型 */
    imageTransformOutputMimeType?: 'image/jpeg' | 'image/png' | null
    /** 是否启用颜色矩阵滤镜 */
    allowImageFilter?: boolean
    /**
     * 滤镜 color matrix（如怀旧、黑白等），结构见 FilePond Image Filter 文档
     * @see https://pqina.nl/filepond/docs/patterns/plugins/image-filter/
     */
    imageFilterColorMatrix?: number[] | null
    /**
     * 是否显示「编辑」并在点击时用 @pqina/pintura 打开默认编辑器（与隐藏 FilePond 并行，不依赖 filepond-plugin-image-edit）
     */
    usePinturaEditor?: boolean
    /** 传入 `openDefaultEditor` 的额外选项（会与 `getEditorDefaults()` 合并） */
    pinturaEditorOptions?: Partial<PinturaEditorDefaultOptions> & Record<string, unknown>
  }>(),
  {
    ariaLabel: '上传文件',
    accept: 'image/*',
    size: 'md',
    customClass: '',
    maxFiles: 1,
    lightbox: true,
    allowImageCrop: true,
    imageCropAspectRatio: null,
    allowImageResize: true,
    imageResizeTargetWidth: null,
    imageResizeTargetHeight: null,
    imageResizeMode: 'contain',
    imageResizeUpscale: false,
    allowImageTransform: true,
    imageTransformOutputQuality: null,
    imageTransformOutputMimeType: null,
    allowImageFilter: true,
    imageFilterColorMatrix: null,
    usePinturaEditor: true,
    pinturaEditorOptions: undefined,
  },
)

defineSlots<{
  placeholder?: () => unknown
}>()

const wrapperClass = computed(() => [
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D9DDE5] bg-[#CFCFD2] text-[#2A2C33] transition active:scale-[0.98] w-full h-full',
  props.size === 'sm' && 'min-w-[80px] min-h-[80px]',
  props.size === 'md' && 'min-w-[96px] min-h-[96px]',
  props.size === 'lg' && 'min-w-[112px] min-h-[112px]',
  props.customClass,
])

const pondRef = shallowRef<{
  getFiles: () => Array<{ file: File }>
  removeFiles: () => void
  browse?: () => void
} | null>(null)

const hiddenHostEl = useTemplateRef<HTMLElement>('hiddenHost')
const lightboxEl = useTemplateRef<HTMLElement>('lightbox')

const lightboxOpen = ref(false)
const pinturaBusy = ref(false)

watch(lightboxOpen, async (open) => {
  if (!open) return
  await nextTick()
  lightboxEl.value?.focus({ preventScroll: true })
})

type PondFileItem = { source: File; options: { type: 'local' } }

const pondFiles = ref<PondFileItem[]>([])
let syncingFromPond = false

watch(
  model,
  (file) => {
    if (syncingFromPond) return

    if (!file) {
      pondFiles.value = []
      nextTick(() => pondRef.value?.removeFiles?.())
      return
    }

    pondFiles.value = [{ source: file, options: { type: 'local' } }]
  },
  { immediate: true },
)

const previewUrl = ref('')

const isImageFile = computed(
  () => !!model.value && model.value.type.startsWith('image/'),
)

const isVideoFile = computed(
  () => !!model.value && model.value.type.startsWith('video/'),
)

/**
 * FilePond / vue-filepond 需要始终为 string[]，不能传 undefined，否则子组件 render 会访问未声明的 prop。
 * filepond-plugin-file-validate-type 用该列表做真实校验（仅靠 input accept 拦不住「所有文件」）。
 */
const acceptedFileTypes = computed((): string[] => {
  const raw = props.accept?.trim()
  if (!raw) return ['image/*']
  const list = raw.split(',').map(s => s.trim()).filter(Boolean)
  return list.length ? list : ['image/*']
})

/** 当前 accept 是否包含图片（用于关闭仅对图片有意义的插件） */
const imageToolkitActive = computed(() => {
  const a = props.accept?.toLowerCase() ?? ''
  return a.includes('image') || a === '*/*' || a === ''
})

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

watch(
  model,
  (file) => {
    revokePreview()
    if (file && file.type.startsWith('image/'))
      previewUrl.value = URL.createObjectURL(file)
  },
  { immediate: true },
)

function fileMatchesAcceptedTypes(file: File, patterns: string[]): boolean {
  const t = (file.type || '').toLowerCase()
  if (patterns.some(p => p === '*/*')) return true

  if (t) {
    return patterns.some((p) => {
      const x = p.toLowerCase()
      if (x === '*/*') return true
      if (x.endsWith('/*')) return t.startsWith(x.slice(0, -1))
      return t === x
    })
  }

  const name = file.name.toLowerCase()
  return patterns.some((p) => {
    if (p.startsWith('.')) return name.endsWith(p.toLowerCase())
    return false
  })
}

function onUpdateFiles() {
  const pond = pondRef.value
  if (!pond?.getFiles) return

  const files = pond.getFiles()
  syncingFromPond = true

  if (files.length === 0) {
    model.value = null
  }
  else {
    const f = files[0].file
    if (!fileMatchesAcceptedTypes(f, acceptedFileTypes.value)) {
      pond.removeFiles?.()
      pondFiles.value = []
      model.value = null
    }
    else {
      model.value = f
    }
  }

  nextTick(() => {
    syncingFromPond = false
  })
}

/** 变换完成后的 Blob → File，供 v-model 与缩略图/lightbox 使用 */
function outputBlobToFile(sourceName: string, output: Blob | File): File {
  if (output instanceof File) return output

  const extFromMime = output.type === 'image/png' ? 'png' : output.type === 'image/webp' ? 'webp' : 'jpg'
  const base = sourceName.replace(/\.[^.]+$/, '') || 'image'
  return new File([output], `${base}.${extFromMime}`, {
    type: output.type || 'image/jpeg',
    lastModified: Date.now(),
  })
}

/**
 * FilePond 在客户端变换完成后触发；此处用输出文件覆盖 model，外壳 img / Teleport 预览才会是变换后的图。
 * 不同版本 / 封装下回调参数可能是 (file, output) 或单对象，需做防御性解析。
 * @see https://pqina.nl/filepond/docs/api/plugins/image-transform/
 */
function onPrepareFile(first: unknown, second?: unknown) {
  if (!imageToolkitActive.value || !props.allowImageTransform) return

  let file: File | undefined
  let output: Blob | File | undefined

  if (first instanceof File) {
    file = first
    if (second instanceof Blob || second instanceof File) output = second
  }
  else if (first instanceof Blob && second instanceof File) {
    output = first
    file = second
  }
  else if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>
    if (o.file instanceof File) file = o.file
    const out = o.output ?? o.dest
    if (out instanceof Blob || out instanceof File) output = out as Blob | File
  }

  if (!file || !output) return
  if (!file.type?.startsWith('image/')) return

  const outFile = outputBlobToFile(file.name || 'image', output)

  syncingFromPond = true
  model.value = outFile
  pondFiles.value = [{ source: outFile, options: { type: 'local' } }]

  nextTick(() => {
    syncingFromPond = false
  })
}

function openBrowse() {
  const pond = pondRef.value
  if (pond && typeof pond.browse === 'function') {
    pond.browse()
    return
  }

  const input = hiddenHostEl.value?.querySelector('input[type="file"]') as HTMLInputElement | null
  input?.click()
}

function clearFile() {
  lightboxOpen.value = false
  model.value = null
  pondRef.value?.removeFiles?.()
}

function onShellClick() {
  if (props.lightbox && isImageFile.value && previewUrl.value) {
    lightboxOpen.value = true
    return
  }
  openBrowse()
}

function closeLightbox() {
  lightboxOpen.value = false
}

async function onPinturaEdit() {
  const f = model.value
  if (!f || !f.type.startsWith('image/') || pinturaBusy.value) return

  pinturaBusy.value = true
  try {
    const { openPinturaEditImage } = await import('@/lib/pinturaImageEditor')
    const next = await openPinturaEditImage(f, props.pinturaEditorOptions)
    if (!next) return

    syncingFromPond = true
    model.value = next
    pondFiles.value = [{ source: next, options: { type: 'local' } }]
    await nextTick()
    syncingFromPond = false
  }
  finally {
    pinturaBusy.value = false
  }
}

onBeforeUnmount(() => {
  revokePreview()
})
</script>

<template>
  <div class="inline-flex h-full w-full flex-col">
    <!-- 与 TgUpload 一致的外壳：预览、插槽、清除、更换；选文件走内部 FilePond -->
    <div class="relative inline-flex h-full w-full">
      <button
        type="button"
        :aria-label="ariaLabel"
        :class="wrapperClass"
        @click="onShellClick"
      >
        <img
          v-if="isImageFile && previewUrl"
          :src="previewUrl"
          alt=""
          class="h-full w-full cursor-zoom-in object-cover"
        >

        <div
          v-else-if="model && isVideoFile"
          class="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#e8eaef] px-2 text-[#4b5563]"
        >
          <Icon icon="mdi:file-video-outline" width="32" height="32" />
          <span class="line-clamp-2 text-center text-xs">已选择视频</span>
        </div>

        <div
          v-else-if="model"
          class="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#e8eaef] px-2 text-[#4b5563]"
        >
          <Icon icon="mdi:file-outline" width="32" height="32" />
          <span class="line-clamp-2 text-center text-xs">已选择文件</span>
        </div>

        <template v-else>
          <slot name="placeholder">
            <Icon icon="mdi:plus" width="28" height="28" />
          </slot>
        </template>
      </button>

      <button
        v-if="model"
        type="button"
        class="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
        @click.stop="clearFile"
      >
        <Icon icon="mdi:close" width="12" height="12" />
      </button>

      <button
        v-if="model && imageToolkitActive && usePinturaEditor && isImageFile"
        type="button"
        class="absolute bottom-2 left-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur-[2px] transition hover:bg-black/70 disabled:opacity-40"
        :disabled="pinturaBusy"
        @click.stop="onPinturaEdit"
      >
        编辑
      </button>

      <button
        v-if="model"
        type="button"
        class="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur-[2px] transition hover:bg-black/70"
        @click.stop="openBrowse"
      >
        更换
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxOpen && previewUrl && isImageFile"
        ref="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        tabindex="-1"
        class="fixed inset-0 z-[300] flex items-center justify-center bg-black/88 p-4 outline-none"
        @click.self="closeLightbox"
        @keydown.escape.prevent="closeLightbox"
      >
        <button
          type="button"
          class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
          aria-label="关闭预览"
          @click="closeLightbox"
        >
          <Icon icon="mdi:close" width="22" height="22" />
        </button>
        <img
          :src="previewUrl"
          alt=""
          class="max-h-[100dvh] max-w-full object-contain shadow-2xl"
          @click.stop
        >
      </div>
    </Teleport>

    <div
      ref="hiddenHost"
      class="tg-filepond-hidden-host fixed left-[-9999px] top-0 h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    >
      <FilePond
        ref="pondRef"
        name="file"
        class-name="tg-filepond-pond-inner"
        :allow-multiple="false"
        :max-files="maxFiles"
        :accepted-file-types="acceptedFileTypes"
        :instant-upload="false"
        :credits="false"
        :files="pondFiles"
        label-idle=" "
        :allow-image-crop="imageToolkitActive && allowImageCrop"
        :image-crop-aspect-ratio="imageCropAspectRatio ?? undefined"
        :allow-image-resize="imageToolkitActive && allowImageResize"
        :image-resize-target-width="imageResizeTargetWidth ?? undefined"
        :image-resize-target-height="imageResizeTargetHeight ?? undefined"
        :image-resize-mode="imageResizeMode"
        :image-resize-upscale="imageResizeUpscale"
        :allow-image-transform="imageToolkitActive && allowImageTransform"
        :image-transform-output-quality="imageTransformOutputQuality ?? undefined"
        :image-transform-output-mime-type="imageTransformOutputMimeType ?? undefined"
        :allow-image-filter="imageToolkitActive && allowImageFilter"
        :image-filter-color-matrix="imageFilterColorMatrix ?? undefined"
        @updatefiles="onUpdateFiles"
        @preparefile="onPrepareFile"
      />
    </div>
  </div>
</template>

<style scoped>
/* 隐藏宿主内仍加载 FilePond 样式，避免内部 item 布局撑破（保持 1px 视口） */
.tg-filepond-hidden-host :deep(.filepond--root) {
  max-height: 1px;
  max-width: 1px;
  margin: 0;
  overflow: hidden;
}
</style>
