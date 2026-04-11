import { useEffect, useState } from 'react';

/** 클라이언트 전용 이펙트 게이트에 사용 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
