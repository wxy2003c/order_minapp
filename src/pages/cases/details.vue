<script setup lang="ts">
import { Icon } from '@iconify/vue'

const specTabs = [
  { label: '前轮', value: 'front' as const },
  { label: '后轮', value: 'rear' as const },
]


// 双向绑定当前选中
const activeTab = ref('front')

const specGroups = {
  front: [
    { label: '尺寸', value: '19 英寸' },
    { label: '宽度', value: '8.5J' },
    { label: '孔距', value: '5x112' },
    { label: 'ET', value: '30' },
    { label: 'CB', value: '66.5' },
    { label: '条辐', value: '10' },
    { label: '载重', value: '820kg' },
    { label: '旋向', value: '支持' },
    { label: '孔型', value: '旋口' },
    { label: '表面处理', value: '拉丝曜黑' },
  ],
  rear: [
    { label: '尺寸', value: '19 英寸' },
    { label: '宽度', value: '9.5J' },
    { label: '孔距', value: '5x112' },
    { label: 'ET', value: '35' },
    { label: 'CB', value: '66.5' },
  ],
}

const colors = [
  { name: 'WL049 曜黑', hex: '#26252d' },
  { name: 'WL050 墨黑', hex: '#1d1d28' },
]

const extraInfos = [
  { label: '表面工艺', value: '拉丝' },
  { label: '拆件工艺', value: '无' },
  { label: '边界设计', value: '无' },
  { label: '定制周期', value: '15 天' },
]
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#f5f5f2] pb-28 text-[#1F2937]">
    <Swiper />
    <section class="bg-white px-4 py-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-4.5 font-700">
            BMW M340D G21
          </h1>
          <div class="mt-2 text-3 color-[#9CA3AF]">
            单片 · 19x8.5J
          </div>
        </div>
        <div class="text-3 color-[#C0C4CC]">
          2026-04-20 09:00
        </div>
      </div>
    </section>

    <section class="mt-2 bg-white px-4 py-4">
      <div class="text-4 font-700">
        客户评价
      </div>
      <div class="mt-4 flex items-start gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#5CA8FF] text-white">
          B
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="truncate text-3.5 font-600">
              Mexicidad Dajo
            </div>
            <div class="flex items-center gap-0.5 text-[#F6C453]">
              <Icon v-for="index in 5" :key="index" icon="solar:star-bold" width="12" height="12" />
            </div>
          </div>
          <p class="mt-2 text-3.5 leading-6 color-[#6B7280]">
            Home excellent process creates wheels with a delicate appearance, precise details,
            and a texture that balances performance and daily driving.
          </p>
        </div>
      </div>
    </section>

    <section class="mt-2 bg-white px-4 py-4">
      <div class="text-4 font-700">
        轮毂规格
      </div>
      <div class="gap-2 mt-4 w-full  border-b border-b-[#BBBBBB] pos-relative">
        <div class="flex flex-items-center gap-5 pb-1.5">
          <div class="text-3.5" :class="activeTab === item.value ? 'color-[#333333] font-bold' : 'color-[#BBBBBB]'"
            v-for="item in specTabs" @click="activeTab = item.value">{{ item.label }}</div>
        </div>
        <div class="w-7.5 h-.75 bg-[#3487FF] pos-absolute bottom-0" :class="activeTab === 'front' ? '' : 'left-12'">
        </div>
      </div>
      <div v-for="item in specTabs" :key="item.value" :value="item.value" class="mt-4 outline-none">
        <div class="flex flex-col gap-2 ">
          <div v-for="spec in specGroups[item.value]" :key="spec.label"
            class="flex items-center justify-between gap-3 border-b border-[#F2F4F7] pb-2 text-3.5">
            <span class="color-[#9CA3AF]">{{ spec.label }}</span>
            <span class="font-600 color-[#111827]">{{ spec.value }}</span>
          </div>
        </div>
      </div>

    </section>

    <section class="mt-2 bg-white px-4 py-4">
      <div class="text-4 font-700">
        颜色信息
      </div>
      <div class="mt-4 rounded-3xl bg-[#F8F8F6] p-4">
        <img src="@/assets/vue.svg" class="h-44 w-full object-contain opacity-75" alt="">
      </div>
      <div class="mt-4 grid grid-cols-2 gap-5">
        <div v-for="item in colors" :key="item.name" class="text-center">
          <div class="text-3.5 font-600">
            {{ item.name }}
          </div>
          <div class="mx-auto mt-3 h-8 w-8 rounded-full border border-black/6" :style="{ backgroundColor: item.hex }" />
        </div>
      </div>
    </section>

    <section class="mt-2 bg-white px-4 py-4">
      <div class="text-4 font-700">
        其他信息
      </div>
      <div class="mt-4 space-y-3">
        <div v-for="item in extraInfos" :key="item.label"
          class="flex items-center justify-between gap-3 border-b border-[#F2F4F7] pb-2 text-3.5">
          <span class="color-[#9CA3AF]">{{ item.label }}</span>
          <span class="font-600 color-[#111827]">{{ item.value }}</span>
        </div>
      </div>
      <p class="mt-4 text-3.5 leading-6 color-[#6B7280]">
        采用轻量化铸造成型工艺，兼顾视觉张力和日常耐用性，
        适合街道与运动化搭配场景。
      </p>
    </section>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECE8DE] bg-white px-4 py-4">
      <button type="button"
        class="tg-btn-primary h-12 w-full rounded-xl border text-4 font-700 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
        立即咨询
      </button>
    </div>
  </div>
</template>