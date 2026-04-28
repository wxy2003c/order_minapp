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
 */

export type PhotoSwipeSlideInput = {
  src: string
  /** 可选说明，写入 slide `alt`（部分主题可作说明） */
  title?: string
}

function probeImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 1920,
        height: img.naturalHeight || 1080,
      })
    img.onerror = () => resolve({ width: 1920, height: 1080 })
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
  const dataSource = await Promise.all(
    list.map(async (s) => {
      const { width, height } = await probeImageSize(s.src)
      return {
        src: s.src,
        width,
        height,
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
  })
  pswp.init()
}
