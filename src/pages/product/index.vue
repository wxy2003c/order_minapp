<template>
  <section class="tg-card p-4">
    <p class="text-2 text-tg-section-title">产品</p>
    <h2 class="mt-2 text-6 font-700">产品</h2>
    <ul class="mt-3 m-0 list-none p-0">
      <li
        v-for="item in ['TG Bot 工具', 'Mini App 组件库', '主题适配套件']"
        :key="item"
        class="mb-2 flex items-center justify-between rounded-xl bg-tg-surface px-3 py-2 last:mb-0"
      >
        <span class="text-3">{{ item }}</span>
        <span class="text-2 text-tg-link">查看</span>
      </li>
    </ul>
  </section>
</template>
