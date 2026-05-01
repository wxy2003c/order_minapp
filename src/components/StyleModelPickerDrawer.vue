<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-28 10:33:50
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-28 10:50:06
 * @FilePath: \vite-project\src\components\StyleModelPickerDrawer.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { NDrawer, NInput, NSpin } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { fetchStyleModels, type StyleCoverImage, type StyleModelItem } from '@/api/rolesApi'
import { openPhotoSwipeGallery } from '@/utils/photoswipeGallery'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import { t } from '@/i18n/uiI18n'
import TgButton from '@/components/TgButton.vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    /** 与页面结构一致：单片 / 双片 / 三片 / 越野，作为接口 `structure_type` */
    structureType: string
  }>(),
  {
    structureType: '',
  },
)

const emit = defineEmits<{
  'update:show': [v: boolean]
  confirm: [item: StyleModelItem]
}>()

const search = ref('')
const loading = ref(false)
const loadError = ref('')
const items = ref<StyleModelItem[]>([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = 10
const lastPage = ref(1)

const selectedId = ref<number | null>(null)
const pending = ref<StyleModelItem | null>(null)

const listScrollEl = ref<HTMLElement | null>(null)

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressSearchWatch = false
/** 避免多次 `loadPage` 并发：旧请求返回后覆盖列表或 `catch` 清空列表 */
let loadGeneration = 0

function coverSrc(path: string) {
  const u = String(path ?? '').trim()
  if (!u) return ''
  return resolveOrderAssetUrl(u) || u
}

async function loadPage(p: number) {
  const gen = ++loadGeneration
  const st = props.structureType.trim()
  if (!st) {
    if (gen === loadGeneration) {
      items.value = []
      totalCount.value = 0
      loading.value = false
      loadError.value = ''
    }
    return
  }
  const target = Math.max(1, p)
  loading.value = true
  loadError.value = ''
  try {
    const d = (await fetchStyleModels({
      structure_type: st,
      page: target,
      page_size: pageSize,
      search: search.value.trim() || undefined,
    })) as { items?: StyleModelItem[]; count?: number; page?: number; last_page?: number }
    if (gen !== loadGeneration) return
    items.value = d.items ?? []
    totalCount.value = d.count ?? d.items?.length ?? 0
    lastPage.value = Math.max(1, d.last_page ?? 1)
    page.value = d.page ?? target
  } catch (e) {
    if (gen !== loadGeneration) return
    loadError.value = e instanceof Error ? e.message : String(e)
    items.value = []
    totalCount.value = 0
  } finally {
    if (gen !== loadGeneration) return
    loading.value = false
    void nextTick(() => {
      listScrollEl.value?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }
}

function coverImagesForItem(it: StyleModelItem): StyleCoverImage[] {
  const list = it.cover_images
  if (Array.isArray(list) && list.length) {
    return list.filter((x) => String(x?.url ?? '').trim())
  }
  const c = String(it.cover_image ?? '').trim()
  return c ? [{ url: c }] : []
}

function openImagePreview(it: StyleModelItem) {
  const slides = coverImagesForItem(it)
  if (!slides.length) return
  const resolved = slides
    .map((s) => ({
      src: coverSrc(s.url),
      title: String(s.label ?? s.name ?? '').trim(),
    }))
    .filter((s) => s.src)
  if (!resolved.length) return
  const thumb = coverSrc(it.cover_image)
  let start = 0
  if (thumb && resolved.length > 1) {
    const i = resolved.findIndex((s) => s.src === thumb)
    if (i >= 0) start = i
  }
  void openPhotoSwipeGallery(resolved, start)
}

watch(
  () => [props.show, props.structureType] as const,
  ([open, st]) => {
    if (!open || !String(st).trim()) return
    selectedId.value = null
    pending.value = null
    suppressSearchWatch = true
    search.value = ''
    void nextTick(() => {
      suppressSearchWatch = false
    })
    void loadPage(1)
  },
)

watch(search, () => {
  if (suppressSearchWatch || !props.show || !props.structureType.trim()) return
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    if (!props.show || !props.structureType.trim()) return
    selectedId.value = null
    pending.value = null
    void loadPage(1)
  }, 350)
})

watch(
  () => props.show,
  (open) => {
    if (!open && searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  },
)

onBeforeUnmount(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})

function onClose() {
  emit('update:show', false)
}

function selectRow(it: StyleModelItem) {
  selectedId.value = it.id
  pending.value = it
}

function onConfirm() {
  if (!pending.value) return
  emit('confirm', pending.value)
  emit('update:show', false)
}

function totalLine(n: number) {
  return t('customOrder.wheelStyleTotal').replace(/\{n\}/g, String(n))
}

function spokeLine(n: number) {
  return t('customOrder.wheelStyleSpokeCount').replace(/\{n\}/g, String(n))
}

function pageIndicator() {
  return t('customOrder.wheelStylePageIndicator')
    .replace(/\{page\}/g, String(page.value))
    .replace(/\{total\}/g, String(lastPage.value))
}
</script>

<template>
  <NDrawer
    :show="show"
    :height="'88vh'"
    placement="bottom"
    :trap-focus="false"
    :block-scroll="true"
    @update:show="emit('update:show', $event)"
  >
    <div class="flex h-full flex-col bg-white text-[#1F2937]">
      <div class="shrink-0 border-b border-[#ECECEC] px-4 pb-3 pt-4">
        <div class="flex items-center justify-between gap-2">
          <div class="text-4 font-700">{{ t('customOrder.wheelStylePickerTitle') }}</div>
          <button
            type="button"
            class="rounded-lg p-1 text-[#6B7280]"
            aria-label="close"
            @click="onClose"
          >
            <Icon icon="lucide:x" width="22" height="22" />
          </button>
        </div>
        <div class="mt-3">
          <NInput
            v-model:value="search"
            :placeholder="t('customOrder.wheelStyleSearchPh')"
            clearable
            size="medium"
            class="rounded-xl"
          >
            <template #prefix>
              <Icon icon="lucide:search" width="18" height="18" class="text-[#9CA3AF]" />
            </template>
          </NInput>
        </div>
        <div class="mt-2 text-3 text-[#9CA3AF]">
          {{ totalLine(totalCount) }}
        </div>
      </div>

      <div ref="listScrollEl" class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div v-if="!structureType.trim()" class="py-10 text-center text-3.5 text-[#9CA3AF]">
          {{ t('customOrder.wheelStyleNeedStructure') }}
        </div>
        <NSpin v-else :show="loading" class="min-h-40 w-full">
          <div
            v-if="loadError"
            class="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3.25 text-[#B91C1C]"
          >
            {{ loadError }}
          </div>
          <div v-else-if="!loading && items.length === 0" class="py-10 text-center text-3.5 text-[#9CA3AF]">
            {{ t('customOrder.wheelStyleEmpty') }}
          </div>
          <div v-else class="space-y-3">
            <button
              v-for="it in items"
              :key="it.id"
              type="button"
              class="flex w-full gap-3 rounded-2xl border p-3 text-left transition"
              :class="
                selectedId === it.id
                  ? 'border-[#4478C8] bg-[#EFF5FF] shadow-[inset_0_0_0_1px_rgba(68,120,200,0.35)]'
                  : 'border-[#ECECEC] bg-white'
              "
              @click="selectRow(it)"
            >
              <div
                class="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#111111]"
                @click.stop>
                <template v-if="coverSrc(it.cover_image)">
                  <button
                    type="button"
                    class="relative block h-full w-full overflow-hidden text-left outline-none"
                    @click.stop="openImagePreview(it)">
                    <img
                      :src="coverSrc(it.cover_image)"
                      class="h-full w-full object-cover"
                      alt=""
                    />
                    <span
                      class="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/55 px-0.5 py-1 text-center text-[10px] leading-tight text-white">
                      {{ t('customOrder.wheelStyleMoreImages') }}
                    </span>
                  </button>
                </template>
                <div v-else class="flex h-full w-full items-center justify-center text-2.5 text-[#6B7280]">
                  —
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-3.75 font-700 text-[#4478C8]">{{ it.style_no }}</div>
                <div class="mt-1 truncate text-3 text-[#6B7280]">
                  {{ it.structure_type }} / {{ it.style_name }}
                </div>
                <div v-if="it.style_tags?.length" class="mt-1 line-clamp-2 text-2.75 text-[#9CA3AF]">
                  {{ it.style_tags.join(' · ') }}
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-if="it.spoke_type"
                    class="inline-flex rounded bg-[#4478C8] px-2 py-0.5 text-2.75 font-600 text-white"
                  >
                    {{ it.spoke_type }}
                  </span>
                  <span
                    v-if="it.spoke_count != null && it.spoke_count !== undefined"
                    class="inline-flex rounded bg-[#4478C8] px-2 py-0.5 text-2.75 font-600 text-white"
                  >
                    {{ spokeLine(it.spoke_count) }}
                  </span>
                  <span
                    v-if="it.directional"
                    class="inline-flex rounded bg-[#4478C8] px-2 py-0.5 text-2.75 font-600 text-white"
                  >
                    {{ t('customOrder.wheelStyleDirectional') }}
                  </span>
                </div>
              </div>
            </button>

            <div
              v-if="lastPage > 1"
              class="flex items-center justify-center gap-6 py-4">
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-3.5 font-600 text-[#4478C8] disabled:opacity-35"
                :disabled="page <= 1 || loading"
                @click="loadPage(page - 1)">
                {{ t('customOrder.wheelStylePrevPage') }}
              </button>
              <span class="text-3 text-[#6B7280]">{{ pageIndicator() }}</span>
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-3.5 font-600 text-[#4478C8] disabled:opacity-35"
                :disabled="page >= lastPage || loading"
                @click="loadPage(page + 1)">
                {{ t('customOrder.wheelStyleNextPage') }}
              </button>
            </div>
          </div>
        </NSpin>
      </div>

      <div class="shrink-0 border-t border-[#ECECEC] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div class="grid grid-cols-2 gap-3">
          <TgButton block variant="outline" type="button" @click="onClose">
            {{ t('common.cancel') }}
          </TgButton>
          <TgButton block variant="primary" type="button" :disabled="!pending" @click="onConfirm">
            {{ t('common.confirm') }}
          </TgButton>
        </div>
      </div>
    </div>

  </NDrawer>
</template>
