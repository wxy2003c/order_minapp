<script setup lang="ts">
import { t } from '@/i18n/uiI18n'
defineProps<{ visible: boolean }>()
defineEmits<{ goHome: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="mx-6 w-full max-w-sm rounded-2xl bg-white px-6 py-8 text-center shadow-xl">
        <div class="mb-3 text-5 font-600 text-[#1F2937]">{{ t('noPermission.title') }}</div>
        <div class="mb-6 text-3.75 text-[#6B7280]">{{ t('noPermission.desc') }}</div>
        <button
          type="button"
          class="w-full rounded-xl bg-[#3390ec] py-3 text-4 font-500 text-white active:opacity-80"
          @click="$emit('goHome')"
        >
          {{ t('noPermission.goHome') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
