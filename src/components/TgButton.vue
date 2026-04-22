<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui'

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

const nBtnType = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'primary' as const
    case 'danger':
      return 'error' as const
    case 'outline':
    case 'white':
    case 'ghost':
    default:
      return 'default' as const
  }
})

const secondary = computed(() => props.variant === 'outline')

const quaternary = computed(() => props.variant === 'ghost')

/** TG 暗色下 --app-text 为浅色：白底按钮必须用深色字；各变体显式字色避免与主题继承冲突 */
const customClass = computed(() => {
  const parts: string[] = [props.shape === 'pill' ? 'rounded-2' : 'rounded-xl']
  switch (props.variant) {
    case 'white':
      parts.push(
        '!bg-white !text-[color:var(--app-on-light)] shadow-[0_10px_24px_rgba(0,0,0,0.08)]',
      )
      break
    case 'primary':
      parts.push('!text-[color:var(--app-accent-text)]')
      break
    case 'outline':
      parts.push('!text-[color:var(--app-text)]')
      break
    case 'ghost':
      parts.push('!text-[color:var(--app-text)]')
      break
    case 'danger':
      parts.push('!text-white')
      break
    default:
      break
  }
  return parts.join(' ')
})
</script>

<template>
  <NButton
    :attr-type="type"
    :type="nBtnType"
    :secondary="secondary"
    :quaternary="quaternary"
    :block="block"
    :disabled="disabled"
    :class="customClass"
  >
    <slot />
  </NButton>
</template>
