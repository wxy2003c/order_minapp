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
  }
)

const className = computed(() => [
  'inline-flex items-center justify-center whitespace-nowrap',
  'min-w-20 h-10 px-4 text-3 font-600 leading-none',
  'border border-transparent outline-none select-none',
  'transition-all duration-200 ease-out',
  'cursor-pointer disabled:cursor-not-allowed disabled:opacity-45',
  'active:scale-[0.98]',
  'shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]',

  props.shape === 'default' && 'rounded-xl',
  props.shape === 'pill' && 'rounded-2',

  props.block && 'w-full !bg-[#333333] text-white',

  props.variant === 'primary'
  && 'bg-tg-accent text-tg-accent-text shadow-[0_10px_24px_color-mix(in_srgb,var(--app-accent)_28%,transparent)] hover:brightness-[1.03] active:brightness-[0.96]',
  props.variant === 'ghost'
  && 'bg-[color:var(--app-accent-soft)] text-tg-link hover:bg-[color:color-mix(in_srgb,var(--app-accent)_18%,transparent)] active:bg-[color:color-mix(in_srgb,var(--app-accent)_24%,transparent)]',
  props.variant === 'danger'
  && 'bg-[color:color-mix(in_srgb,var(--app-danger)_14%,transparent)] text-tg-danger hover:bg-[color:color-mix(in_srgb,var(--app-danger)_18%,transparent)] active:bg-[color:color-mix(in_srgb,var(--app-danger)_24%,transparent)]',
  props.variant === 'white'
  && 'bg-white text-tg-text shadow-[0_10px_24px_rgba(0,0,0,0.08)] hover:bg-white/95 active:bg-white/90',
  props.variant === 'outline'
  && 'bg-transparent border-[color:var(--app-divider)] text-tg-text hover:bg-[color:color-mix(in_srgb,var(--app-text)_4%,transparent)] active:bg-[color:color-mix(in_srgb,var(--app-text)_8%,transparent)] shadow-none border-white/90',
])
</script>

<template>
  <button :type="type" :class="className" :disabled="disabled">
    <slot />
  </button>
</template>