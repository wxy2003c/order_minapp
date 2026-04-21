declare module 'vue-filepond' {
  import type { DefineComponent } from 'vue'

  const VueFilePond: (...plugins: unknown[]) => DefineComponent<Record<string, unknown>, unknown, unknown>
  export default VueFilePond
}

declare module 'filepond-plugin-image-preview' {
  const FilePondPluginImagePreview: unknown
  export default FilePondPluginImagePreview
}

declare module 'filepond-plugin-image-crop' {
  const FilePondPluginImageCrop: unknown
  export default FilePondPluginImageCrop
}

declare module 'filepond-plugin-image-resize' {
  const FilePondPluginImageResize: unknown
  export default FilePondPluginImageResize
}

declare module 'filepond-plugin-image-filter' {
  const FilePondPluginImageFilter: unknown
  export default FilePondPluginImageFilter
}

declare module 'filepond-plugin-image-transform' {
  const FilePondPluginImageTransform: unknown
  export default FilePondPluginImageTransform
}
