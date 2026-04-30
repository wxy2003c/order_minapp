<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-20 13:51:33
 * @FilePath: \vite-project\src\pages\product\details.vue
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import Swiper from '@/components/Swiper.vue'
import { fetchStyleModelDetail } from '@/api/admin/styleModels'
import type { StyleModelDetail } from '@/api/admin/styleModels'
import { resolveOrderAssetUrl } from '@/utils/orderMedia'
import type { HomeStyleModelItem } from '@/api/rolesApi'

const route = useRoute()
const router = useRouter()

const detail = ref<StyleModelDetail | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = route.query.id ?? route.query.style_id
  if (!id) return
  try {
    detail.value = await fetchStyleModelDetail(String(id))
  } finally {
    loading.value = false
  }
})

// Swiper items：style_detail_images → HomeStyleModelItem 格式
const swiperItems = computed<HomeStyleModelItem[]>(() => {
  const d = detail.value
  if (!d) return []
  return (d.style_detail_images ?? []).map((img, idx) => ({
    id: idx,
    style_no: d.style_no,
    style_name: img.label || d.style_name,
    effect_image: img.url,
  }))
})

// 概览信息格子
const productMeta = computed(() => {
  const o = detail.value?.overview
  if (!o) return []
  return [
    { label: '结构类型', value: o.structure_display || '—' },
    { label: '爪型样式', value: o.spoke_type_display || '—' },
    { label: '条幅数量', value: o.spoke_count_display || '—' },
    { label: '左右旋', value: o.directional_display || '—' },
    { label: '风格标签', value: detail.value?.style_tags?.join('、') || '—' },
    { label: '上架时间', value: o.created_at_display || '—' },
  ]
})

// 客户案例
const productCases = computed(() => {
  return detail.value?.style_library_cases?.case_cards ?? []
})

function caseCoverUrl(cover: string | null): string | null {
  return resolveOrderAssetUrl(cover)
}

function goCustomOrder() {
  const query: Record<string, string> = {}
  if (detail.value?.id) query.preset_style_id = String(detail.value.id)
  if (detail.value?.structure_type) query.structure_type = detail.value.structure_type
  router.push({ path: '/CustomOrder', query })
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#F7F6F2] pb-34 text-[#1F2937]">
    <!-- 骨架 -->
    <template v-if="loading">
      <div class="h-45 w-full animate-pulse bg-white/20" />
      <section class="bg-white px-4 pt-4 pb-5">
        <div class="mt-4 h-10 animate-pulse rounded-2xl bg-[#F3F4F6]" />
        <div class="mt-3 grid grid-cols-3 gap-3">
          <div v-for="n in 6" :key="n" class="h-16 animate-pulse rounded-2xl bg-[#F3F4F6]" />
        </div>
      </section>
    </template>

    <template v-else-if="detail">
      <Swiper :items="swiperItems" />

      <section class="bg-white px-4 pt-4 pb-5">
        <div class="mt-4 rounded-2xl bg-[#FAFAF8] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div class="text-4 font-700 tracking-wide">
            {{ detail.style_no }}
            <span class="ml-2 text-3.5 font-500 text-[#6B7280]">{{ detail.style_name }}</span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-3">
          <div v-for="item in productMeta" :key="item.label"
            class="rounded-2xl bg-[#FAFAF8] px-3 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div class="text-3 text-[#9CA3AF]">
              {{ item.label }}
            </div>
            <div class="mt-2 text-3.5 font-700 text-[#374151]">
              {{ item.value }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="productCases.length > 0" class="mt-3 bg-white px-4 py-5">
        <div class="text-5 font-700">
          客户案例
        </div>
        <div class="mt-1 text-3 text-[#9CA3AF]">
          用户的真实案例，给您不同的灵感创作
        </div>

        <div class="mt-4 space-y-5">
          <div v-for="item in productCases" :key="item.id" class="rounded-3xl">
            <div class="overflow-hidden rounded-2xl bg-[#111111]">
              <img
                v-if="caseCoverUrl(item.cover)"
                :src="caseCoverUrl(item.cover)!"
                class="h-42 w-full object-cover opacity-90"
                alt=""
              >
              <div v-else class="flex h-42 w-full items-center justify-center text-white/20">
                <Icon icon="mdi:image-outline" width="48" height="48" />
              </div>
            </div>
            <div class="mt-3 text-4 font-700">
              {{ item.title }}
            </div>
            <div class="mt-1 text-3 text-[#4B5563]">
              {{ item.meta }}
            </div>
          </div>
        </div>
      </section>
    </template>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECE8DE] bg-white px-4 py-4">
      <button type="button"
        class="tg-btn-primary h-12 w-full rounded-xl border text-4 font-700 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
        @click="goCustomOrder">
        订制同款
      </button>
    </div>
  </div>
</template>
