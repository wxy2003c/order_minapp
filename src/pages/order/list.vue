<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import OrderListCard from '@/components/OrderListCard.vue'
import NoPermissionModal from '@/components/NoPermissionModal.vue'
import TgListSkeleton from '@/components/TgListSkeleton.vue'
import TgLoadingState from '@/components/TgLoadingState.vue'
import type { OrderListItem, OrderListStatusTab } from '@/utils/orderHelpers'
import { ensureOrderApiRoutingReady, fetchOrdersList, getCurrentUserRole } from '@/api/rolesApi'
import { t } from '@/i18n/uiI18n'
import { getTelegramUserId } from '@/utils/userTelegram'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'
import { useDeepLinkAuthGuard } from '@/composables/useDeepLinkAuthGuard'

const router = useRouter()
const staffDeeplink = useStaffDeeplinkStore()
const { noPermission, goHome, guardCheck } = useDeepLinkAuthGuard()

const userId = computed(() => staffDeeplink.platformUid || getTelegramUserId())
const activeKey = ref('all')
const search = ref('')
const searchDebounced = ref('')
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const errorMsg = ref('')
const data = ref<Awaited<ReturnType<typeof fetchOrdersList>> | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null
const canShowCreateShortcut = computed(() =>
  getCurrentUserRole() === 'admin' || staffDeeplink.openedViaTelegramStartParam,
)

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
    await ensureOrderApiRoutingReady()
    if (!await guardCheck()) return
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


function goDetail(row: OrderListItem) {
  router.push({ path: '/OrderDetails', query: { orderId: String(row.id) } })
}

function goToCreateOrder() {
  staffDeeplink.prepareCreateOrderFromList()
  void router.push('/CustomOrder')
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
  <div class="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto bg-[#F4F4F5] pb-28 text-[#1F2937] pos-relative">
    <header
      class="sticky top-0 z-10 flex items-center gap-2 border-b border-[#E5E7EB] bg-white/95 px-3 py-3 backdrop-blur">
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

    <div class="mx-3 mt-2">
      <div class="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
        <Icon icon="mdi:magnify" class="shrink-0 text-[#9CA3AF]" width="20" height="20" />
        <input v-model="search" type="search" :placeholder="t('orderList.searchPh')"
          class="min-w-0 flex-1 bg-transparent text-3.5 outline-none placeholder:text-[#9CA3AF]"
          @keyup.enter="applySearchNow">
      </div>
    </div>

    <div v-if="loading" class="mt-3 px-3">
      <TgListSkeleton tone="light" image-class="h-28 rounded-2xl" :rows="3" />
    </div>

    <TgLoadingState
      v-else-if="errorMsg"
      tone="light"
      :title="errorMsg"
      :action-label="t('common.retry')"
      @action="load"
    />

    <ul v-else class="tg-fade-list mt-3 list-none space-y-3 px-3">
      <OrderListCard
        v-for="row in (data?.items ?? [])"
        :key="row.id"
        as="li"
        :row="row"
        show-customer-id
        @click="goDetail" />
    </ul>

    <TgLoadingState
      v-if="!loading && !errorMsg && (data?.items?.length === 0)"
      tone="light"
      :title="t('orderList.empty')"
    />

    <div v-if="data && (data.last_page > 1)" class="mt-4 flex items-center justify-center gap-3 px-3 pb-6">
      <button type="button" class="tg-interactive rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-3.25 disabled:opacity-40"
        :disabled="!canPrev" @click="prevPage">
        {{ t('orderList.prev') }}
      </button>
      <span class="text-3 text-[#6B7280]">{{ data.page }} / {{ data.last_page }}</span>
      <button type="button" class="tg-interactive rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-3.25 disabled:opacity-40"
        :disabled="!canNext" @click="nextPage">
        {{ t('orderList.next') }}
      </button>
    </div>

    <div
      v-if="canShowCreateShortcut"
      class="pos-fixed right-5 top-1/2 h-12 w-12 flex flex-items-center justify-center rounded-50% border -translate-y-1/2"
      style="border-color: var(--tg-theme-section-separator-color); background: var(--tg-theme-secondary-bg-color)"
      @click="goToCreateOrder">
      <Icon icon="mdi:plus" width="22" height="22" :style="{ color: 'var(--tg-theme-text-color)' }" />
    </div>
  </div>

  <NoPermissionModal :visible="noPermission" @go-home="goHome" />
</template>
