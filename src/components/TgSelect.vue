<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NSelect } from 'naive-ui'

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
  'update:modelValue': [value: string | number]
}>()

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

function onUpdate(v: string | number | null) {
  inner.value = v
  if (v !== null && v !== undefined)
    emit('update:modelValue', v)
}
</script>

<template>
  <NSelect
    :value="inner"
    :options="(nOptions as any)"
    :placeholder="placeholder"
    :disabled="disabled"
    :filterable="searchable"
    :clearable="true"
    label-field="label"
    value-field="value"
    :consistent-menu-width="false"
    class="tg-nselect w-full"
    @update:value="onUpdate"
  />
</template>

<style scoped>
.tg-nselect :deep(.n-base-selection:not(.n-base-selection--disabled) .n-base-selection-label) {
  color: var(--tg-theme-link-color);
  font-weight: 600;
}

.tg-nselect :deep(.n-base-selection--disabled .n-base-selection-label) {
  color: inherit;
  font-weight: 600;
}
</style>
