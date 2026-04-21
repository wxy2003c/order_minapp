<!--
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-17 11:01:38
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-21 11:06:04
 * @FilePath: \vite-project\src\pages\cases\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import HeaderFilter from '@/components/HeaderFilter.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const caseList = [
  {
    id: 1,
    title: 'BMW M340D G21',
    tags: ['19x8.5J', '5x112', 'ET30'],
  },
]

function handleGoDetail() {
  router.push('/CasesDetails')
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#202126] p-4 text-white">
    <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">
    <HeaderFilter title="汽车品牌 " CaseSelection/>
    <div class="mt-6 flex flex-col gap-3">
      <button
        v-for="item in caseList"
        :key="item.id"
        type="button"
        class="w-full  text-left transition"
        @click="handleGoDetail"
      >
        <img src="@/assets/vue.svg" class="h-43 w-full rounded-2 object-cover" alt="">
        <div class="mt-3 flex items-start justify-between gap-3">
          <div class="text-4 font-700 color-[#F3F4F6]">
            {{ item.title }}
          </div>
          <div class="flex flex-wrap justify-end gap-2">
            <div
              v-for="tag in item.tags"
              :key="tag"
              class="rounded-2 border border-[#BCCAE4] px-2.5 py-1 text-3 leading-none color-[#BCCAE4]"
            >
              {{ tag }}
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
