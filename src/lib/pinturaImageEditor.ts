import {
  blobToFile,
  getEditorDefaults,
  openDefaultEditor,
} from '@pqina/pintura'
import type { PinturaEditorDefaultOptions } from '@pqina/pintura'
import '@pqina/pintura/pintura.css'

type ProcessDetail = {
  dest?: File | Blob
  src?: File | Blob
}

/**
 * 使用 Pintura 默认全屏编辑器编辑图片；确认后返回新 File，取消或关闭返回 null。
 */
export function openPinturaEditImage(
  file: File,
  overrides?: Partial<PinturaEditorDefaultOptions> & Record<string, unknown>,
): Promise<File | null> {
  return new Promise((resolve) => {
    let finished = false

    const finish = (out: File | null) => {
      if (finished) return
      finished = true
      resolve(out)
    }

    const editor = openDefaultEditor({
      ...getEditorDefaults(),
      src: file,
      ...(overrides ?? {}),
    } as PinturaEditorDefaultOptions)

    editor.on('process', (detail: ProcessDetail) => {
      const blob = detail?.dest ?? detail?.src
      if (!blob) {
        finish(null)
        return
      }
      if (blob instanceof File) {
        finish(blob)
        return
      }
      finish(blobToFile(blob, file.name, blob.type))
    })

    editor.on('close', () => {
      finish(null)
    })
  })
}
