import httpApi from '@/utils/http'

export type UploadedImageRef = {
  url: string
  path?: string
  name?: string
}

export type UploadImageOptions = {
  fileFieldName?: string
  fileName?: string
  formFields: Record<string, string>
}

const assetOrigin = (import.meta.env.VITE_ORDER_ASSET_ORIGIN as string | undefined) ?? ''

/** 把接口返回的 path/url 与资源域名拼成可访问的绝对地址 */
function resolveAssetPublicUrl(
  res: { url?: unknown; path?: unknown; name?: unknown } | null | undefined,
): { url: string; path?: string; name?: string } {
  if (!res || typeof res !== 'object')
    return { url: '' }
  const u = res.url
  const p = res.path
  const name = res.name
  const rel
    = (typeof u === 'string' && u.trim() ? u.trim() : null)
    ?? (typeof p === 'string' && p.trim() ? p.trim() : null)
    ?? ''
  if (!rel)
    return { url: '' }
  if (/^https?:\/\//i.test(rel))
    return { url: rel, path: typeof p === 'string' ? p : undefined, name: typeof name === 'string' ? name : undefined }
  const base = assetOrigin.replace(/\/$/, '')
  const pathPart = rel.startsWith('/') ? rel : `/${rel}`
  return {
    url: base ? `${base}${pathPart}` : pathPart,
    path: typeof p === 'string' ? p : undefined,
    name: typeof name === 'string' ? name : undefined,
  }
}

/**
 * `POST /upload/image`：`multipart/form-data` 先 `file` 再 `formFields`。
 * 走 `httpApi` 签名头；响应用 `VITE_ORDER_ASSET_ORIGIN` 与 `url` / `path` 拼完整 URL。
 */
export async function uploadImage(
  blob: File | Blob,
  options: UploadImageOptions,
): Promise<UploadedImageRef> {
  const field = options.fileFieldName ?? 'file'
  const name
    = options.fileName
    ?? (blob instanceof File ? blob.name : `image_${Date.now()}.jpg`)

  const formData = new FormData()
  formData.append(field, blob, name)
  for (const [k, v] of Object.entries(options.formFields))
    formData.append(k, v)

  const res: unknown = await httpApi.post('/upload/image', formData, {
    timeout: 120000,
  })
  return resolveAssetPublicUrl(
    res && typeof res === 'object' ? (res as Record<string, unknown>) : null,
  )
}
