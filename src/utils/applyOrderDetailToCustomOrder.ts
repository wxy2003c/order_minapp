import { type OrderDetailResponse, parseWheelLibraryStructureSubtypeOffroad } from '@/api/orders'
import type { StyleModelItem } from '@/api/styleModels'
import {
  collectImgUrlsForSlot,
  fieldFromOrder,
  firstOrderListImageForSlot,
  specGet,
  str,
} from '@/utils/orderDetailHelpers'
import { colorSampleFromUrl, resolveOrderAssetUrl } from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'

type AnyRec = Record<string, unknown>

function resolveImg(u: string): string {
  return resolveOrderAssetUrl(u) || u
}

/**
 * 造型 / 轮辋参考（`wheelShapeUrl` / `wheelLipUrl` ↔ `color_sample`）：
 * 优先 `imgs` 槽位 `color_sample`；否则根字段 `color_sample` 数组。
 * 不再把 `wheel_color` 混进此项（轮毂颜色见 `imgs` → `wheel_color` / `wheel_color_image`）。
 */
function colorSampleUrlsFromOrder(
  o: AnyRec,
  d: OrderDetailResponse,
): { u0: string; u1: string } {
  const slotUrls = collectImgUrlsForSlot(d, 'color_sample')
  if (slotUrls.length) {
    return { u0: slotUrls[0] ?? '', u1: slotUrls[1] ?? '' }
  }
  const cs = o.color_sample
  if (Array.isArray(cs) && cs.length) {
    return {
      u0: resolveImg(str((cs[0] as AnyRec).url || (cs[0] as AnyRec).path)),
      u1: resolveImg(
        str((cs[1] as AnyRec)?.url || (cs[1] as AnyRec)?.path || ''),
      ),
    }
  }
  return { u0: '', u1: '' }
}

export interface TgSelectOption {
  value: string | number
  label: string
}

/**
 * 从路由 query 取订单主键（`orderId` 或兼容旧的 `id`）。
 */
export function orderIdFromRouteQuery(
  q: Record<string, string | string[] | null | undefined>,
): string {
  const raw = q.orderId ?? q.id
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim()
  if (raw == null) return ''
  return String(raw).trim()
}

/**
 * 将 API 的 `5x112` 类 PCD 拆成左/右两段，供前/后轮 PCD 双输入框使用。
 */
export function splitPcdSegment(p: string | null | undefined): [string, string] {
  const s = String(p ?? '').trim()
  if (!s) return ['', '']
  const m = s.split(/[xX×]/)
  return [m[0]?.trim() ?? '', m[1]?.trim() ?? '']
}

/** 与定制单「孔型」三选一一致；历史订单可能仍为旋口/直孔 */
function normalizeHoleType(v: string): string {
  if (!v) return v
  const m: Record<string, string> = { 旋口: '锥口', 直孔: '平口' }
  return m[v] ?? v
}

/**
 * 在下拉 options 中按 `label` 或 `value` 命中一项，得到表单里应保存的 `value`。
 */
export function findSelectValue(
  options: TgSelectOption[] | undefined,
  queryLabel: string,
): string {
  const t = queryLabel.trim()
  if (!t || !options?.length) return ''
  const byLabel = options.find(o => o.label === t)
  if (byLabel) return String(byLabel.value)
  const byVal = options.find(o => String(o.value) === t)
  if (byVal) return String(byVal.value)
  return ''
}

function firstArrayUrl(x: unknown, index: number): string {
  if (!Array.isArray(x) || !x[index]) return ''
  const o = x[index] as AnyRec
  return str(o.url ?? o.path ?? o.thumbnail ?? '')
}

/**
 * 将详情接口返回的订单对象，同步写入「车辆 / 创作 / 地址 / 金额」四块表单中可直接映射的字段
 *（不含依赖 Wheel-Size 异步下拉的 `brand`/`model`/`wheelGeneration` 等，见页面内 `hydrateWheelSizeChain`）。
 */
export function applyOrderDetailToCustomOrderForms(
  d: OrderDetailResponse,
  forms: {
    vehicleForm: {
      customerName: string
      customerId: string
      brand: string
      model: string
      wheelGeneration: string
      wheelYear: string
      wheelModification: string
      brakeDisc: string
      mirrorPair: boolean
      frontSize: string
      frontQuantity: string
      frontWidth: string
      frontEt: string
      frontPcdLeft: string
      frontPcdRight: string
      frontCb: string
      frontPaint: string
      frontHole: string
      frontBoltSeat: string
      rearSize: string
      rearQuantity: string
      rearWidth: string
      rearEt: string
      rearPcdLeft: string
      rearPcdRight: string
      rearCb: string
      rearPaint: string
      rearHole: string
      rearBoltSeat: string
      vin: string
      plate: string
      rimThickness: string
    }
    creativeForm: {
      designMode: string
      structure: string
      finishCardId: number | null
      finishCardOrderNote: string
      finishCardImageUrl: string
      finishCardImagePath: string
      wheelColorSelectionDesc: string
      wheelShapeFile: File | null
      wheelLipFile: File | null
      centerCapFile: File | null
      wheelShapeUrl: string
      wheelLipUrl: string
      centerCapUrl: string
      wheelShapeNote: string
      wheelColorNote: string
      centerCapNote: string
      centerCapTexture: string
      specialRequest: string
      selectedStyleModel: StyleModelItem | null
    }
    addressForm: {
      name: string
      phone: string
      email: string
      country: string
      address: string
      coupon: string
      remark: string
    }
    amountForm: { basePrice: string; currency: string }
  },
  countryOptions: TgSelectOption[],
): void {
  const o = d as AnyRec
  const specs = (o.specs && typeof o.specs === 'object' && !Array.isArray(o.specs) ? o.specs : null) as AnyRec | null
  const fv = (keys: string[]) => fieldFromOrder(o, specs ?? undefined, keys)

  const structure = fv(['structure', '结构'])
  const rootSpecMode = str(o.spec_mode)
  const specsMode = specGet(specs, 'spec_mode')
  const sizeChoice = fv(['size_choice', 'f_diam', '尺寸'])
  const [fpL, fpR] = splitPcdSegment(fv(['f_pcd', 'PCD', '前孔距']))
  const [rpL, rpR] = splitPcdSegment(fv(['r_pcd', '后轮PCD', '后孔距']))

  forms.vehicleForm.customerName = str(o.customer) || forms.vehicleForm.customerName
  forms.vehicleForm.customerId
    = str(o.telegram_id || o.user_id) || str(o.customer_id) || forms.vehicleForm.customerId

  {
    const offRaw = fv(['structure_subtype_offroad'])
    const parsed = parseWheelLibraryStructureSubtypeOffroad(offRaw)
    const wgen = parsed.gen || fv(['wheel_generation'])
    const oRec = o as AnyRec
    const wmod
      = str(oRec.vehicle_model ?? oRec.vehicleModel) || fv(['wheel_modification']) || parsed.mod
    if (wgen) forms.vehicleForm.wheelGeneration = wgen
    if (wmod) forms.vehicleForm.wheelModification = wmod
  }

  /** 年款以根字段 `year` 为准（与详情接口一致） */
  forms.vehicleForm.wheelYear = str(o.year) || fv(['year', '年款', '车型年']) || forms.vehicleForm.wheelYear

  forms.vehicleForm.vin = fv(['vin', 'VIN', '车架号']) || str(o.车架号)
  forms.vehicleForm.plate
    = str(o.chassis) || fv(['chassis', '底盘', '车牌', '牌', '车型代码'])
  forms.vehicleForm.brakeDisc
    = fv(['brake_disc', '刹车盘', '轴重']) || str(o.brake_disc)
  forms.vehicleForm.rimThickness = fv(['caliper', '卡钳']) || str(o.卡钳)

  forms.vehicleForm.frontSize = normalizeInchDiamString(
    sizeChoice || fv(['f_diam', '尺寸', '前轮尺寸']) || forms.vehicleForm.frontSize,
  )
  forms.vehicleForm.frontQuantity = fv(['f_qty', '前轮数量', '前数量']) || str(o.f_qty)
  forms.vehicleForm.frontWidth = fv(['f_width', '前轮J值', '前J']) || str(o.f_width)
  forms.vehicleForm.frontEt = fv(['f_et', '前轮ET', '前ET']) || str(o.f_et)
  forms.vehicleForm.frontPcdLeft = fpL
  forms.vehicleForm.frontPcdRight = fpR
  forms.vehicleForm.frontCb = fv(['f_cb', 'CB', '前轮CB', '中孔']) || str(o.f_cb)
  forms.vehicleForm.frontPaint = fv(['appearance', '表面处理', '涂装']) || str(o.appearance)
  forms.vehicleForm.frontHole = normalizeHoleType(
    fv(['f_hole', '孔型', '孔形']) || str(o.f_hole),
  )
  forms.vehicleForm.frontBoltSeat = fv(['f_oem_bolt', '原车螺丝', '螺丝']) || str(o.f_oem_bolt)

  forms.vehicleForm.rearSize = normalizeInchDiamString(
    fv(['r_diam', '后轮尺寸', '后寸']) || str(o.r_diam),
  )
  forms.vehicleForm.rearQuantity = fv(['r_qty', '后轮数量']) || str(o.r_qty)
  forms.vehicleForm.rearWidth = fv(['r_width', '后轮J值', '后J']) || str(o.r_width)
  forms.vehicleForm.rearEt = fv(['r_et', '后轮ET', '后ET']) || str(o.r_et)
  forms.vehicleForm.rearPcdLeft = rpL
  forms.vehicleForm.rearPcdRight = rpR
  forms.vehicleForm.rearCb = fv(['r_cb', '后轮CB', '后中孔']) || str(o.r_cb)
  if (!forms.vehicleForm.rearCb && forms.vehicleForm.frontCb) forms.vehicleForm.rearCb = forms.vehicleForm.frontCb
  forms.vehicleForm.rearPaint = fv(['r_appearance', '后轮涂装']) || str(o.r_appearance) || forms.vehicleForm.frontPaint
  forms.vehicleForm.rearHole = normalizeHoleType(
    fv(['r_hole', '后轮孔型', '后孔型']) || str(o.r_hole),
  )
  forms.vehicleForm.rearBoltSeat
    = fv(['r_oem_bolt', '后轮原车螺丝', '后螺丝']) || str(o.r_oem_bolt)

  const rootSm = rootSpecMode.trim().toLowerCase()
  if (specsMode === 'split' || specsMode === '分轮' || rootSm === 'split') {
    forms.vehicleForm.mirrorPair = false
  } else if (specsMode === 'same' || rootSm === 'same' || rootSm === 'mirror' || rootSm === 'same_front_rear') {
    forms.vehicleForm.mirrorPair = true
  } else {
    const fw = fv(['f_width', '前轮J值']) || str(o.f_width)
    const rw = fv(['r_width', '后轮J值']) || str(o.r_width)
    const fsize = normalizeInchDiamString(
      sizeChoice || fv(['f_diam', '尺寸']) || str(o.f_diam),
    )
    const rsize = normalizeInchDiamString(fv(['r_diam', '后轮尺寸']) || str(o.r_diam))
    if (fw && rw && fw === rw && fsize && rsize && fsize === rsize) {
      forms.vehicleForm.mirrorPair = true
    }
  }

  let dm = rootSpecMode
  if (dm !== 'custom' && dm !== 'creative') dm = 'creative'
  if (['split', 'same'].includes(rootSm)) {
    /* 顶层把 split/same 误放在 spec_mode 时仍只控制镜像，不当下拉 designMode */
    dm = 'creative'
  }
  forms.creativeForm.designMode = dm
  if (structure) forms.creativeForm.structure = structure

  {
    const cm = str(o.car_model)
    const sn = str(o.style_name)
    if (cm && /^WL[-—]/i.test(cm)) {
      forms.creativeForm.selectedStyleModel = {
        id: 0,
        parent_id: null,
        style_no: cm,
        style_name: sn,
        brand: '',
        model: '',
        structure_type: structure || str(o.structure),
        spoke_type: '',
        spoke_count: null,
        directional: false,
        style_tags: [],
        enabled: true,
        cover_image: '',
        created_at: '',
        children: [],
      }
    }
  }

  const { u0, u1 } = colorSampleUrlsFromOrder(o, d)
  if (u0) forms.creativeForm.wheelShapeUrl = u0
  if (u1) forms.creativeForm.wheelLipUrl = u1

  /** 中心盖预览：优先 `imgs` 槽位 `cover`，否则 `cover_image` / 可解析的图片 `cover` 字符串 */
  const coverFromImgs = collectImgUrlsForSlot(d, 'cover')
  if (coverFromImgs[0]) {
    forms.creativeForm.centerCapUrl = coverFromImgs[0]
  } else {
    const ci = o.cover_image
    if (Array.isArray(ci) && firstArrayUrl(ci, 0)) {
      const cup = firstArrayUrl(ci, 0)
      if (cup) forms.creativeForm.centerCapUrl = resolveImg(cup)
    } else {
      const coverRaw = str(o.cover)
      if (coverRaw) {
        const isImg
          = /(\.(jpe?g|png|webp|gif|svg))(\?|$)/i.test(coverRaw) || /^(https?:)?\/\//i.test(coverRaw) || coverRaw.startsWith('/storage/') || (coverRaw.startsWith('/') && !coverRaw.trim().includes(' '))
        if (isImg) forms.creativeForm.centerCapUrl = resolveImg(coverRaw) || coverRaw
      }
    }
  }

  /** 轮毂颜色色卡图：优先 `imgs` 槽位 `wheel_color`，否则 `wheel_color_image` */
  const wcImg = firstOrderListImageForSlot(d, 'wheel_color')
  if (wcImg) {
    const urlRaw = str(wcImg.url || wcImg.path)
    const url = (resolveOrderAssetUrl(urlRaw) || resolveImg(urlRaw) || urlRaw).trim()
    if (url) {
      forms.creativeForm.finishCardImageUrl = url
      const path = str(wcImg.path)
      if (path) {
        forms.creativeForm.finishCardImagePath = path
      } else {
        const parsed = colorSampleFromUrl(url)
        if (parsed) forms.creativeForm.finishCardImagePath = parsed.path
      }
    }
  } else {
    const wci = o.wheel_color_image
    if (Array.isArray(wci) && wci[0]) {
      const row = wci[0] as AnyRec
      const url = str(row.url)
      const path = str(row.path)
      if (url) forms.creativeForm.finishCardImageUrl = resolveImg(url) || url
      if (path) {
        forms.creativeForm.finishCardImagePath = path
      } else if (url) {
        const parsed = colorSampleFromUrl(url)
        if (parsed) forms.creativeForm.finishCardImagePath = parsed.path
      }
    }
  }

  forms.creativeForm.wheelShapeNote = str(o.color_sample_desc) || specGet(specs, '色样说明')
  forms.creativeForm.wheelColorSelectionDesc = str(o.wheel_color_desc)
  forms.creativeForm.wheelColorNote
    = str(o.f_note) || str(o.finish) || fv(['finish', '表面处理', '轮辋']) || str((o as AnyRec)['颜色']) || specGet(specs, '颜色说明') || specGet(specs, '备注')
  {
    const capTxt = str(o.center_cap) || fv(['中心盖', '中心盖说明'])
    const coverText = typeof o.cover === 'string' && o.cover && !/(\.(jpe?g|png|webp|gif|svg))(\?|$)/i.test(o.cover) && !/^(https?:)?\/\//i.test(o.cover) && !o.cover.startsWith('/storage/') ? o.cover.trim() : ''
    forms.creativeForm.centerCapNote = capTxt || coverText
  }
  forms.creativeForm.specialRequest = str(o.special_req) || fv(['特殊', '要求', '其他'])

  forms.addressForm.phone = fv(['customer_phone', '手机', '电话']) || str(o.customer_phone)
  forms.addressForm.email = fv(['customer_email', '邮箱']) || str(o.customer_email)
  forms.addressForm.address = fv(['shipping_address', '地址', '收货']) || str(o.shipping_address)
  const countryStr = fv(['country', '国家']) || str(o.country)
  if (countryStr) {
    const val = findSelectValue(countryOptions, countryStr)
    forms.addressForm.country = val || str(o.country_code) || forms.addressForm.country
  }
  forms.addressForm.coupon = fv(['coupon', '优惠券']) || str(o.coupon)
  forms.addressForm.remark
    = fv(['remark', 'notes', '买家备注', '留言']) || str(o.remark) || str(o.notes as string) || str(o.备注 as string)

  const base
    = fv(['base_price', '应付'])
    || (o.base_price != null && String(o.base_price) !== '' ? str(o.base_price) : '')
  const totalStr = o.total != null && String(o.total) !== '' ? str(o.total) : ''
  const dueStr = o.due != null && String(o.due) !== '' ? str(o.due) : ''
  if (base) forms.amountForm.basePrice = base
  else if (dueStr) forms.amountForm.basePrice = dueStr
  else if (totalStr) forms.amountForm.basePrice = totalStr
  forms.amountForm.currency = fv(['currency', '币别']) || str(o.currency) || forms.amountForm.currency
}

/**
 * 详情接口里 `car` 为后端拼接的「品牌 + 空格 + 型号」（如 `Aiways WL-M-070`），需拆开再匹配 Wheel-Size 下拉。
 */
export function splitOrderDetailCarField(carRaw: unknown): { brand: string; model: string } {
  const car = str(carRaw).trim()
  if (!car) return { brand: '', model: '' }
  const parts = car.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return { brand: parts[0] ?? '', model: parts.slice(1).join(' ') }
  }
  return { brand: '', model: car }
}

/**
 * 供 Wheel-Size 模式在加载完 `wsBrandOptions` 后，用接口里的品牌/型号 label 再解析成下拉 value。
 * 优先从根字段 `car` 拆分；若无 `car` 再回退 `car_brand` / `car_model` / `specs`。
 */
export function brandModelLabelsFromDetail(d: OrderDetailResponse): { brand: string; model: string } {
  const o = d as AnyRec
  const specs = (o.specs && typeof o.specs === 'object' && !Array.isArray(o.specs) ? o.specs : null) as AnyRec | null

  const fromCar = splitOrderDetailCarField(o.car)
  if (fromCar.brand || fromCar.model) return fromCar

  let brand = str(o.car_brand || specGet(specs, '品牌'))
  const cm = str(o.car_model)
  let model = str(specGet(specs, '车型') || specGet(specs, '型号'))
  if (!model && cm && !/^WL[-—]/i.test(cm)) model = cm
  return { brand, model }
}
