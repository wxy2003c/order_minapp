<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-20 13:51:33
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-22 16:09:47
 * @FilePath: \vite-project\src\pages\product\details.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
const productMeta = [
  { label: '结构类型', value: '单片' },
  { label: '爪型样式', value: 'Y型' },
  { label: '条幅数量', value: '10' },
  { label: '左右旋', value: '否' },
  { label: '风格标签', value: 'OEM风格' },
  { label: '上架时间', value: '2026-04-10' },
]

const productCases = [
  {
    id: 1,
    title: 'BMW M340D G21',
    summary: '单片 • 19x8.5J • ET22 • WL-M-055',
  },
  {
    id: 2,
    title: 'AUDI A4 2024',
    summary: '单片 • 19x10J • ET9 • WL-M-054',
  },
]
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#F7F6F2] pb-34 text-[#1F2937]">
    <Swiper />
    <section class="bg-white px-4 pt-4 pb-5">
      <div class="mt-4 rounded-2xl bg-[#FAFAF8] px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div class="text-4 font-700 tracking-wide">
          WL-M-053
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

    <section class="mt-3 bg-white px-4 py-5">
      <div class="text-5 font-700">
        客户案例
      </div>
      <div class="mt-1 text-3 text-[#9CA3AF]">
        用户的真实案例，给您不同的灵感创作
      </div>

      <div class="mt-4 space-y-5">
        <div v-for="item in productCases" :key="item.id" class="rounded-3xl">
          <div class="overflow-hidden rounded-2xl bg-[#111111]">
            <img src="@/assets/vue.svg" class="h-42 w-full object-cover bg-black p-8 opacity-82" alt="">
          </div>
          <div class="mt-3 text-4 font-700">
            {{ item.title }}
          </div>
          <div class="mt-1 text-3 text-[#4B5563]">
            {{ item.summary }}
          </div>
        </div>
      </div>
    </section>

    <div
      class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-[#ECE8DE] bg-white px-4 py-4">
      <button type="button"
        class="tg-btn-primary h-12 w-full rounded-xl border text-4 font-700 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
        订制同款
      </button>
    </div>
  </div>
</template>
