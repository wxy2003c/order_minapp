<script setup lang="ts">
import HeaderFilter from '@/components/HeaderFilter.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goProductDetails() {
  router.push('/ProductDetails')
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-[#202126] p-4 text-white">
    <img src="@/assets/image/navLogo.png" class="h-14 w-65" alt="">
    <HeaderFilter title="车型" ProductSelection/>
    <div class="mt-6 flex flex-col gap-3">
      <div class="cursor-pointer" @click="goProductDetails">
        <img src="@/assets/vue.svg" class="w-full h-43 rounded-1.5" alt="">
        <div class="mt-3 flex justify-between">
          <div class="text-3.5 color-[#BCCAE4]">4444</div>
          <div class="flex gap-2">
            <div
              v-for="index in 3"
              :key="index"
              class="border border-[#BCCAE4] w-14 h-6 text-center color-[#BCCAE4] text-3 leading-6 rounded-.5"
            >1515
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
