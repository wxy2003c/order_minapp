<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'ghost' | 'danger' | 'white' | 'outline'
    shape?: 'default' | 'pill'
    block?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    shape: 'default',
    block: false,
    disabled: false,
  },
)

const baseClass =
  'box-border inline-flex min-h-11 select-none items-center justify-center border px-5 py-2.5 font-500 text-3.5 leading-snug transition isolate [transform:translate3d(0,0,0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-bg)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45'

const blockClass = computed(() => (props.block ? 'w-full' : ''))

const shapeClass = computed(() => (props.shape === 'pill' ? 'rounded-2' : 'rounded-xl'))

const variantClass = computed(() => {
  switch (props.variant) {
    case 'white':
      return 'tg-btn-white shadow-[0_10px_24px_rgba(0,0,0,0.08)]'
    case 'primary':
      return 'tg-btn-primary'
    case 'outline':
      return 'border-[color:var(--app-accent)] bg-transparent text-[color:var(--app-text)] hover:bg-[color:var(--app-accent-soft)]'
    case 'ghost':
      return 'border-transparent bg-transparent text-[color:var(--app-text)] hover:bg-[color:var(--app-accent-soft)]'
    case 'danger':
      return 'tg-btn-danger hover:opacity-90'
    default:
      return 'tg-btn-primary'
  }
})

const buttonClass = computed(() =>
  [baseClass, blockClass.value, shapeClass.value, variantClass.value]
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="buttonClass">
    <slot />
  </button>
</template>
