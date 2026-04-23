import axios, {AxiosHeaders} from 'axios';
import type {InternalAxiosRequestConfig} from 'axios';
import {getApiLang} from '@/i18n/apiLang';

/** 须与 Laravel `api_clients` 中对应 api_key 的明文密钥一致（DB 中存加密值，验签时用解密后的明文） */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://chain.wheelsline.com/api/v1').trim();
/** 明文密钥；须与 DB 解密后的 signingSecret 一致，勿把 migrations 里加密后的密文当 secret */
const API_SECRET_RAW = (import.meta.env.VITE_API_SECRET_RAW || '').trim();
const API_KEY = (import.meta.env.VITE_API_KEY || 'telegram_key').trim();

// ----------------------------------------
// 工具函数
// ----------------------------------------
function encRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function sortRecursive(data: any): any {
  if(Array.isArray(data)) return data.map(sortRecursive);
  if(data && typeof data === 'object') {
    const out: any = {};
    Object.keys(data).sort().forEach(k => {
      out[k] = sortRecursive(data[k]);
    });
    return out;
  }
  return data;
}

/**
 * 与 Laravel `ConvertEmptyStringsToNull` 一致：仅把 `''` 变成 `null`（递归）。
 */
function convertEmptyStringsToNull(value: unknown): unknown {
  if(value === '') return null;
  if(Array.isArray(value)) return value.map(convertEmptyStringsToNull);
  if(value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>).forEach((k) => {
      out[k] = convertEmptyStringsToNull((value as Record<string, unknown>)[k]);
    });
    return out;
  }
  return value;
}

/** 与 PHP `http_build_query` 对标量值的字符串化一致（如 bool true → "1"） */
function scalarToPhpQueryValue(value: unknown): string {
  if(value === true) return '1';
  if(value === false) return '0';
  if(value === null || value === undefined) return '';
  if(typeof value === 'number' && Number.isFinite(value)) return String(value);
  if(typeof value === 'bigint') return String(value);
  return String(value);
}

function getContentType(headers: InternalAxiosRequestConfig['headers']): string {
  if(!headers || typeof headers !== 'object') return '';
  try {
    if(axios.AxiosHeaders && typeof axios.AxiosHeaders.from === 'function') {
      const h = axios.AxiosHeaders.from(headers as any);
      const v = h.get('Content-Type') ?? h.get('content-type');
      if(v) return String(v);
    }
  } catch{
    /* ignore */
  }
  const h = headers as Record<string, unknown> & {get?: (name: string) => unknown};
  if(typeof h.get === 'function') {
    return String(h.get('Content-Type') || h.get('content-type') || '');
  }
  return String((headers as Record<string, string>)['Content-Type'] || (headers as Record<string, string>)['content-type'] || '');
}

/** Content-Type 缺失时仍按 JSON 签名（与 Laravel 解析 JSON body 一致） */
function shouldSignAsJson(method: string, rawData: unknown, headers: InternalAxiosRequestConfig['headers']): boolean {
  const ct = getContentType(headers).toLowerCase();
  if(ct.includes('application/json') || ct.includes('+json')) return true;
  const m = method.toUpperCase();
  if(m === 'GET' || m === 'HEAD') return false;
  if(rawData == null) return false;
  if(typeof FormData !== 'undefined' && rawData instanceof FormData) return false;
  if(typeof Blob !== 'undefined' && rawData instanceof Blob) return false;
  if(typeof URLSearchParams !== 'undefined' && rawData instanceof URLSearchParams) return false;
  if(typeof rawData === 'string') {
    const t = rawData.trim();
    return t.startsWith('{') || t.startsWith('[');
  }
  return typeof rawData === 'object';
}

function resolveRequestPath(config: InternalAxiosRequestConfig): string {
  try {
    const uri = axios.getUri(config);
    return new URL(uri).pathname || '/';
  } catch{
    const base = String(config.baseURL || '').replace(/\/$/, '');
    const rel = String(config.url || '');
    const pathPart = rel.startsWith('/') ? rel : `/${rel}`;
    try {
      return new URL(pathPart, `${base}/`).pathname;
    } catch{
      return pathPart;
    }
  }
}

function buildQuery(obj: any, prefix: string | undefined): string[] {
  const pairs: any = [];
  if(obj === null || obj === undefined) return pairs;
  if(typeof obj !== 'object') {
    const key = prefix ?? '';
    pairs.push(encRFC3986(key) + '=' + encRFC3986(scalarToPhpQueryValue(obj)));
    return pairs;
  }
  if(Array.isArray(obj)) {
    for(let i = 0; i < obj.length; i++) {
      const key = prefix ? `${prefix}[${i}]` : String(i);
      pairs.push(...buildQuery(obj[i], key));
    }
    return pairs;
  }
  Object.keys(obj).sort().forEach(key => {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    pairs.push(...buildQuery(obj[key], fullKey));
  });
  return pairs;
}

function normalizeAllParams(data: any): string {
  if(!data || Object.keys(data).length === 0) return '';
  const sorted = sortRecursive(data);
  return buildQuery(sorted, '').join('&');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}

async function hmacSha256Hex(secret: string, text: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(text);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return toHex(sig);
}

function genNonce(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for(let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

/**
 * multipart 中与 Laravel `stripUploadedFiles($request->all())` 对齐：只保留非 File/Blob 字段参与签名字符串第 3 行。
 */
function formDataParamsForSign(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((value, key) => {
    if(typeof value !== 'string' && typeof Blob !== 'undefined' && value instanceof Blob) return;
    out[key] = typeof value === 'string' ? value : String(value);
  });
  return out;
}

function collectUrlQuery(config: InternalAxiosRequestConfig): Record<string, string> {
  const requestUrl = axios.getUri(config);
  const fullUrl = new URL(requestUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const realQuery: Record<string, string> = {};
  fullUrl.searchParams.forEach((value, key) => {
    realQuery[key] = value;
  });
  return realQuery;
}

// ----------------------------------------
// Axios 实例：不要默认 Content-Type，否则 FormData 会被破坏
// ----------------------------------------
const httpApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'X-Api-Key': API_KEY
  },
  paramsSerializer: {
    serialize: params => normalizeAllParams(params)
  }
});

httpApi.interceptors.request.use(async(config: InternalAxiosRequestConfig) => {
  const lang = getApiLang();
  if (config.params instanceof URLSearchParams) {
    config.params.set('lang', lang);
  } else {
    const base = (config.params && typeof config.params === 'object' && !Array.isArray(config.params)) ?
      {...(config.params as Record<string, unknown>)} :
      {};
    config.params = {...base, lang} as typeof config.params;
  }

  const method = (config.method || 'GET').toUpperCase();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = genNonce(32);

  const path = resolveRequestPath(config);
  const realQuery = collectUrlQuery(config);

  let bodyStr = '';
  let normalizedParams = '';

  if(method === 'GET' || method === 'HEAD') {
    normalizedParams = normalizeAllParams(realQuery);
  } else {
    const rawData = config.data;

    if(typeof FormData !== 'undefined' && rawData instanceof FormData) {
      bodyStr = '';
      const merged = {...realQuery, ...formDataParamsForSign(rawData)};
      normalizedParams = normalizeAllParams(sortRecursive(convertEmptyStringsToNull(merged) as Record<string, unknown>) as Record<string, unknown>);
      if(config.headers) {
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    } else if(typeof Blob !== 'undefined' && rawData instanceof Blob) {
      bodyStr = '';
      normalizedParams = normalizeAllParams(sortRecursive(convertEmptyStringsToNull(realQuery) as Record<string, unknown>) as Record<string, unknown>);
      if(config.headers) {
        delete (config.headers as any)['Content-Type'];
        delete (config.headers as any)['content-type'];
      }
    } else {
      const raw = rawData ?? {};
      const isJson = shouldSignAsJson(method, raw, config.headers);

      if(isJson) {
        const sortedData = sortRecursive(raw);
        bodyStr = JSON.stringify(sortedData);
        const mergedForSign = convertEmptyStringsToNull({
          ...realQuery,
          ...(sortedData as Record<string, unknown>)
        }) as Record<string, unknown>;
        normalizedParams = normalizeAllParams(sortRecursive(mergedForSign) as Record<string, unknown>);
        if(!config.headers) config.headers = new AxiosHeaders();
        (config.headers as AxiosHeaders).set('Content-Type', 'application/json;charset=UTF-8');
        config.data = bodyStr;
        config.transformRequest = [(data: any) => data];
      } else {
        const formObj = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ?
          (raw as Record<string, unknown>) :
          {};
        bodyStr = normalizeAllParams(formObj);
        const mergedForSign = convertEmptyStringsToNull({
          ...realQuery,
          ...formObj
        }) as Record<string, unknown>;
        normalizedParams = normalizeAllParams(sortRecursive(mergedForSign) as Record<string, unknown>);
        if(!config.headers) config.headers = new AxiosHeaders();
        (config.headers as AxiosHeaders).set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
        config.data = bodyStr;
        config.transformRequest = [(data: any) => data];
      }
    }
  }

  const bodySha256 = await sha256Hex(bodyStr);
  const canonical = [method, path, normalizedParams, bodySha256, timestamp, nonce].join('\n');
  const signature = await hmacSha256Hex(API_SECRET_RAW, canonical);

  if(!config.headers) config.headers = new AxiosHeaders();
  const hdr = config.headers as AxiosHeaders;
  hdr.set('X-Timestamp', timestamp);
  hdr.set('X-Nonce', nonce);
  hdr.set('X-Signature', signature);

  return config;
}, (error) => Promise.reject(error));

httpApi.interceptors.response.use(
  (response) => {
    const body = response.data;
    if(body && typeof body === 'object' && 'code' in body && (body as any).code !== 0) {
      const msg = (body as any).msg || 'API_ERROR';
      return Promise.reject(new Error(msg));
    }
    // unwrap: 后端返回 {code:0, data:...} → 返回 body.data
    if(body && typeof body === 'object' && 'data' in body) {
      return (body as any).data;
    }
    return body;
  },
  (error) => {
    const errorMsg = error.response?.data?.msg || error.response?.data?.message || error.message;
    console.error('API Error:', error.response?.status, errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

export default httpApi;

