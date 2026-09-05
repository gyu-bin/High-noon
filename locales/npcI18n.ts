import type { NpcTier, NpcSpecialAbility } from '@/types/npc';

type NpcEntry = { title: string; name: string };

type SpecialAbilityEntry = { name: string; desc: string };

type NpcI18nBundle = {
  tier: Record<NpcTier, string>;
  list: Record<string, NpcEntry>;
  abilityIntro: { title: string; confirm: string };
  specialAbility: Record<Exclude<NpcSpecialAbility, 'none'>, SpecialAbilityEntry>;
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
    abilityIntro: {
      title: '상대 특수 능력',
      confirm: '알겠어요',
    },
    specialAbility: {
      mirror: {
        name: '미러',
        desc: '이길수록 더 빨라지고, 질수록 느려집니다. 연승하면 점점 버티기 어려워집니다.',
      },
      thunderbolt: {
        name: '썬더볼트',
        desc: 'BANG 글자 없음. 집중 후 0.9~4.8초 사이 번개(페이크 2회) → 총성이 진짜. 소리로 반응.',
      },
      blindBang: {
        name: '블라인드 뱅',
        desc: '뱅 글자가 거의 보이지 않습니다. 소리·감각으로만 반응해야 합니다.',
      },
      screenShakeLight: {
        name: '떨림',
        desc: '집중 중 화면이 살짝 흔들립니다.',
      },
      screenShakeMedium: {
        name: '흔들림',
        desc: '집중 중 화면이 흔들려 집중하기 어렵습니다.',
      },
      screenShakeHeavy: {
        name: '격진',
        desc: '집중 중 화면이 격렬하게 흔들립니다.',
      },
      invertedSignals: {
        name: '공허',
        desc: '집중 중 화면이 보라 공허에 잠깁니다. STEADY가 사라지고 ···만 보입니다. 뱅 때 균열.',
      },
      echoReady: {
        name: '에코',
        desc: 'BANG이 연속 3번. 1번째·3번째는 가짜, 2번째 총성만 진짜입니다.',
      },
      chaosRandom: {
        name: '카오스',
        desc: '매 라운드 공허·썬더·에코·격진 중 하나를 훔칩니다.',
      },
      paleSilence: {
        name: '침묵',
        desc: '집중 후 오래 기다린 뒤 뱅이 터지며, 집중 중 화면이 어두워집니다.',
      },
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
    abilityIntro: {
      title: 'Opponent Ability',
      confirm: 'Got it',
    },
    specialAbility: {
      mirror: {
        name: 'Mirror',
        desc: 'Gets faster when you win, slower when you lose. Win streaks make them harder to beat.',
      },
      thunderbolt: {
        name: 'Thunderbolt',
        desc: 'No BANG text. 0.9–4.8s after STEADY: 2 fake lightning flashes, then gunshot = real. React to sound.',
      },
      blindBang: {
        name: 'Blind Bang',
        desc: 'The BANG text is nearly invisible. React by sound and feel only.',
      },
      screenShakeLight: {
        name: 'Tremor',
        desc: 'The screen shakes slightly during STEADY.',
      },
      screenShakeMedium: {
        name: 'Quake',
        desc: 'The screen shakes during STEADY, making it hard to focus.',
      },
      screenShakeHeavy: {
        name: 'Earthquake',
        desc: 'The screen shakes violently during STEADY.',
      },
      invertedSignals: {
        name: 'Void',
        desc: 'During STEADY the screen sinks into a purple void — STEADY vanishes, only ··· remains. BANG shatters it.',
      },
      echoReady: {
        name: 'Echo',
        desc: 'Three BANGs in a row. The 1st and 3rd are fakes — only the 2nd gunshot is real.',
      },
      chaosRandom: {
        name: 'Chaos',
        desc: 'Each round steals Void, Thunder, Echo, or Quake.',
      },
      paleSilence: {
        name: 'Silence',
        desc: 'A long wait after STEADY, then BANG. The screen dims during STEADY.',
      },
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
    abilityIntro: {
      title: '相手の特殊能力',
      confirm: '了解',
    },
    specialAbility: {
      mirror: {
        name: 'ミラー',
        desc: '勝つほど速く、負けるほど遅くなります。連勝するとどんどん厳しくなります。',
      },
      thunderbolt: {
        name: 'サンダーボルト',
        desc: 'BANG文字なし。STEADY後0.9~4.8秒、稲妻フェイク2回→銃声が本物。音で反応。',
      },
      blindBang: {
        name: 'ブラインドBANG',
        desc: 'BANG文字がほとんど見えません。音と感覚だけで反応。',
      },
      screenShakeLight: {
        name: '震え',
        desc: 'STEADY中に画面が少し揺れます。',
      },
      screenShakeMedium: {
        name: '揺れ',
        desc: 'STEADY中に画面が揺れて集中しにくくなります。',
      },
      screenShakeHeavy: {
        name: '激震',
        desc: 'STEADY中に画面が激しく揺れます。',
      },
      invertedSignals: {
        name: 'ヴォイド',
        desc: 'STEADY中、画面が紫の虚空に包まれSTEADYが消える。···だけ。BANGで亀裂。',
      },
      echoReady: {
        name: 'エコー',
        desc: 'BANGが3連続。1・3番目はフェイク、2番目の銃声だけ本物。',
      },
      chaosRandom: {
        name: 'カオス',
        desc: '毎ラウンドヴォイド・サンダー・エコー・激震のどれかを盗む。',
      },
      paleSilence: {
        name: '沈黙',
        desc: 'STEADY後に長く待ってからBANG。STEADY中は画面が暗くなります。',
      },
    },
  },
};

/** i18next resources에 병합할 npcs 번역 블록 */
export function npcTranslationBlock(lang: 'ko' | 'en' | 'ja') {
  return NPC_I18N[lang];
}
