import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import type { DuelBackgroundVariant } from '@/constants/duelBackgroundVariants';

type Props = {
  variant: DuelBackgroundVariant;
  width: number;
  height: number;
  children: React.ReactNode;
};

/** NPC 최종 결과 — 결투와 동일한 낮/밤 전체 화면 배경 */
export function OutcomeBackdrop({ variant, width, height, children }: Props) {
  return (
    <DuelFullBackground variant={variant} contentWidth={width} contentHeight={height}>
      {children}
    </DuelFullBackground>
  );
}
