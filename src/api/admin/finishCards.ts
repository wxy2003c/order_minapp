import httpApi from '@/utils/http';

export type FinishCardItem = {
  id: number;
  group_name: string;
  section_name: string;
  code: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  is_charged: boolean;
  sort: number;
  tone_code: string | null;
  tone_label: string | null;
  process_code: string | null;
  process_label: string | null;
  name_cn: string | null;
  name_en: string | null;
  remark: string | null;
  factory_aliases: string[] | null;
};

export type FinishCardGroup = {
  section_name_en: string | null;
  section_name: string;
  group_name: string;
  sort: number;
  abbr_en: string | null;
  image: string | null;
  items: FinishCardItem[];
};

export type FinishCardsData = {
  groups: FinishCardGroup[];
};

/**
 * 色卡分组与条目（Laravel: GET /api/v1/finish-cards 或你方路由中对应路径）
 */
export async function fetchFinishCards(): Promise<FinishCardsData> {
  return (await httpApi.get('/finish-cards')) as FinishCardsData;
}
