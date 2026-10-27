import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';

export function useWorkspace() {
  const context = useOutletContext();
  return {
    ...context,
    basePath: context?.basePath || '/demo',
    isOwner: context?.isOwner || false,
    isCurrent: context?.isCurrent || (() => true),
  };
}
export function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}
