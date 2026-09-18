import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton, WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { recordAppEvent } from '@/lib/supabase/analyticsApi';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { formatUnknownError } from '@/lib/supabase/errors';
import { pvpGetFriendChallenge, pvpLogin } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import type { FriendChallenge } from '@/types/pvp';
import {
  isValidChallengeCode,
  normalizeChallengeCode,
} from '@/utils/challengeLink';
import { formatReactionMs } from '@/utils/formatReactionMs';

function mapChallengeError(message: string, t: (k: string) => string): string {
  if (message.includes('invalid_code')) return t('ranking.challengeInvalidCode');
  if (message.includes('challenge_not_found')) return t('ranking.challengeNotFound');
  if (message.includes('challenge_expired')) return t('ranking.challengeExpired');
  return message;
}

export default function RankingChallengeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = normalizeChallengeCode(
    typeof params.code === 'string' ? params.code : '',
  );

  const setProfile = usePvpStore((s) => s.setProfile);
  const beginFriendMatch = usePvpStore((s) => s.beginFriendMatch);

  const [codeInput, setCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<FriendChallenge | null>(null);

  const loadChallenge = useCallback(
    async (rawCode: string) => {
      const code = normalizeChallengeCode(rawCode);
      if (!isValidChallengeCode(code)) {
        setError(t('ranking.challengeInvalidCode'));
        setChallenge(null);
        return;
      }
      if (!isSupabaseConfigured) {
        setError(t('ranking.notConfigured'));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const me = await pvpLogin();
        setProfile(me);
        const data = await pvpGetFriendChallenge(code);
        setChallenge(data);
        void recordAppEvent('challenge_open', { code });
      } catch (e) {
        const msg = formatUnknownError(e);
        setChallenge(null);
        setError(mapChallengeError(msg, t));
      } finally {
        setLoading(false);
      }
    },
    [setProfile, t],
  );

  useEffect(() => {
    if (initialCode) void loadChallenge(initialCode);
  }, [initialCode, loadChallenge]);

  const canStart = useMemo(() => {
    if (!challenge) return false;
    if (challenge.is_creator) return false;
    if (challenge.completed) return false;
    return true;
  }, [challenge]);

  const onStart = useCallback(async () => {
    if (!challenge || !canStart || starting) return;
    setStarting(true);
    try {
      beginFriendMatch(challenge);
      router.replace('/ranking/duel' as Href);
    } catch (e) {
      const msg = formatUnknownError(e);
      setError(msg);
      setStarting(false);
    }
  }, [beginFriendMatch, canStart, challenge, router, starting]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <View
          style={[
            styles.root,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.backRow}>
            <MenuBackButton onPress={() => router.replace('/ranking' as Href)} />
          </View>
          <WesternHeader title={t('ranking.challengeTitle')} subtitle={t('ranking.challengeSub')} />

          <WesternPanel style={styles.panel}>
            <Text style={styles.label}>{t('ranking.challengeCodeLabel')}</Text>
            <TextInput
              value={codeInput}
              onChangeText={(v) => setCodeInput(normalizeChallengeCode(v))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholder="ABC123"
              placeholderTextColor="rgba(212,170,116,0.4)"
              style={[styles.input, { fontFamily: FONT_RYE }]}
            />
            <WesternButton
              title={t('ranking.challengeLookup')}
              onPress={() => void loadChallenge(codeInput)}
              disabled={loading || codeInput.length < 6}
              variant="primary"
            />
          </WesternPanel>

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {challenge ? (
            <WesternPanel style={styles.card}>
              <Text style={styles.telegram}>UNRANKED · TELEGRAM</Text>
              <Text style={[styles.code, { fontFamily: FONT_RYE }]}>
                {challenge.code}
              </Text>
              <Text style={styles.vs}>
                {t('ranking.challengeVs', { name: challenge.creator_name })}
              </Text>
              {challenge.creator_avg_ms != null ? (
                <Text style={styles.meta}>
                  {t('ranking.challengeCreatorAvg', {
                    ms: formatReactionMs(challenge.creator_avg_ms),
                  })}
                </Text>
              ) : null}
              {challenge.creator_best_ms != null ? (
                <Text style={styles.meta}>
                  {t('ranking.challengeCreatorBest', {
                    ms: formatReactionMs(challenge.creator_best_ms),
                  })}
                </Text>
              ) : null}
              {challenge.is_creator ? (
                <Text style={styles.note}>{t('ranking.challengeSelf')}</Text>
              ) : null}
              {challenge.completed ? (
                <Text style={styles.note}>
                  {t('ranking.challengeAlreadyDone', {
                    result: challenge.completion?.result ?? '—',
                  })}
                </Text>
              ) : null}
            </WesternPanel>
          ) : null}

          {canStart ? (
            <WesternButton
              title={
                starting
                  ? t('ranking.challengeStarting')
                  : t('ranking.challengeStart')
              }
              onPress={() => void onStart()}
              disabled={starting}
              variant="primary"
              style={styles.primary}
            />
          ) : null}

          <WesternButton
            title={t('ranking.backHub')}
            onPress={() => router.replace('/ranking' as Href)}
            variant="quiet"
          />
        </View>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 12,
  },
  backRow: { alignSelf: 'flex-start', marginLeft: -8, marginBottom: -4 },
  head: {
    color: colors.gold,
    fontSize: 28,
    letterSpacing: 2,
    textAlign: 'center',
    ...metaTextShadow,
  },
  sub: {
    color: colors.sand,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  panel: {
    marginTop: 4,
  },
  label: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.cream,
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: {
    color: '#E8A0A0',
    textAlign: 'center',
    fontSize: 13,
  },
  card: {
    alignItems: 'center',
  },
  telegram: { color: colors.ochre, fontFamily: FONT_RYE, fontSize: 9, letterSpacing: 2, textAlign: 'center', marginBottom: 5 },
  code: {
    color: colors.gold,
    fontSize: 32,
    letterSpacing: 4,
    ...metaTextShadow,
  },
  vs: {
    color: colors.cream,
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    color: colors.sand,
    fontSize: 13,
  },
  note: {
    marginTop: 6,
    color: colors.sand,
    fontSize: 12,
    textAlign: 'center',
  },
  primary: {
    marginTop: 4,
  },
});
