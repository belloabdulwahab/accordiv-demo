import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useWorkspaceNotice() {
  const { pathname } = useLocation();
  const [notice, setNotice] = useState(null);
  const reached = useRef(null);
  const announce = useCallback((message, destination = pathname) => {
    setNotice({ message, pathname: destination, origin: pathname, id: globalThis.crypto.randomUUID() });
  }, [pathname]);
  const dismiss = useCallback(() => setNotice(null), []);
  useEffect(() => {
    if (!notice) return;
    if (notice.pathname === pathname) {
      reached.current = notice.id;
      return;
    }
    // Router navigation may commit after the success state; keep it until its destination arrives.
    if (reached.current === notice.id || pathname !== notice.origin) {
      const timer = setTimeout(() => setNotice(previous => previous?.id === notice.id ? null : previous), 0);
      return () => clearTimeout(timer);
    }
  }, [notice, pathname]);
  return { announcement: notice?.pathname === pathname ? notice : null, announce, dismiss };
}
