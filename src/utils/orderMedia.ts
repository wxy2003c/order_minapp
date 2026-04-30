/**
 * 订单相关图片：上传回写格式与静态资源地址解析（与后端 `path` / `url` 字段约定一致）。
 */

/** 提交给后端的色卡/造型图结构 */
export type ColorSampleImage = { path: string; url: string; name: string }

/**
 * 将单条图片 URL 转为后端 `color_sample` 等需要的 `{ path, url, name }`。
 * @param raw 绝对或相对地址；解析失败则返回 `null`
 */
export function colorSampleFromUrl(raw: string | null | undefined): ColorSampleImage | null {
  const s = String(raw ?? '').trim()
  if (!s) return null

  /** 绝对地址：落库字段 `url` 须为完整地址（Wheel-Size CDN、外链等），不能只剩 pathname。 */
  if (/^https?:\/\//i.test(s)) {
    let pathname = ''
    try {
      pathname = new URL(s).pathname || '/'
    } catch {
      return null
    }
    if (!pathname.startsWith('/')) pathname = `/${pathname.replace(/^\/+/, '')}`
    const segs = pathname.split('/').filter(Boolean)
    const name = segs[segs.length - 1] || 'image'
    const upIdx = pathname.indexOf('/uploads/')
    const pathField = upIdx >= 0
      ? pathname.slice(upIdx + 1)
      : (pathname.replace(/^\//, '') || name)
    return { path: pathField, url: s, name }
  }

  let pathname = s
  if (!pathname.startsWith('/')) pathname = `/${pathname.replace(/^\/+/, '')}`
  const segs = pathname.split('/').filter(Boolean)
  const name = segs[segs.length - 1] || 'image'
  const upIdx = pathname.indexOf('/uploads/')
  const pathField = upIdx >= 0 ? pathname.slice(upIdx + 1) : `uploads/orders/${name}`
  return { path: pathField, url: pathname, name }
}

/**
 * 将多条 URL 去空后逐条 `colorSampleFromUrl`，用于 `color_sample` / `wheel_color_image` 数组。
 */
export function colorSampleListFromUrls(urls: (string | null | undefined)[]): ColorSampleImage[] {
  const out: ColorSampleImage[] = []
  for (const u of urls) {
    const e = colorSampleFromUrl(u)
    if (e) out.push(e)
  }
  return out
}

/**
 * 轮毂颜色参考图：`name` / `imgs[].label` 用语卡 `code`（或 `finish:id`）落库，便于详情与色卡列表匹配回显。
 */
export function enrichWheelColorSampleWithFinishCode(
  img: ColorSampleImage,
  finishCode: string,
): ColorSampleImage {
  const c = String(finishCode ?? '').trim()
  if (!c) return img
  return { ...img, name: c }
}

/**
 * 轮毂色卡图：优先用可解析的 `image_url`；否则用 `image_path`（如 `uploads/orders/xxx.webp`）
 * 生成与后端一致的 `{ path, url, name }`（`url` 形如 `/storage/uploads/...`）。
 */
export function colorSampleFromOrderImageFields(
  imageUrl: string | null | undefined,
  imagePath: string | null | undefined,
): ColorSampleImage | null {
  const u = String(imageUrl ?? '').trim()
  if (u) {
    const e = colorSampleFromUrl(u)
    if (e) return e
  }
  let rawPath = String(imagePath ?? '').trim().replace(/^\/+/, '')
  if (!rawPath) return null
  rawPath = rawPath.replace(/^storage\//i, '')
  const pathField = rawPath.includes('uploads/')
    ? (rawPath.startsWith('uploads/') ? rawPath : rawPath.slice(rawPath.indexOf('uploads/')))
    : `uploads/orders/${rawPath}`
  const segs = pathField.split('/').filter(Boolean)
  const name = segs[segs.length - 1] || 'image'
  const url = `/storage/${pathField}`
  return { path: pathField, url, name }
}

/**
 * 将接口返回的相对 `/storage/...` 与 `VITE_ORDER_ASSET_ORIGIN` 拼成浏览器可用的绝对地址。
 * @returns 无法解析时返回 `null`
 */
export function resolveOrderAssetUrl(url: string | null | undefined): string | null {
  const u = String(url ?? '').trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  const origin = (import.meta.env.VITE_ORDER_ASSET_ORIGIN as string | undefined)?.trim().replace(/\/$/, '') || ''
  const path = u.startsWith('/') ? u : `/${u}`
  return origin ? `${origin}${path}` : path
}
