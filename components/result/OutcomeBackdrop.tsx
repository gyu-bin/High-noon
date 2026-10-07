import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import type { DuelBackgroundVariant } from '@/constants/duelBackgroundVariants';
import type { DuelBackgroundId } from '@/utils/duelBackgroundSelection';

type Props = {
  variant: DuelBackgroundVariant;
  backgroundId?: DuelBackgroundId;
  width: number;
  height: number;
  children: React.ReactNode;
};

/** NPC 최종 결과 — 결투와 동일한 낮/밤 전체 화면 배경 */
export function OutcomeBackdrop({ variant, backgroundId, width, height, children }: Props) {
  return (
    <DuelFullBackground variant={variant} backgroundId={backgroundId} contentWidth={width} contentHeight={height}>
      {children}
    </DuelFullBackground>
  );
}
