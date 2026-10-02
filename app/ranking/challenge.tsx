import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import {
  ChallengeCodeInput,
  ChallengeNotice,
  ChallengeTicket,
  ChallengeWantedCard,
  MyChallengeCard,
  ParchmentSheet,
} from '@/components/ranking/FriendChallengeCards';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton, WesternHeader } from '@/components/ui/western/WesternPrimitives';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { recordAppEvent } from '@/lib/supabase/analyticsApi';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { formatUnknownError } from '@/lib/supabase/errors';
import {
  pvpCreateFriendChallenge,
  pvpGetFriendChallenge,
  pvpLogin,
} from '@/lib/supabase/pvpApi';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { FriendChallenge } from '@/types/pvp';
import {
  buildChallengeDeepLink,
  buildChallengeWebLink,
  isValidChallengeCode,
  normalizeChallengeCode,
} from '@/utils/challengeLink';
import {
  buildFriendChallengeShareMessage,
  challengeExpiry,
  challengeRecordFromShots,
  friendChallengeErrorKind,
  FRIEND_RECORD_SHOTS,
  type FriendChallengeErrorKind,
} from '@/utils/friendChallenge';
import { trigger } from '@/utils/hapticService';

type Lookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; kind: FriendChallengeErrorKind }
  | { status: 'ready'; challenge: FriendChallenge };

const NOTICE: Record<FriendChallengeErrorKind, { title: string; body: string }> = {
  invalid: { title: 'ranking.fcInvalid', body: 'ranking.fcInvalidBody' },
  expired: { title: 'ranking.fcExpired', body: 'ranking.fcExpiredBody' },
  self: { title: 'ranking.fcSelf', body: 'ranking.fcSelfBody' },
  offline: { title: 'ranking.fcOffline', body: 'ranking.fcOfflineBody' },
  failed: { title: 'ranking.fcFailed', body: 'ranking.fcFailedBody' },
};

export default function RankingChallengeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const params = useLocalSearchParams<{ code?: string; send?: string }>();
  const linkCode = normalizeChallengeCode(typeof params.code === 'string' ? params.code : '');
  const sendFirst = params.send === '1';

  const profile = usePvpStore((s) => s.profile);
  const setProfile = usePvpStore((s) => s.setProfile);
  const beginFriendMatch = usePvpStore((s) => s.beginFriendMatch);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);
  const recentShots = usePvpStatsStore((s) => s.recentShots);
  const lastChallenge = usePvpStatsStore((s) => s.lastChallenge);
  const setLastChallenge = usePvpStatsStore((s) => s.setLastChallenge);

  const [codeInput, setCodeInput] = useState(linkCode);
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
  const [starting, setStarting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<FriendChallengeErrorKind | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lookupSeq = useRef(0);

  // Countdown label only; the server decides whether a challenge is open.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Alias for MY CHALLENGE when the board has not loaded it (e.g. deep link from the menu).
  useEffect(() => {
    if (profile || !isSupabaseConfigured) return;
    let alive = true;
    pvpLogin()
      .then((me) => { if (alive) setProfile(me); })
      .catch(() => { /* offline: the create section shows its own state */ });
    return () => { alive = false; };
  }, [profile, setProfile]);

  const expiryLabel = useCallback(
    (expiresAt: string | null | undefined): string | null => {
      const e = challengeExpiry(expiresAt, nowMs);
      if (e.state === 'unknown') return null;
      if (e.state === 'closing') return t('ranking.fcExpiresSoon');
      const time = e.days > 0
        ? t('ranking.fcDaysHours', { d: e.days, h: e.hours })
        : t('ranking.fcHoursMinutes', { h: e.hours, m: e.minutes });
      return t('ranking.fcExpiresIn', { time });
    },
    [nowMs, t],
  );

  const openChallenge = useCallback(async (raw: string) => {
    const code = normalizeChallengeCode(raw);
    const mine = ++lookupSeq.current;
    if (!isValidChallengeCode(code)) {
      setLookup({ status: 'error', kind: 'invalid' });
      return;
    }
    if (!isSupabaseConfigured) {
      setLookup({ status: 'error', kind: 'offline' });
      return;
    }
    setLookup({ status: 'loading' });
    try {
      const challenge = await pvpGetFriendChallenge(code);
      if (mine !== lookupSeq.current) return;
      setLookup({ status: 'ready', challenge });
      void recordAppEvent('challenge_open', { code });
    } catch (e) {
      if (mine !== lookupSeq.current) return;
      console.warn('[friend] lookup failed', formatUnknownError(e));
      setLookup({ status: 'error', kind: friendChallengeErrorKind(e) });
    }
  }, []);

  // Deep link (or a newer link delivered to this screen) opens the challenge.
  useEffect(() => {
    if (!linkCode) return;
    setCodeInput(linkCode);
    void openChallenge(linkCode);
  }, [linkCode, openChallenge]);

  const onAccept = useCallback(() => {
    if (lookup.status !== 'ready' || starting) return;
    const { challenge } = lookup;
    if (challenge.is_creator || challenge.completed) return;
    setStarting(true);
    beginFriendMatch(challenge);
    // Same record-duel presentation as Ranked (READY → STEADY → BANG).
    router.replace('/ranking/duel' as Href);
  }, [beginFriendMatch, lookup, router, starting]);

  // ---- MY CHALLENGE ---------------------------------------------------------
  const record = useMemo(() => challengeRecordFromShots(recentShots), [recentShots]);
  /** Reuse the last sent challenge while it carries the same record and is not over. */
  const activeTicket = useMemo(() => {
    if (!lastChallenge || !record) return null;
    const same =
      Array.isArray(lastChallenge.sampleMs) &&
      lastChallenge.sampleMs.every((v, i) => v === record.sampleMs[i]);
    if (!same) return null;
    return challengeExpiry(lastChallenge.expiresAt, nowMs).state === 'open' ? lastChallenge : null;
  }, [lastChallenge, nowMs, record]);

  const shareTicket = useCallback(async (code: string) => {
    const alias = usePvpStore.getState().profile?.display_name ?? t('result.me');
    const message = buildFriendChallengeShareMessage({
      code,
      inviteLine: t('ranking.fcInviteLine', { alias }),
      webLink: buildChallengeWebLink(code),
      deepLink: buildChallengeDeepLink(code),
    });
    try {
      await Share.share({ message });
      void recordAppEvent('share_click', { mode: 'challenge_invite', code });
    } catch {
      /* dismissed */
    }
  }, [t]);

  // No clipboard module ships in this binary (OTA-safe): the system sheet
  // offers Copy, and a long-press on the ticket selects the code.
  const copyTicket = useCallback((code: string) => {
    void Share.share({ message: code }).catch(() => {});
  }, []);

  const onCreate = useCallback(async () => {
    if (!record || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await pvpCreateFriendChallenge({
        record,
        characterId: useSettingsStore.getState().selectedCharacterId,
      });
      setLastChallenge({
        code: created.code,
        expiresAt: created.expires_at,
        sampleMs: record.sampleMs,
      });
      usePvpStore.getState().setLastCreatedChallengeCode(created.code);
      void recordAppEvent('challenge_create', { code: created.code });
      void trigger('success');
    } catch (e) {
      console.warn('[friend] create failed', formatUnknownError(e));
      setCreateError(friendChallengeErrorKind(e));
    } finally {
      setCreating(false);
    }
  }, [creating, record, setLastChallenge]);

  const back = useCallback(() => {
    // Return to the Bounty Board already in the stack (no remount / reload).
    router.dismissTo('/ranking' as Href);
  }, [router]);

  // ---- sections -------------------------------------------------------------
  const lookupSection = (() => {
    if (lookup.status === 'loading') {
      return <ActivityIndicator color={colors.gold} style={styles.spinner} />;
    }
    if (lookup.status === 'error') {
      const n = NOTICE[lookup.kind];
      return <ChallengeNotice title={t(n.title)} body={t(n.body)} />;
    }
    if (lookup.status !== 'ready') return null;
    const c = lookup.challenge;
    const done = c.completed && c.completion;
    return (
      <View style={styles.block}>
        <ChallengeWantedCard
          characterId={c.character_id}
          alias={c.creator_name}
          bestMs={c.creator_best_ms}
          avgMs={c.creator_avg_ms}
          expiryLabel={expiryLabel(c.expires_at)}
          labels={{
            wanted: t('ranking.fcWanted'),
            recordDuel: t('ranking.fcRecordDuel'),
            best: t('ranking.fcBestDraw'),
            avg: t('ranking.fcAvgDraw'),
            unranked: t('ranking.fcUnranked'),
          }}
        />
        {c.is_creator ? (
          <ChallengeNotice title={t('ranking.fcSelf')} body={t('ranking.fcSelfBody')} />
        ) : done ? (
          <ChallengeNotice
            title={t('ranking.fcDone')}
            body={t('ranking.fcDoneBody', {
              result: t(`ranking.result.${done.result}`),
              score: `${done.score_player}-${done.score_creator}`,
            })}
          />
        ) : (
          <WesternButton
            title={starting ? t('ranking.fcStarting') : t('ranking.fcAccept')}
            subtitle={t('ranking.fcUnranked')}
            onPress={onAccept}
            disabled={starting}
            variant="primary"
          />
        )}
      </View>
    );
  })();

  const enterSection = (
    <ParchmentSheet>
      <View style={styles.block}>
        <ChallengeCodeInput
          value={codeInput}
          onChangeText={(v) => setCodeInput(normalizeChallengeCode(v))}
          onSubmit={() => void openChallenge(codeInput)}
          label={t('ranking.fcEnter')}
          disabled={lookup.status === 'loading'}
        />
        <WesternButton
          title={lookup.status === 'loading' ? t('ranking.fcOpening') : t('ranking.fcOpen')}
          subtitle={t('ranking.fcEnter')}
          onPress={() => void openChallenge(codeInput)}
          disabled={lookup.status === 'loading' || codeInput.length < 6}
        />
      </View>
    </ParchmentSheet>
  );

  const alias = profile?.display_name ?? '—';
  const mySection = activeTicket ? (
    <ChallengeTicket
      code={activeTicket.code}
      eyebrow={t('ranking.fcTelegram')}
      caption={t('ranking.fcCodeCaption')}
      expiryLabel={expiryLabel(activeTicket.expiresAt)}
    >
      <WesternButton
        title={t('ranking.fcShare')}
        onPress={() => void shareTicket(activeTicket.code)}
        variant="primary"
      />
      <WesternButton title={t('ranking.fcCopy')} onPress={() => copyTicket(activeTicket.code)} />
    </ChallengeTicket>
  ) : (
    <MyChallengeCard
      characterId={characterId}
      alias={alias}
      bestMs={record?.bestMs ?? null}
      avgMs={record?.avgMs ?? null}
      labels={{
        title: t('ranking.fcMyChallenge'),
        best: t('ranking.fcBestDraw'),
        avg: t('ranking.fcAvgDraw'),
        unranked: t('ranking.fcUnranked'),
        note: record
          ? t('ranking.fcRecordNote')
          : t('ranking.fcLocked', {
              have: Math.min(Array.isArray(recentShots) ? recentShots.length : 0, FRIEND_RECORD_SHOTS),
            }),
      }}
      footer={
        <WesternButton
          title={creating ? t('ranking.fcCreating') : t('ranking.fcCreate')}
          onPress={() => void onCreate()}
          disabled={!record || creating || !isSupabaseConfigured}
          variant="primary"
        />
      }
    />
  );

  const createNotice = createError ? (
    <ChallengeNotice title={t(NOTICE[createError].title)} body={t(NOTICE[createError].body)} />
  ) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <ScrollView
          style={styles.root}
          contentContainerStyle={{
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            gap: 14,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backRow}>
            <MenuBackButton onPress={back} />
          </View>
          <WesternHeader title={t('ranking.fcHeader')} subtitle={t('ranking.fcHeaderSub')} />

          {lookupSection}

          {sendFirst ? (
            <>
              {mySection}
              {createNotice}
              {enterSection}
            </>
          ) : (
            <>
              {enterSection}
              {mySection}
              {createNotice}
            </>
          )}

          <WesternButton title={t('ranking.fcBackBoard')} onPress={back} variant="quiet" />
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  backRow: { alignSelf: 'flex-start', marginLeft: -8, marginBottom: -6 },
  block: { gap: 12 },
  spinner: { marginVertical: 12 },
});
