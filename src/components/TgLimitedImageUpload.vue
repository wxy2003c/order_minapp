<script setup lang="ts">
/**
 * 多图上传：仅一个「追加」Filepond 槽位；已达上限后隐藏。
 * 每张已传图单独一个 `TgFilepond`，沿用其 **Pintura 编辑 / 替换 / 内置 lightbox**，与单图上传行为一致。
 */
import { computed, nextTick, ref, watch } from 'vue'
import TgFilepond from '@/components/TgFilepond.vue'
import { t } from '@/i18n/uiI18n'

const urls = defineModel<string[]>('urls', { default: () => [] })
const files = defineModel<(File | null)[]>('files', { default: () => [] })

const props = withDefaults(
  defineProps<{
    /** 最多上传张数；达到后上传入口隐藏 */
    limit: number
    uploadFormFields?: Record<string, string>
    accept?: string
    ariaLabelPrefix?: string
    /** 是否显示「已传 / 上限」 */
    showCount?: boolean
  }>(),
  {
    accept: 'image/*',
    ariaLabelPrefix: 'upload',
    showCount: true,
  },
)

const cap = computed(() => Math.max(1, Number(props.limit) || 1))

const pendingFile = ref<File | null>(null)
const pendingUrl = ref('')
const pondKey = ref(0)

/** 稳定 key，避免删改行时 FilePond 实例错绑 */
const slotKeys = ref<string[]>([])

const filled = computed(() => urls.value.length)
const canAdd = computed(() => filled.value < cap.value)

const countLabel = computed(() =>
  t('common.imageUploadCount')
    .replace(/\{n\}/g, String(filled.value))
    .replace(/\{max\}/g, String(cap.value)),
)

function makeSlotKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

watch(
  () => urls.value.length,
  (len) => {
    if (slotKeys.value.length < len) {
      while (slotKeys.value.length < len)
        slotKeys.value.push(makeSlotKey())
    }
    else if (slotKeys.value.length > len) {
      slotKeys.value = slotKeys.value.slice(0, len)
    }
  },
  { immediate: true },
)

/** 与 urls 对齐长度，避免详情回填仅有 URL 时越界 */
watch(
  urls,
  (u) => {
    if (files.value.length === u.length) return
    files.value = u.map((_, i) => files.value[i] ?? null)
  },
  { deep: true },
)

watch(pendingUrl, async (u) => {
  const s = String(u ?? '').trim()
  if (!s) return
  if (urls.value.length >= cap.value) {
    pendingFile.value = null
    pendingUrl.value = ''
    pondKey.value += 1
    return
  }
  const f = pendingFile.value
  urls.value = [...urls.value, s]
  files.value = [...files.value, f]
  await nextTick()
  pendingFile.value = null
  pendingUrl.value = ''
  pondKey.value += 1
})

function removeAt(i: number) {
  if (i < 0 || i >= urls.value.length) return
  urls.value = urls.value.filter((_, j) => j !== i)
  files.value = files.value.filter((_, j) => j !== i)
}

function tryRemoveEmptySlot(i: number) {
  if (i < 0 || i >= urls.value.length) return
  const u = String(urls.value[i] ?? '').trim()
  const f = files.value[i] ?? null
  if (!u && !f) removeAt(i)
}

function onSlotFileUpdate(i: number, f: File | null) {
  const nf = [...files.value]
  nf[i] = f
  files.value = nf
  void nextTick(() => tryRemoveEmptySlot(i))
}

function onSlotUrlUpdate(i: number, u: string) {
  const nu = [...urls.value]
  nu[i] = u
  urls.value = nu
  void nextTick(() => tryRemoveEmptySlot(i))
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p v-if="showCount" class="text-2.75 tabular-nums text-[#9CA3AF]">
      {{ countLabel }}
    </p>
    <div class="flex flex-wrap items-start gap-3">
      <div
        v-for="(_, i) in urls"
        :key="slotKeys[i] ?? i"
        class="h-26 w-26 shrink-0"
      >
        <TgFilepond
          :model-value="files[i] ?? null"
          :uploaded-url="urls[i] ?? ''"
          :upload-form-fields="uploadFormFields"
          :accept="accept"
          :aria-label="`${ariaLabelPrefix} ${i + 1} / ${cap}`"
          @update:model-value="onSlotFileUpdate(i, $event)"
          @update:uploaded-url="onSlotUrlUpdate(i, $event)"
        />
      </div>
      <div v-if="canAdd" class="h-26 w-26 shrink-0">
        <TgFilepond
          :key="pondKey"
          v-model="pendingFile"
          v-model:uploaded-url="pendingUrl"
          :upload-form-fields="uploadFormFields"
          :accept="accept"
          :aria-label="`${ariaLabelPrefix} ${filled + 1} / ${cap}`"
        />
      </div>
    </div>
  </div>
</template>
