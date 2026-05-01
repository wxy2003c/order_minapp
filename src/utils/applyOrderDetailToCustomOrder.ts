import {
  parseWheelLibraryStructureSubtypeOffroad,
  type OrderDetailResponse,
} from '@/utils/orderHelpers'
import type { StyleModelItem } from '@/api/rolesApi'
import {
  collectImgUrlsForSlot,
  fieldFromOrder,
  firstOrderListImageForSlot,
  specGet,
  str,
} from '@/utils/orderDetailHelpers'
import { colorSampleFromUrl, resolveOrderAssetUrl } from '@/utils/orderMedia'
import { normalizeInchDiamString } from '@/utils/wheelDiam'
import {
  CENTER_CAP_REF_IMAGE_MAX,
  WHEEL_SHAPE_REF_IMAGE_MAX,
} from '@/constants/customOrderCreative'

type AnyRec = Record<string, unknown>

function resolveImg(u: string): string {
  return resolveOrderAssetUrl(u) || u
}

/**
 * `color_sample` / imgs 槽位：多条造型参考 + 末尾一条轮辋参考（与提交流程 `[...shapes, lip]` 一致）。
 */
function colorSampleUrlListFromOrder(o: AnyRec, d: OrderDetailResponse): string[] {
  const slotUrls = collectImgUrlsForSlot(d, 'color_sample')
  if (slotUrls.length)
    return slotUrls.filter(Boolean)
  const cs = o.color_sample
  if (Array.isArray(cs) && cs.length) {
    return cs
      .map((item) => {
        return resolveImg(str((item as AnyRec).url || (item as AnyRec).path || ''))
      })
      .filter(Boolean)
  }
  return []
}

function distributeCreativeShapeAndLipUrls(
  o: AnyRec,
  d: OrderDetailResponse,
): { shapeUrls: string[]; lipUrl: string } {
  const list = colorSampleUrlListFromOrder(o, d)
  if (list.length >= 2) {
    return {
      shapeUrls: list.slice(0, -1),
      lipUrl: list[list.length - 1] ?? '',
    }
  }
  if (list.length === 1) return { shapeUrls: [list[0]!], lipUrl: '' }
  return { shapeUrls: [''], lipUrl: '' }
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

/** 重新定制：用 `orderId` 拉详情回填表单，但提交应新建订单，不作为编辑主键 */
export function isReorderModeFromRouteQuery(
  q: Record<string, string | string[] | null | undefined>,
): boolean {
  const raw = q.reorder
  if (Array.isArray(raw)) {
    const v = String(raw[0] ?? '').toLowerCase()
    return v === '1' || v === 'true'
  }
  if (raw == null || raw === '') return false
  const v = String(raw).toLowerCase()
  return v === '1' || v === 'true'
}

/**
 * 将 API 的 `5x112` 类 PCD 拆成左/右两段，供前/后轮 PCD 双输入框使用。
 */
function splitPcdSegment(p: string | null | undefined): [string, string] {
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
 * `relaxed`：精确匹配失败时尝试包含关系（适配 Wheel-Size 长文案 label）。
 */
export function findSelectValue(
  options: TgSelectOption[] | undefined,
  queryLabel: string,
  relaxed = false,
): string {
  const t = queryLabel.trim()
  if (!t || !options?.length) return ''
  const byLabel = options.find(o => o.label === t)
  if (byLabel) return String(byLabel.value)
  const byVal = options.find(o => String(o.value) === t)
  if (byVal) return String(byVal.value)
  if (relaxed && t.length >= 2) {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
    const tn = norm(t)
    const byIncludes = options.find((o) => {
      const ln = norm(String(o.label))
      if (!ln) return false
      return ln.includes(tn) || tn.includes(ln)
    })
    if (byIncludes) return String(byIncludes.value)
  }
  return ''
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
      carModelBodyImageUrl: string
    }
    creativeForm: {
      designMode: string
      structure: string
      finishCardId: number | null
      finishCardOrderNote: string
      finishCardImageUrl: string
      finishCardImagePath: string
      wheelColorSelectionDesc: string
      wheelShapeRefFiles: (File | null)[]
      wheelLipFile: File | null
      wheelColorRefFiles: (File | null)[]
      centerCapRefFiles: (File | null)[]
      wheelShapeRefUrls: string[]
      wheelLipUrl: string
      wheelColorRefUrls: string[]
      centerCapRefUrls: string[]
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
  options?: { skipWheelSizeLinkageFields?: boolean },
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

  forms.vehicleForm.customerName
    = str(o.telegram_nickname) || str((o as AnyRec).telegramNickname) || forms.vehicleForm.customerName
  forms.vehicleForm.customerId
    = str(o.telegram_id || o.user_id) || str(o.customer_id) || forms.vehicleForm.customerId

  if (!options?.skipWheelSizeLinkageFields) {
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
  }

  forms.vehicleForm.vin = fv(['vin', 'VIN', '车架号']) || str(o.车架号)
  forms.vehicleForm.plate
    = str(o.chassis) || fv(['chassis', '底盘', '车牌', '牌', '车型代码'])
  forms.vehicleForm.brakeDisc
    = fv(['brake_disc', '刹车盘', '轴重']) || str(o.brake_disc)
  forms.vehicleForm.rimThickness = fv(['caliper', '卡钳']) || str(o.卡钳)

  {
    const cm = o.car_model_imgs
    if (Array.isArray(cm) && cm[0]) {
      const row = cm[0] as AnyRec
      const rawU = str(row.url ?? row.path ?? '')
      if (rawU) forms.vehicleForm.carModelBodyImageUrl = resolveImg(rawU)
    }
  }

  forms.vehicleForm.frontSize = normalizeInchDiamString(
    sizeChoice || fv(['f_diam', '尺寸', '前轮尺寸']) || forms.vehicleForm.frontSize,
  )
  forms.vehicleForm.frontQuantity = fv(['f_qty', '前轮数量', '前数量']) || str(o.f_qty)
  forms.vehicleForm.frontWidth = fv(['f_width', '前轮J值', '前J']) || str(o.f_width)
  forms.vehicleForm.frontEt = fv(['f_et', '前轮ET', '前ET']) || str(o.f_et)
  forms.vehicleForm.frontPcdLeft = fpL
  forms.vehicleForm.frontPcdRight = fpR
  forms.vehicleForm.frontCb = fv(['f_cb', 'CB', '前轮CB', '中孔']) || str(o.f_cb)
  const wheelSurfaceOne =
    fv(['appearance', '表面处理', '涂装'])
    || str(o.appearance)
    || fv(['r_appearance', '后轮涂装'])
    || str(o.r_appearance)
  forms.vehicleForm.frontPaint = wheelSurfaceOne
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
  forms.vehicleForm.rearPaint = wheelSurfaceOne
  forms.vehicleForm.rearHole = normalizeHoleType(
    fv(['r_hole', '后轮孔型', '后孔型']) || str(o.r_hole),
  )
  forms.vehicleForm.rearBoltSeat
    = fv(['r_oem_bolt', '后轮原车螺丝', '后螺丝']) || str(o.r_oem_bolt)

  const specsModeStr = typeof specs?.spec_mode === 'string' ? specs.spec_mode.trim().toLowerCase() : ''
  const rootSm = rootSpecMode.trim().toLowerCase()
  if (
    specsMode === 'split'
    || specsMode === '分轮'
    || specsModeStr === 'split'
    || rootSm === 'split'
  ) {
    forms.vehicleForm.mirrorPair = false
  } else if (
    specsMode === 'same'
    || specsModeStr === 'same'
    || rootSm === 'same'
    || rootSm === 'mirror'
    || rootSm === 'same_front_rear'
  ) {
    forms.vehicleForm.mirrorPair = true
  } else {
    const g = (k: string) => str(o[k]).trim()
    const rearEmpty
      = !g('r_diam') && !g('r_width') && !g('r_et') && !g('r_pcd') && !g('r_cb')
        && !g('r_qty') && !g('r_hole') && !g('r_oem_bolt')
    if (rearEmpty) {
      forms.vehicleForm.mirrorPair = true
    } else {
      const appF = g('appearance')
      const appR = g('r_appearance') || appF
      forms.vehicleForm.mirrorPair = (
        g('f_diam') === g('r_diam')
        && g('f_width') === g('r_width')
        && g('f_et') === g('r_et')
        && g('f_pcd') === g('r_pcd')
        && g('f_cb') === g('r_cb')
        && g('f_hole') === g('r_hole')
        && g('f_qty') === g('r_qty')
        && g('f_oem_bolt') === g('r_oem_bolt')
        && appF === appR
      )
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
    const styleNoField = str(o.style_no)
    const cm = str(o.car_model)
    const styleNo = (styleNoField && isWlStyleToken(styleNoField))
      ? styleNoField
      : (cm && isWlStyleToken(cm) ? cm : '')
    const sn = str(o.style_name)
    if (styleNo || sn) {
      forms.creativeForm.selectedStyleModel = {
        id: 0,
        parent_id: null,
        style_no: styleNo,
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

  const { shapeUrls, lipUrl } = distributeCreativeShapeAndLipUrls(o, d)
  const cappedShape = shapeUrls.length
    ? shapeUrls.slice(0, WHEEL_SHAPE_REF_IMAGE_MAX)
    : []
  forms.creativeForm.wheelShapeRefUrls = cappedShape
  forms.creativeForm.wheelShapeRefFiles = forms.creativeForm.wheelShapeRefUrls.map(() => null)
  forms.creativeForm.wheelLipUrl = lipUrl

  /** 中心盖多图 */
  const coverFromImgs = collectImgUrlsForSlot(d, 'cover')
  const capCollected: string[] = [...coverFromImgs]
  if (!capCollected.length && Array.isArray(o.cover_image)) {
    for (const row of o.cover_image) {
      const rec = row as AnyRec
      const cup = str(rec.url ?? rec.path ?? '')
      if (cup) capCollected.push(resolveImg(cup) || cup)
    }
  }
  if (!capCollected.length) {
    const coverRaw = str(o.cover)
    if (coverRaw) {
      const isImg
        = /(\.(jpe?g|png|webp|gif|svg))(\?|$)/i.test(coverRaw) || /^(https?:)?\/\//i.test(coverRaw) || coverRaw.startsWith('/storage/') || (coverRaw.startsWith('/') && !coverRaw.trim().includes(' '))
      if (isImg) capCollected.push(resolveImg(coverRaw) || coverRaw)
    }
  }
  forms.creativeForm.centerCapRefUrls = capCollected.slice(0, CENTER_CAP_REF_IMAGE_MAX)
  forms.creativeForm.centerCapRefFiles = forms.creativeForm.centerCapRefUrls.map(() => null)

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

  {
    // 颜色仅以型号库色卡为准，不再回填或提交「补充颜色」多图
    forms.creativeForm.wheelColorRefUrls = []
    forms.creativeForm.wheelColorRefFiles = []
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

  forms.addressForm.name = str(o.customer) || forms.addressForm.name
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
 * 详情 `car`：若含 `WL-` 造型段，品牌为造型段之前整段；否则为首词为品牌、余下为展示尾。
 * 例：`Abarth WL-M-070` → brand Abarth；`Alfa Romeo WL-M-070` → brand Alfa Romeo。
 */
function parseCarDisplaySegments(carRaw: unknown): { brandPart: string; tailPart: string } {
  const car = str(carRaw).trim()
  if (!car) return { brandPart: '', tailPart: '' }
  const parts = car.split(/\s+/).filter(Boolean)
  const wlIdx = parts.findIndex(p => /^WL[-—]/i.test(p))
  if (wlIdx >= 1) {
    return {
      brandPart: parts.slice(0, wlIdx).join(' '),
      tailPart: parts.slice(wlIdx).join(' '),
    }
  }
  if (parts.length >= 2) {
    return { brandPart: parts[0] ?? '', tailPart: parts.slice(1).join(' ') }
  }
  if (parts.length === 1) {
    const only = parts[0] ?? ''
    if (/^WL[-—]/i.test(only)) return { brandPart: '', tailPart: only }
    return { brandPart: only, tailPart: '' }
  }
  return { brandPart: '', tailPart: '' }
}

function isWlStyleToken(s: string): boolean {
  return /^WL[-—]/i.test(String(s ?? '').trim())
}

/**
 * 详情接口：车辆品牌 / Wheel-Size「型号」文案，供下拉 `findSelectValue` 匹配。
 * - **品牌**：有 `car` 时优先取解析段中的品牌段（空格 / WL 规则见 `parseCarDisplaySegments`），否则 `car_brand`、specs。
 * - **型号**：与创建时写入的 `car_model` 一致时优先用其（且排除误存的 `WL-…` 造型号）；否则用语义上的车型尾段（`car` 去掉造型 WL 后的尾段），再 specs。
 */
export function brandModelLabelsFromDetail(d: OrderDetailResponse): { brand: string; model: string } {
  const o = d as AnyRec
  const specs = (o.specs && typeof o.specs === 'object' && !Array.isArray(o.specs) ? o.specs : null) as AnyRec | null

  const cb = str(o.car_brand)
  const cm = str(o.car_model)
  const carRaw = str(o.car).trim()

  const { brandPart, tailPart } = parseCarDisplaySegments(o.car)

  let brand = ''
  let model = ''

  if (carRaw) {
    if (brandPart) brand = brandPart
    if (tailPart && !isWlStyleToken(tailPart)) model = tailPart
  }

  if (!brand) brand = cb || str(specGet(specs, '品牌'))

  if (cm && !isWlStyleToken(cm)) {
    model = cm
  }
  else if (!model) {
    model = str(specGet(specs, '车型') || specGet(specs, '型号'))
  }

  return { brand: brand.trim(), model: model.trim() }
}
