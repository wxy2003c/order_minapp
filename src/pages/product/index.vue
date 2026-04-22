<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-17 11:01:29
 * @FilePath: \vite-project\src\pages\product\index.vue
 * @Description: 车型与风格在 Pinia（productBrowse）；下方「已选」与头部同源
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import HeaderFilter from '@/components/HeaderFilter.vue'

const router = useRouter()

function goProductDetails() {
  router.push('/ProductDetails')
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#202126] p-4 text-white">
    <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">
    <HeaderFilter title="车型" ProductSelection />
    <div class="mt-6 flex flex-col gap-3">
      <div class="cursor-pointer" @click="goProductDetails">
        <img src="@/assets/vue.svg" class="h-43 w-full rounded-1.5 object-center" alt="">
        <div class="mt-3 flex justify-between">
          <div class="text-3.5 color-[#BCCAE4]">4444</div>
          <div class="flex gap-2">
            <div v-for="index in 3" :key="index"
              class="h-6 w-14 border border-[#BCCAE4] rounded-.5 text-center text-3 color-[#BCCAE4] leading-6">
              1515
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
