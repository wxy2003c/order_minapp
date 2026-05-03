import { computed, onMounted, onUnmounted, ref, watch, watchEffect, type Ref } from 'vue'
import { t } from '@/i18n/uiI18n'
import { getTelegramWebApp } from '@/utils/userTelegram'
import type { TelegramBottomButton } from '@/types'
import type { CustomOrderPageInstance } from '@/pages/CustomOrder/customOrderContext'

function setButtonText(button: TelegramBottomButton, text: string) {
  if (typeof button.setText === 'function') button.setText(text)
  else if (typeof button.setParams === 'function') button.setParams({ text })
}

function setButtonActive(button: TelegramBottomButton, active: boolean) {
  if (active) button.enable?.()
  else button.disable?.()
  button.setParams?.({ is_active: active })
}

function safeCall(fn: (() => void) | undefined) {
  try { fn?.() } catch { /* Telegram client may not support the method fully */ }
}

export function useTelegramNativeOrderControls(
  o: CustomOrderPageInstance,
  isAdminRole: Ref<boolean>,
) {
  const hasNativeMainButton = ref(false)
  const hasNativeSecondaryButton = ref(false)

  const primaryLabel = computed(() => {
    if (o.activeTab === 'vehicle') return t('customOrder.footVehicle')
    if (o.activeTab === 'creative') return t('customOrder.footCreative2')
    if (o.activeTab === 'address' && isAdminRole.value) return t('customOrder.footAddr2')
    if (o.orderSubmitting) return t('common.submitting')
    return o.editOrderId ? t('customOrder.submitUpdate') : t('customOrder.submit')
  })

  const secondaryLabel = computed(() => {
    if (o.activeTab === 'creative') return t('customOrder.footCreative1')
    if (o.activeTab === 'address') return t('customOrder.footAddr1')
    if (o.activeTab === 'amount') return t('customOrder.backEdit')
    return ''
  })

  const hasSecondaryAction = computed(() => Boolean(secondaryLabel.value))

  const useNativeOrderFooter = computed(() => {
    if (!hasNativeMainButton.value) return false
    if (!hasSecondaryAction.value) return true
    return hasNativeSecondaryButton.value
  })

  function hapticSelection() {
    safeCall(() => getTelegramWebApp()?.HapticFeedback?.selectionChanged?.())
  }

  function hapticWarning() {
    safeCall(() => getTelegramWebApp()?.HapticFeedback?.notificationOccurred?.('warning'))
  }

  function hapticSuccess() {
    safeCall(() => getTelegramWebApp()?.HapticFeedback?.notificationOccurred?.('success'))
  }

  function runPrimaryAction() {
    hapticSelection()
    if (o.activeTab === 'vehicle') {
      o.goNextFromVehicle()
      return
    }
    if (o.activeTab === 'creative') {
      o.goFromCreativeToAddress()
      return
    }
    if (o.activeTab === 'address' && isAdminRole.value) {
      o.goToAmount()
      return
    }
    if (!o.orderSubmitting) void o.submitPreorder()
  }

  function runSecondaryAction() {
    hapticSelection()
    if (o.activeTab === 'creative') {
      o.goBackToVehicle()
      return
    }
    if (o.activeTab === 'address' || o.activeTab === 'amount') {
      o.goBackToCreative()
    }
  }

  function syncNativeButtons() {
    const tg = getTelegramWebApp()
    const main = tg?.MainButton
    const secondary = tg?.SecondaryButton
    hasNativeMainButton.value = Boolean(main)
    hasNativeSecondaryButton.value = Boolean(secondary)

    if (!main) return
    if (!useNativeOrderFooter.value) {
      main.hideProgress?.()
      main.hide()
      secondary?.hide()
      return
    }
    setButtonText(main, primaryLabel.value)
    setButtonActive(main, !o.orderSubmitting)
    if (o.orderSubmitting) main.showProgress?.(true)
    else main.hideProgress?.()
    main.show()

    if (!secondary) return
    if (hasSecondaryAction.value) {
      setButtonText(secondary, secondaryLabel.value)
      setButtonActive(secondary, !o.orderSubmitting)
      secondary.show()
    }
    else {
      secondary.hide()
    }
  }

  onMounted(() => {
    const tg = getTelegramWebApp()
    tg?.MainButton?.onClick(runPrimaryAction)
    tg?.SecondaryButton?.onClick(runSecondaryAction)
    tg?.enableClosingConfirmation?.()
    syncNativeButtons()
  })

  onUnmounted(() => {
    const tg = getTelegramWebApp()
    tg?.MainButton?.offClick?.(runPrimaryAction)
    tg?.SecondaryButton?.offClick?.(runSecondaryAction)
    tg?.MainButton?.hide()
    tg?.MainButton?.hideProgress?.()
    tg?.SecondaryButton?.hide()
    tg?.disableClosingConfirmation?.()
  })

  watchEffect(syncNativeButtons)

  watch(
    () => o.orderSubmitError,
    (msg) => {
      if (msg) hapticWarning()
    },
  )

  watch(
    () => o.postSubmitModalOpen,
    (open) => {
      if (open) hapticSuccess()
    },
  )

  return {
    useNativeOrderFooter,
  }
}
