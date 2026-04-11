import { play } from '@/utils/audioService';

/** 타이틀 탭 등 짧은 총성 — `audioService`의 `bang_shot`과 동일 */
export async function playGunshotSfx(): Promise<void> {
  await play('bang_shot');
}
