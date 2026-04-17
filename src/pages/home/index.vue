<!--
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2026-04-17 10:54:49
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2026-04-17 16:18:50
 * @FilePath: \vite-project\src\pages\home\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script lang="ts" setup>
import TgButton from '@/components/TgButton.vue';
import TgSelect from '@/components/TgSelect.vue';
import { Icon } from '@iconify/vue'
const ButtonItem = ['运动', '性能赛道', 'OEM风格', '豪华商务', '豪华商务', '豪华商务', '豪华商务', '豪华商务', '豪华商务', '豪华商务']
</script>

<template>
  <div class="min-h-full w-full bg-[#202126] p-4 overflow-hidden">
    <img src="@/assets/image/navLogo.png" class="w-65 h-14" alt="">
    <Swiper class="mt-3" />
    <div class="mt-3 flex gap-2">
      <TgSelect />
      <TgSelect />
      <TgButton type="button" variant="white" shape="pill">
        <span>Go</span>
      </TgButton>
    </div>
    <div class="mt-3 flex gap-2 overflow-auto">
      <TgButton v-for="(item, index) in ButtonItem" :key="index" type="button" variant="outline" shape="pill">
        <span class="color-[#4F5869]">{{ item }}</span>
      </TgButton>
    </div>
    <!-- 产品推荐 -->
    <div class="mt-5">
      <div class="flex flex-items-center">
        <div class="text-3 color-[#BCCAE4] flex-1">产品推荐</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">全部</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-3">
        <div v-for="index in 4" :key="index" class="w-full">
          <img src="@/assets/vue.svg" class="w-full h-21" alt="">
          <div class="text-3 color-[#BCCAE4] mt-1.5">WL-M-054</div>
        </div>
      </div>
    </div>
    <!-- 客户案例 -->
    <div class="mt-5">
      <div class="flex flex-items-center">
        <div class="text-3 color-[#BCCAE4] flex-1">客户案例</div>
        <div class="flex flex-items-center">
          <span class="text-3 color-[#BCCAE4]">全部</span>
          <Icon icon="cuida:caret-right-outline" width="18" height="18" color="#BCCAE4" />
        </div>
      </div>
      <div class="mt-4 flex flex-col gap-3">
        <img src="@/assets/vite.svg" class="w-full h-42" alt="">
        <div class="text-4 color-[#BCCAE4] mt-3">BMW M340D G21</div>
        <div class="text-3 color-[#BCCAE4] mt-2">单片 • 19x8.5J • ET22 • WL-M-055</div>
      </div>
    </div>
  </div>
</template>