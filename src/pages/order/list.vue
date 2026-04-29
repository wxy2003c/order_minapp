<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import OrderListCard from '@/components/OrderListCard.vue'
import type { OrderListItem, OrderListStatusTab } from '@/utils/orderHelpers'
import { fetchOrdersList } from '@/api/orders'
import { t } from '@/i18n/uiI18n'
import { getTelegramUserId } from '@/utils/userTelegram'
import { readStaffPlatformUid } from '@/utils/deeplinkStaffContext'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'

const router = useRouter()
const staffDeeplink = useStaffDeeplinkStore()

const userId = ref(readStaffPlatformUid().trim() || getTelegramUserId())
const activeKey = ref('all')
const search = ref('')
const searchDebounced = ref('')
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const errorMsg = ref('')
const data = ref<Awaited<ReturnType<typeof fetchOrdersList>> | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const tabItems = computed<OrderListStatusTab[]>(() => {
  const s = data.value?.statuses
  if (s?.length) return s
  return defaultTabsStatic()
})

function defaultTabsStatic(): OrderListStatusTab[] {
  const keys = ['all', 'conf', 'design', 'locked', 'prod', 'to_ship', 'ship', 'done', 'cancel'] as const
  return keys.map(key => ({
    key,
    label: tabLabelI18n(key),
    count: 0,
  }))
}

function tabLabelI18n(key: string): string {
  const k = `orderList.tab.${key}` as const
  const s = t(k)
  if (s !== k) return s
  return key
}

function scheduleSearchDebounce() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchDebounced.value = search.value.trim()
    page.value = 1
  }, 400)
}

watch(search, () => {
  scheduleSearchDebounce()
})

watch(
  [activeKey, page, pageSize, searchDebounced, userId],
  () => { void load() },
  { immediate: true },
)

function statusParam() {
  const k = activeKey.value
  return k === 'all' ? undefined : k
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    data.value = await fetchOrdersList({
      user_id: userId.value || undefined,
      status: statusParam(),
      page: page.value,
      page_size: pageSize.value,
      search: searchDebounced.value || undefined,
    })
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!userId.value) userId.value = getTelegramUserId()
})

function goDetail(row: OrderListItem) {
  router.push({ path: '/OrderDetails', query: { orderId: String(row.id) } })
}

function goBack() {
  router.push('/profile')
}

const canPrev = computed(() => page.value > 1)
const canNext = computed(() => {
  const lp = data.value?.last_page ?? 1
  return page.value < lp
})

function prevPage() {
  if (canPrev.value) page.value -= 1
}
function nextPage() {
  if (canNext.value) page.value += 1
}

function selectTab(key: string) {
  if (activeKey.value === key) return
  activeKey.value = key
  page.value = 1
}

function applySearchNow() {
  if (searchTimer) clearTimeout(searchTimer)
  searchDebounced.value = search.value.trim()
  page.value = 1
}
</script>

<template>
  <div class="min-h-full w-full overflow-x-hidden bg-[#F4F4F5] pb-24 text-[#1F2937] pos-relative">
    <header
      class="sticky top-0 z-10 flex items-center gap-2 border-b border-[#E5E7EB] bg-white/95 px-3 py-3 backdrop-blur">
      <button v-if="staffDeeplink.allowHistoryBack" type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-[#4B5563] active:bg-[#F3F4F6]"
        :aria-label="t('common.back')" @click="goBack">
        <Icon icon="mdi:chevron-left" width="26" height="26" />
      </button>
      <h1 class="text-4 font-700 text-[#111827]">
        {{ t('orderList.title') }}
      </h1>
    </header>

    <div class="px-3 pt-3">
      <div class="-mx-1 flex gap-1 overflow-x-auto pb-2 text-3 whitespace-nowrap">
        <button v-for="tab in tabItems" :key="tab.key" type="button"
          class="shrink-0 rounded-full border px-3 py-1.5 font-500 transition" :class="activeKey === tab.key
            ? 'border-[#2A2C33] bg-[#1F2937] text-white'
            : 'border-[#E5E7EB] bg-white text-[#4B5563]'" @click="selectTab(tab.key)">
          <span>{{ tab.label || tabLabelI18n(tab.key) }}</span>
        </button>
      </div>
    </div>

    <p v-if="errorMsg"
      class="mx-3 mt-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-3 text-[#B91C1C]">
      {{ errorMsg }}
    </p>

    <div class="mx-3 mt-2">
      <div class="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
        <Icon icon="mdi:magnify" class="shrink-0 text-[#9CA3AF]" width="20" height="20" />
        <input v-model="search" type="search" :placeholder="t('orderList.searchPh')"
          class="min-w-0 flex-1 bg-transparent text-3.5 outline-none placeholder:text-[#9CA3AF]"
          @keyup.enter="applySearchNow">
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-3.5 text-[#9CA3AF]">
      {{ t('common.loading') }}
    </div>

    <ul v-else class="mt-3 list-none space-y-3 px-3">
      <OrderListCard v-for="row in (data?.items ?? [])" :key="row.id" as="li" :row="row" @click="goDetail" />
    </ul>

    <p v-if="!loading && (data?.items?.length === 0)" class="px-3 py-10 text-center text-3.5 text-[#9CA3AF]">
      {{ t('orderList.empty') }}
    </p>

    <div v-if="data && (data.last_page > 1)" class="mt-4 flex items-center justify-center gap-3 px-3 pb-6">
      <button type="button" class="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-3.25 disabled:opacity-40"
        :disabled="!canPrev" @click="prevPage">
        {{ t('orderList.prev') }}
      </button>
      <span class="text-3 text-[#6B7280]">{{ data.page }} / {{ data.last_page }}</span>
      <button type="button" class="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-3.25 disabled:opacity-40"
        :disabled="!canNext" @click="nextPage">
        {{ t('orderList.next') }}
      </button>
    </div>

    <div
      class="pos-fixed right-5 top-1/2 h-12 w-12 flex flex-items-center justify-center rounded-50% border -translate-y-1/2"
      style="border-color: var(--tg-theme-section-separator-color); background: var(--tg-theme-secondary-bg-color)"
      @click="router.push('/CustomOrder')">
      <Icon icon="mdi:plus" width="22" height="22" :style="{ color: 'var(--tg-theme-text-color)' }" />
    </div>
  </div>
</template>
