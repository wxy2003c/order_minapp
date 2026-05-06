import { ref } from 'vue'
import httpApi from '@/utils/http'
import { getTelegramUserId } from '@/utils/userTelegram'
export * from './orders'

/** 与 `/users/detail` 约定：elevated 为 id===1 且 name 为下列之一 */
const ELEVATED_ROLE_NAMES = new Set(['超级管理员', '小程序审核员'])

export type UserRoleSnapshot = { id: number; name: string }
export type CurrentUserRole = 'admin' | 'user'

export function extractUserRoleFromDetailPayload(raw: unknown): UserRoleSnapshot | null {
  if (raw == null || typeof raw !== 'object') return null
  const root = raw as Record<string, unknown>
  const inner = root.data != null && typeof root.data === 'object' && !Array.isArray(root.data)
    ? (root.data as Record<string, unknown>)
    : root
  const userObj = (inner.user ?? inner) as Record<string, unknown> | undefined
  if (!userObj || typeof userObj !== 'object') return null
  const roleRaw = userObj.role
  if (!roleRaw || typeof roleRaw !== 'object' || Array.isArray(roleRaw)) return null
  const r = roleRaw as Record<string, unknown>
  const id = typeof r.id === 'number' && Number.isFinite(r.id) ? r.id : parseInt(String(r.id ?? ''), 10)
  const name = String(r.name ?? '').trim()
  if (!Number.isFinite(id) || !name) return null
  return { id, name }
}

/** 是否走管理员端订单等接口（`@/api/admin/orders`） */
export function isElevatedStaffRole(role: UserRoleSnapshot | null | undefined): boolean {
  if (!role) return false
  return role.id === 1 && ELEVATED_ROLE_NAMES.has(role.name)
}

let usesAdminOrderEndpoints = false
/** Vue ref — computed() 可追踪变化，fetchUserDetail 回调后 UI 自动更新 */
const currentUserRoleRef = ref<CurrentUserRole>('user')
/** 单例 Promise：只在「没有 user_id 时的首次」或「显式调用 refreshUserRole」时才重新请求 */
let userDetailPromise: Promise<unknown> | null = null
let lastFetchedUserId = ''

function applyRoleRoutingFromDetailRaw(raw: unknown) {
  try {
    const role = extractUserRoleFromDetailPayload(raw)
    usesAdminOrderEndpoints = isElevatedStaffRole(role)
    currentUserRoleRef.value = usesAdminOrderEndpoints ? 'admin' : 'user'
  } catch {
    usesAdminOrderEndpoints = false
    currentUserRoleRef.value = 'user'
  }
}

/**
 * 拉取用户详情并缓存角色结果。
 * 同一个 user_id 只请求一次；切换用户（user_id 变化）时自动重新请求。
 */
export function fetchUserDetail(): Promise<unknown> {
  const selfId = getTelegramUserId().trim()
  // user_id 改变时（如深链切换用户）或首次，重新请求
  if (selfId !== lastFetchedUserId) {
    userDetailPromise = null
    lastFetchedUserId = selfId
  }
  userDetailPromise ??= httpApi
    .get('/users/detail', selfId ? { params: { user_id: selfId } } : undefined)
    .then((raw) => {
      applyRoleRoutingFromDetailRaw(raw)
      return raw
    })
    .catch((err) => {
      // 失败时重置缓存，下次调用会重新请求
      userDetailPromise = null
      lastFetchedUserId = ''
      usesAdminOrderEndpoints = false
      currentUserRoleRef.value = 'user'
      console.warn('[auth] /users/detail failed, defaulting to user role:', err?.message ?? err)
      return null
    })
  return userDetailPromise
}

/** 用户信息接口；供角色分发器按需统一导出 */
export const getUserInfo = fetchUserDetail

/** 从用户详情解析后的当前角色：`admin` 走 `api/admin/`，`user` 走 `api/user/`。
 *  返回 ref.value，Vue computed() 会自动追踪依赖、fetchUserDetail 后触发 UI 更新。 */
export function getCurrentUserRole(): CurrentUserRole {
  return currentUserRoleRef.value
}

/** 订单等模块在发起分支请求前 await，确保 fetchUserDetail 完成后再分发 */
export async function ensureOrderApiRoutingReady(): Promise<void> {
  await fetchUserDetail()
}

/** 是否使用管理员端订单接口（否则用 `@/api/user/orders`） */
export function useFullStaffOrderEndpoints(): boolean {
  return usesAdminOrderEndpoints
}

/**
 * 用当前 SDK 用户自己的 ID 请求 `/users/detail`，返回是否有管理员权限。
 * 不受 platformUid（代客深链）影响，始终校验操作者本人身份。
 * API 请求失败时抛出异常（由调用方决定回退策略）；
 * 请求成功但角色不足时返回 false。
 */
export async function checkCurrentUserHasStaffAccess(): Promise<boolean> {
  const selfId = getTelegramUserId().trim()
  if (!selfId) return false
  const raw = await httpApi.get('/users/detail', { params: { user_id: selfId } })
  return isElevatedStaffRole(extractUserRoleFromDetailPayload(raw))
}
