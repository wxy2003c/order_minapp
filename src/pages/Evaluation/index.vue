<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import TgButton from '@/components/TgButton.vue'
import TgFilepond from '@/components/TgFilepond.vue'

const reviewImage = ref<File | null>(null)
const reviewVideo = ref<File | null>(null)
const reviewRating = ref(4)
const reviewComment = ref('')

</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden overflow-y-auto bg-white pb-28 px-3.5 pt-4 text-[#1F2937]">
    <div class="space-y-6 px-1">
      <div class="flex gap-3">
        <div class="w-27 h-27">
          <TgFilepond v-model="reviewImage" accept="image/*" aria-label="添加评价图片">
            <template #placeholder>
              <div class="flex flex-col items-center gap-1 text-3 text-[#4b5563]">
                <Icon icon="mdi:image-plus-outline" width="26" height="26" />
                <span>添加图片</span>
              </div>
            </template>
          </TgFilepond>
        </div>
        <div class="w-27 h-27">
          <TgFilepond v-model="reviewVideo" accept="video/*" aria-label="添加评价视频">
            <template #placeholder>
              <div class="flex flex-col items-center gap-1 text-3 text-[#4b5563]">
                <Icon icon="mdi:video-plus-outline" width="26" height="26" />
                <span>添加视频</span>
              </div>
            </template>
          </TgFilepond>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 border-b border-[#eceef2] pb-4">
        <span class="text-4 font-600">综合评分</span>
        <div class="flex items-center gap-2">
          <button v-for="star in 5" :key="star" type="button" class="text-[#f3a31a]" @click="reviewRating = star">
            <Icon :icon="star <= reviewRating ? 'solar:star-bold' : 'solar:star-outline'" width="22" height="22"
              :class="star <= reviewRating ? 'text-[#f3a31a]' : 'text-[#b7b9bf]'" />
          </button>
        </div>
      </div>

      <div>
        <textarea v-model="reviewComment" rows="8" placeholder="对我们提供的轮毂感觉如何..."
          class="w-full resize-none bg-transparent text-3.8 text-[#1F2937] outline-none placeholder:text-[#c5c8d0]" />
      </div>
    </div>

    <div class="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 bg-white px-1 py-4">
      <TgButton block>
        提交评价
      </TgButton>
    </div>
  </div>
</template>