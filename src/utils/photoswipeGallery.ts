/*
 * @Author: wxy2003c 774078984@qq.com
 * @Date: 2026-04-28 11:26:19
 * @LastEditors: wxy2003c 774078984@qq.com
 * @LastEditTime: 2026-04-28 11:29:50
 * @FilePath: \vite-project\src\utils\photoswipeGallery.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 使用 PhotoSwipe 5 全屏看图（无业务模态框）。
 * 打开前探测各图自然尺寸，便于 initialZoomLevel: fit 完整显示、不拉伸铺满。
 */

export type PhotoSwipeSlideInput = {
  src: string
  /** 可选说明，写入 slide `alt`（部分主题可作说明） */
  title?: string
  /** 若已知像素尺寸（如缩略图同源），可改善首帧比例 */
  width?: number
  height?: number
}

/** 与当前视窗大致同比例，仅作探测失败时的兜底 */
function placeholderDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1920, height: 1080 }
  const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1))
  const w = Math.max(640, Math.round(window.innerWidth * dpr))
  const h = Math.max(480, Math.round(window.innerHeight * dpr))
  return { width: w, height: h }
}

function probeImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w > 0 && h > 0)
        resolve({ width: w, height: h })
      else
        resolve(placeholderDimensions())
    }
    img.onerror = () => resolve(placeholderDimensions())
    img.src = src
  })
}

/**
 * 打开 PhotoSwipe；动态加载 `photoswipe` 与样式，避免首屏体积。
 */
export async function openPhotoSwipeGallery(
  slides: PhotoSwipeSlideInput[],
  startIndex = 0,
): Promise<void> {
  const list = slides.filter((s) => String(s.src ?? '').trim())
  if (!list.length) return

  const [{ default: PhotoSwipe }] = await Promise.all([
    import('photoswipe'),
    import('photoswipe/style.css'),
  ])

  const index = Math.min(Math.max(0, startIndex), list.length - 1)
  const ph = placeholderDimensions()
  const dataSource = await Promise.all(
    list.map(async (s) => {
      let w = typeof s.width === 'number' && s.width > 0 ? s.width : 0
      let h = typeof s.height === 'number' && s.height > 0 ? s.height : 0
      if (w <= 0 || h <= 0) {
        const dim = await probeImageNaturalSize(String(s.src))
        w = dim.width
        h = dim.height
      }
      if (w <= 0 || h <= 0) {
        w = ph.width
        h = ph.height
      }
      return {
        src: s.src,
        width: w,
        height: h,
        alt: String(s.title ?? '').trim() || undefined,
      }
    }),
  )

  const pswp = new PhotoSwipe({
    dataSource,
    index,
    showHideAnimationType: 'zoom',
    bgOpacity: 0.92,
    loop: true,
    /** 完整图落在视口内（object-fit: contain 观感），可双指/双击适度放大 */
    initialZoomLevel: 'fit',
    pinchToClose: false,
    wheelToZoom: false,
  })
  pswp.init()
}
