import type { NpcTier } from '@/types/npc';

type NpcEntry = { title: string; name: string };

type NpcI18nBundle = {
  tier: Record<NpcTier, string>;
  list: Record<string, NpcEntry>;
};

export const NPC_I18N: Record<'ko' | 'en' | 'ja', NpcI18nBundle> = {
  ko: {
    tier: {
      bronze: '브론즈',
      silver: '실버',
      gold: '골드',
      platinum: '플래티넘',
      diamond: '다이아',
      master: '마스터',
      legend: '레전드',
      hidden: '???',
    },
    list: {
      '1': { title: '먼지바람', name: '먼지바람' },
      '2': { title: '녹슨 총구', name: '녹슨 총구' },
      '3': { title: '황야의', name: '까마귀' },
      '4': { title: '사막의', name: '여우' },
      '5': { title: '철가면', name: '철가면' },
      '6': { title: '냉혈한', name: '레이첼' },
      '7': { title: '독침', name: '선인장' },
      '8': { title: '쌍권총', name: '로렌조' },
      '9': { title: '황금', name: '해골' },
      '10': { title: '강철', name: '독수리' },
      '11': { title: '침묵의', name: '기관차' },
      '12': { title: '블랙', name: '아이언' },
      '13': { title: '미러', name: '잭' },
      '14': { title: '썬더', name: '볼트' },
      '15': { title: '그림자', name: '사냥꾼' },
      '16': { title: '베놈', name: '스파이크' },
      '17': { title: '사막의 악마', name: 'Dryden' },
      '18': { title: '레드 아이', name: '오라클' },
      '19': { title: '보이드', name: '워커' },
      '20': { title: '에코', name: '팬텀' },
      '21': { title: 'The', name: 'Undertaker' },
      '22': { title: 'The Pale', name: 'Rider' },
    },
  },
  en: {
    tier: {
      bronze: 'BRONZE',
      silver: 'SILVER',
      gold: 'GOLD',
      platinum: 'PLATINUM',
      diamond: 'DIAMOND',
      master: 'MASTER',
      legend: 'LEGEND',
      hidden: 'HIDDEN',
    },
    list: {
      '1': { title: 'Dust', name: 'Wind' },
      '2': { title: 'Rusty', name: 'Barrel' },
      '3': { title: 'Wasteland', name: 'Crow' },
      '4': { title: 'Desert', name: 'Fox' },
      '5': { title: 'Iron', name: 'Mask' },
      '6': { title: 'Coldblood', name: 'Rachel' },
      '7': { title: 'Venom', name: 'Cactus' },
      '8': { title: 'Dual Guns', name: 'Lorenzo' },
      '9': { title: 'Golden', name: 'Skull' },
      '10': { title: 'Steel', name: 'Eagle' },
      '11': { title: 'Silent', name: 'Locomotive' },
      '12': { title: 'Black', name: 'Iron' },
      '13': { title: 'Mirror', name: 'Jack' },
      '14': { title: 'Thunder', name: 'Bolt' },
      '15': { title: 'Shadow', name: 'Hunter' },
      '16': { title: 'Venom', name: 'Spike' },
      '17': { title: 'Desert Devil', name: 'Dryden' },
      '18': { title: 'Red Eye', name: 'Oracle' },
      '19': { title: 'Void', name: 'Walker' },
      '20': { title: 'Echo', name: 'Phantom' },
      '21': { title: 'The', name: 'Undertaker' },
      '22': { title: 'The Pale', name: 'Rider' },
    },
  },
  ja: {
    tier: {
      bronze: 'ブロンズ',
      silver: 'シルバー',
      gold: 'ゴールド',
      platinum: 'プラチナ',
      diamond: 'ダイヤ',
      master: 'マスター',
      legend: 'レジェンド',
      hidden: '???',
    },
    list: {
      '1': { title: '塵', name: '風' },
      '2': { title: '錆びた', name: '銃口' },
      '3': { title: '荒野の', name: 'カラス' },
      '4': { title: '砂漠の', name: '狐' },
      '5': { title: '鉄', name: '仮面' },
      '6': { title: '冷血', name: 'レイチェル' },
      '7': { title: '毒針', name: 'サボテン' },
      '8': { title: '二丁拳銃', name: 'ロレンツォ' },
      '9': { title: '黄金', name: 'スカル' },
      '10': { title: '鋼鉄', name: '鷲' },
      '11': { title: '沈黙の', name: '機関車' },
      '12': { title: 'ブラック', name: 'アイアン' },
      '13': { title: 'ミラー', name: 'ジャック' },
      '14': { title: 'サンダー', name: 'ボルト' },
      '15': { title: '影', name: '狩人' },
      '16': { title: 'ベノム', name: 'スパイク' },
      '17': { title: '砂漠の悪魔', name: 'Dryden' },
      '18': { title: 'レッドアイ', name: 'オラクル' },
      '19': { title: 'ヴォイド', name: 'ウォーカー' },
      '20': { title: 'エコー', name: 'ファントム' },
      '21': { title: 'The', name: 'Undertaker' },
      '22': { title: 'The Pale', name: 'Rider' },
    },
  },
};

/** i18next resources에 병합할 npcs 번역 블록 */
export function npcTranslationBlock(lang: 'ko' | 'en' | 'ja') {
  return NPC_I18N[lang];
}
