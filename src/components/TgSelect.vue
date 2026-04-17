<script setup lang="ts">
import { ref, watch } from 'vue'
import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.css'

interface SelectOption {
  value: string | number
  label: string
}

const props = withDefaults(defineProps<{
  modelValue?: string | number
  options?: SelectOption[]
  placeholder?: string
  searchable?: boolean
}>(), {
  placeholder: '请选择',
  searchable: true,
  options: () => [
    { value: 1, label: 'Apple' },
    { value: 2, label: 'Banana' },
    { value: 3, label: 'Blueberry' },
  ]
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const selectedOption = ref<SelectOption | null>(null)

function syncSelectedOption(value = props.modelValue) {
  selectedOption.value = props.options?.find(
    item => String(item.value) === String(value),
  ) ?? null
}

watch(
  [() => props.modelValue, () => props.options],
  ([value]) => {
    syncSelectedOption(value)
  },
  { immediate: true, deep: true },
)

function handleUpdate(option: SelectOption | null) {
  selectedOption.value = option

  if (option) {
    emit('update:modelValue', option.value)
  }
}
</script>

<template>
  <Multiselect
    v-model="selectedOption"
    class="tg-multiselect"
    :options="options"
    label="label"
    track-by="value"
    :placeholder="placeholder"
    :searchable="searchable"
    :show-labels="false"
    :allow-empty="true"
    :close-on-select="true"
    @update:model-value="handleUpdate"
  >
    <template #singleLabel="{ option }">
      <span class="text-tg-link font-600">{{ option.label }}</span>
    </template>

    <template #option="{ option }">
      <span>{{ option.label }}</span>
    </template>
  </Multiselect>
</template>

<style scoped>
:deep(.tg-multiselect) {
  min-width: 8.75rem;
}

:deep(.tg-multiselect .multiselect__tags) {
  min-height: 2.5rem;
  padding: 0 2.25rem 0 1rem;
  border: 1px solid var(--app-divider);
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: none;
  display: flex;
  align-items: center;
}

:deep(.tg-multiselect .multiselect__placeholder) {
  margin: 0;
  padding: 0;
  color: var(--app-hint);
  font-size: 0.875rem;
}

:deep(.tg-multiselect .multiselect__single) {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--app-link);
  font-size: 0.875rem;
  font-weight: 600;
}

:deep(.tg-multiselect .multiselect__select) {
  height: 2.5rem;
}

:deep(.tg-multiselect .multiselect__select::before) {
  top: 60%;
  border-color: var(--app-hint) transparent transparent;
}

:deep(.tg-multiselect.multiselect--active .multiselect__tags) {
  border-color: var(--app-link);
}

:deep(.tg-multiselect .multiselect__content-wrapper) {
  margin-top: 0.25rem;
  border: 1px solid var(--app-divider);
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: var(--app-shadow);
  overflow: hidden;
}

:deep(.tg-multiselect .multiselect__content) {
  padding: 0.25rem;
}

:deep(.tg-multiselect .multiselect__option) {
  min-height: 2.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--app-text);
  font-size: 0.875rem;
  line-height: 1.25rem;
}

:deep(.tg-multiselect .multiselect__option--highlight) {
  background: var(--app-accent-soft);
  color: var(--app-link);
}

:deep(.tg-multiselect .multiselect__option--selected) {
  background: var(--app-accent-soft);
  color: var(--app-link);
  font-weight: 600;
}

:deep(.tg-multiselect .multiselect__option--selected.multiselect__option--highlight) {
  background: color-mix(in srgb, var(--app-accent) 18%, white);
  color: var(--app-link);
}
</style>