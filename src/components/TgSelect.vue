<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NDrawer, NInput } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { t } from '@/i18n/uiI18n'

interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue?: string | number
  options?: SelectOption[]
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
}>(), {
  placeholder: '请选择',
  searchable: true,
  disabled: false,
  options: () => [
    { value: 1, label: 'Apple' },
    { value: 2, label: 'Banana' },
    { value: 3, label: 'Blueberry' },
  ],
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined]
}>()

const sheetOpen = ref(false)
const sheetSearch = ref('')

const inner = ref<string | number | null>(null)

function resolveValue(v: string | number | undefined) {
  if (v === undefined || v === null)
    return null
  const found = props.options?.find(o => String(o.value) === String(v))
  return found ? found.value : null
}

watch(
  [() => props.modelValue, () => props.options],
  () => {
    inner.value = resolveValue(props.modelValue) as string | number | null
  },
  { immediate: true, deep: true },
)

const nOptions = computed(() => props.options ?? [])

const displayLabel = computed(() => {
  const v = inner.value
  if (v === null || v === undefined) return ''
  const o = nOptions.value.find(x => String(x.value) === String(v))
  return o?.label ?? ''
})

const filteredOptions = computed(() => {
  const q = sheetSearch.value.trim().toLowerCase()
  if (!q || !props.searchable)
    return nOptions.value
  return nOptions.value.filter(o => String(o.label).toLowerCase().includes(q))
})

function emitValue(v: string | number | null | undefined) {
  inner.value = v ?? null
  if (v === null || v === undefined)
    emit('update:modelValue', undefined)
  else
    emit('update:modelValue', v)
}

function openSheet() {
  if (props.disabled) return
  sheetSearch.value = ''
  sheetOpen.value = true
}

function closeSheet() {
  sheetOpen.value = false
  sheetSearch.value = ''
}

function pickOption(v: string | number) {
  emitValue(v)
  closeSheet()
}

function onClear(e: Event) {
  e.stopPropagation()
  if (props.disabled) return
  emitValue(null)
}

function onSheetShowUpdate(v: boolean) {
  sheetOpen.value = v
  if (!v) sheetSearch.value = ''
}
</script>

<template>
  <div class="tg-select relative w-full">
    <button
      type="button"
      class="tg-select-trigger flex w-full min-h-[34px] items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--tg-theme-section-separator-color)_60%,transparent)] bg-[var(--tg-theme-secondary-bg-color)] py-1.5 pl-3 text-left transition-opacity"
      :disabled="disabled"
      :class="[
        disabled ? 'cursor-not-allowed opacity-60' : 'active:opacity-90',
        displayLabel && !disabled ? 'pr-24' : 'pr-9',
      ]"
      @click="openSheet"
    >
      <span
        class="min-w-0 flex-1 truncate text-[15px] font-600 leading-snug"
        :style="{
          color: displayLabel
            ? 'var(--tg-theme-link-color)'
            : 'var(--tg-theme-hint-color)',
        }"
      >
        {{ displayLabel || placeholder }}
      </span>
      <Icon icon="lucide:chevron-down" width="18" height="18" class="pointer-events-none absolute right-2.5 top-1/2 shrink-0 -translate-y-1/2 text-[var(--tg-theme-hint-color)]" />
    </button>
    <button
      v-if="displayLabel && !disabled"
      type="button"
      class="absolute right-9 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-[var(--tg-theme-hint-color)] hover:opacity-80"
      :aria-label="t('filter.clearFilters')"
      @click="onClear"
    >
      <Icon icon="lucide:x-circle" width="18" height="18" />
    </button>

    <NDrawer
      :show="sheetOpen"
      :height="'min(78vh, 520px)'"
      placement="bottom"
      :trap-focus="false"
      :block-scroll="true"
      @update:show="onSheetShowUpdate"
    >
      <div
        class="flex h-full flex-col bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]"
      >
        <div class="shrink-0 border-b border-[var(--tg-theme-section-separator-color)] px-4 pb-3 pt-3">
          <div class="mb-3 flex items-center justify-between gap-2">
            <div class="text-[16px] font-700">
              {{ placeholder }}
            </div>
            <button
              type="button"
              class="rounded-lg p-1 text-[var(--tg-theme-hint-color)]"
              aria-label="close"
              @click="closeSheet"
            >
              <Icon icon="lucide:x" width="22" height="22" />
            </button>
          </div>
          <NInput
            v-if="searchable"
            v-model:value="sheetSearch"
            type="text"
            :placeholder="t('common.selectSearchPlaceholder')"
            clearable
            @keydown.enter.prevent
          />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom,12px)] pt-2">
          <button
            v-for="o in filteredOptions"
            :key="String(o.value)"
            type="button"
            class="flex w-full rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors"
            :class="String(inner) === String(o.value)
              ? 'bg-[color-mix(in_srgb,var(--tg-theme-link-color)_18%,transparent)] font-600 text-[var(--tg-theme-link-color)]'
              : 'text-[var(--tg-theme-text-color)] hover:bg-[color-mix(in_srgb,var(--tg-theme-section-separator-color)_35%,transparent)]'"
            @click="pickOption(o.value)"
          >
            {{ o.label }}
          </button>
          <div
            v-if="!filteredOptions.length"
            class="py-8 text-center text-[14px] text-[var(--tg-theme-hint-color)]"
          >
            {{ t('common.selectNoMatch') }}
          </div>
        </div>
      </div>
    </NDrawer>
  </div>
</template>
