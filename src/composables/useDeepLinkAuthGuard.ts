import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { checkCurrentUserHasStaffAccess } from '@/api/user/index'
import { useStaffDeeplinkStore } from '@/stores/staffDeeplink'

/**
 * 深链权限守卫。
 * 返回 `guardCheck()` 供 load() 调用：无权限时设置 noPermission=true 并返回 false，
 * 调用方收到 false 直接 return，不再发后续接口。
 * 结果仅校验一次（后续调用直接用缓存）。
 */
export function useDeepLinkAuthGuard() {
  const noPermission = ref(false)
  const router = useRouter()
  const staffDeeplink = useStaffDeeplinkStore()

  let _checked = false
  let _allowed = true

  async function guardCheck(): Promise<boolean> {
    if (_checked) return _allowed
    _checked = true

    if (!staffDeeplink.requiresStaffAccess) {
      _allowed = true
      return true
    }

    try {
      _allowed = await checkCurrentUserHasStaffAccess()
    } catch {
      // API 请求本身报错（网络/服务器异常），不拦截页面，放行并让后续接口自行处理
      _allowed = true
      return true
    }
    if (!_allowed) noPermission.value = true
    return _allowed
  }

  function goHome() {
    noPermission.value = false
    staffDeeplink.clearDeepLinkSession()
    void router.replace('/')
  }

  return { noPermission, goHome, guardCheck }
}
