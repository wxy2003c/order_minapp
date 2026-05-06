<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@/i18n/uiI18n'

type AxleKey = 'front' | 'rear'

const props = defineProps<{
  frontWidth?: string
  frontEt?: string
  rearWidth?: string
  rearEt?: string
  mirrorPair?: boolean
}>()

const activeAxle = ref<AxleKey>('front')
const stockFrontWidth = ref('8.5')
const stockFrontEt = ref('35')
const stockRearWidth = ref('8.5')
const stockRearEt = ref('35')

function num(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function wheelMetrics(widthJ: unknown, etMm: unknown) {
  const width = num(widthJ)
  const et = num(etMm)
  if (width == null || et == null || width <= 0) return null
  const widthMm = width * 25.4
  return {
    widthJ: width,
    et,
    widthMm,
    outer: widthMm / 2 - et,
    inner: widthMm / 2 + et,
  }
}

const currentInput = computed(() => {
  if (activeAxle.value === 'rear' && !props.mirrorPair) {
    return { width: props.rearWidth, et: props.rearEt }
  }
  return { width: props.frontWidth, et: props.frontEt }
})

const stockInput = computed(() => {
  if (activeAxle.value === 'rear') {
    return { width: stockRearWidth.value, et: stockRearEt.value }
  }
  return { width: stockFrontWidth.value, et: stockFrontEt.value }
})

const activeStockWidth = computed({
  get: () => activeAxle.value === 'rear' ? stockRearWidth.value : stockFrontWidth.value,
  set: (v: string) => {
    if (activeAxle.value === 'rear') stockRearWidth.value = v
    else stockFrontWidth.value = v
  },
})

const activeStockEt = computed({
  get: () => activeAxle.value === 'rear' ? stockRearEt.value : stockFrontEt.value,
  set: (v: string) => {
    if (activeAxle.value === 'rear') stockRearEt.value = v
    else stockFrontEt.value = v
  },
})

const comparison = computed(() => {
  const base = wheelMetrics(stockInput.value.width, stockInput.value.et)
  const next = wheelMetrics(currentInput.value.width, currentInput.value.et)
  if (!base || !next) return null
  const outerChange = next.outer - base.outer
  const innerChange = next.inner - base.inner
  const trackChange = outerChange * 2
  return {
    base,
    next,
    outerChange,
    innerChange,
    trackChange,
    risk:
      outerChange > 28 || innerChange > 18
        ? 'high'
        : outerChange > 18 || innerChange > 10
          ? 'medium'
          : 'low',
  }
})

const riskText = computed(() => {
  const risk = comparison.value?.risk
  if (risk === 'high') return t('customOrder.fitmentVisualRiskHigh')
  if (risk === 'medium') return t('customOrder.fitmentVisualRiskMedium')
  return t('customOrder.fitmentVisualRiskLow')
})

const riskClass = computed(() => {
  const risk = comparison.value?.risk
  if (risk === 'high') return 'bg-[#FEF2F2] text-[#B91C1C]'
  if (risk === 'medium') return 'bg-[#FFF7ED] text-[#C2410C]'
  return 'bg-[#ECFDF5] text-[#047857]'
})

function fmt(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}mm`
}

function rectX(inner: number): number {
  return 150 - inner * 0.42
}

function rectWidth(widthMm: number): number {
  return Math.max(28, widthMm * 0.42)
}
</script>

<template>
  <section class="space-y-3 rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-4 font-700 text-[#111827]">{{ t('customOrder.fitmentVisualTitle') }}</div>
        <div class="mt-1 text-3 leading-relaxed text-[#9CA3AF]">{{ t('customOrder.fitmentVisualHint') }}</div>
      </div>
      <div class="flex shrink-0 rounded-full bg-[#F3F4F6] p-1 text-3 font-700">
        <button
          type="button"
          class="rounded-full px-3 py-1"
          :class="activeAxle === 'front' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280]'"
          @click="activeAxle = 'front'"
        >
          {{ t('customOrder.fitmentVisualFront') }}
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1"
          :class="activeAxle === 'rear' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280]'"
          @click="activeAxle = 'rear'"
        >
          {{ t('customOrder.fitmentVisualRear') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <div class="mb-1 text-2.75 font-700 text-[#6B7280]">{{ t('customOrder.fitmentVisualStockWidth') }}</div>
        <input
          v-model="activeStockWidth"
          type="text"
          class="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 text-3.25 outline-none"
        >
      </div>
      <div>
        <div class="mb-1 text-2.75 font-700 text-[#6B7280]">{{ t('customOrder.fitmentVisualStockEt') }}</div>
        <input
          v-model="activeStockEt"
          type="text"
          class="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 text-3.25 outline-none"
        >
      </div>
    </div>

    <template v-if="comparison">
      <div class="overflow-hidden rounded-2xl bg-[#F9FAFB]">
        <svg viewBox="0 0 300 132" class="h-34 w-full">
          <line x1="58" y1="18" x2="58" y2="116" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="5 5" />
          <line x1="242" y1="18" x2="242" y2="116" stroke="#F97316" stroke-width="2" />
          <text x="52" y="14" text-anchor="middle" font-size="10" fill="#94A3B8">{{ t('customOrder.fitmentVisualInner') }}</text>
          <text x="242" y="14" text-anchor="middle" font-size="10" fill="#EA580C">{{ t('customOrder.fitmentVisualFender') }}</text>

          <rect
            :x="rectX(comparison.base.inner)"
            y="36"
            :width="rectWidth(comparison.base.widthMm)"
            height="24"
            rx="7"
            fill="#CBD5E1"
            opacity="0.8"
          />
          <rect
            :x="rectX(comparison.next.inner)"
            y="72"
            :width="rectWidth(comparison.next.widthMm)"
            height="24"
            rx="7"
            fill="#3487FF"
            opacity="0.92"
          />
          <line x1="150" y1="28" x2="150" y2="104" stroke="#111827" stroke-width="1" opacity="0.35" />
          <text x="12" y="52" font-size="11" fill="#64748B">{{ t('customOrder.fitmentVisualStock') }}</text>
          <text x="12" y="88" font-size="11" fill="#2563EB">{{ t('customOrder.fitmentVisualCurrent') }}</text>
        </svg>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-2xl bg-[#F9FAFB] p-3">
          <div class="text-2.75 text-[#9CA3AF]">{{ t('customOrder.fitmentVisualOuter') }}</div>
          <div class="mt-1 text-4 font-800 text-[#111827]">{{ fmt(comparison.outerChange) }}</div>
        </div>
        <div class="rounded-2xl bg-[#F9FAFB] p-3">
          <div class="text-2.75 text-[#9CA3AF]">{{ t('customOrder.fitmentVisualInnerSpace') }}</div>
          <div class="mt-1 text-4 font-800 text-[#111827]">{{ fmt(comparison.innerChange) }}</div>
        </div>
        <div class="rounded-2xl bg-[#F9FAFB] p-3">
          <div class="text-2.75 text-[#9CA3AF]">{{ t('customOrder.fitmentVisualTrack') }}</div>
          <div class="mt-1 text-4 font-800 text-[#111827]">{{ fmt(comparison.trackChange) }}</div>
        </div>
      </div>

      <div class="rounded-2xl px-3 py-2 text-3.25 font-700" :class="riskClass">
        {{ riskText }}
      </div>
    </template>

    <div v-else class="rounded-2xl bg-[#F9FAFB] px-3 py-4 text-center text-3.25 text-[#9CA3AF]">
      {{ t('customOrder.fitmentVisualNeedParams') }}
    </div>
  </section>
</template>
