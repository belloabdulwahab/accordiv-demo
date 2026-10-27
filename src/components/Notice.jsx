import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function Notice({ message, type = 'error', onDismiss, className = '' }) {
  const [dismissed, setDismissed] = useState(null);
  const timer = useRef(null), remaining = useRef(5000), started = useRef(0);
  const hovered = useRef(false), focused = useRef(false), close = useRef(null);
  useEffect(() => { close.current = () => { if (onDismiss) onDismiss(); else setDismissed(message); }; }, [message, onDismiss]);
  // Only successes expire, after five unpaused seconds. Errors remain until dismissed or replaced.
  function pause() {
    if (timer.current !== null) {
      clearTimeout(timer.current); timer.current = null;
      remaining.current = Math.max(0, remaining.current - (Date.now() - started.current));
    }
  }
  function resume() {
    if (type !== 'success' || hovered.current || focused.current || timer.current !== null || dismissed === message) return;
    started.current = Date.now();
    timer.current = setTimeout(() => { timer.current = null; close.current?.(); }, remaining.current);
  }
  useEffect(() => {
    remaining.current = 5000;
    if (message && type === 'success' && dismissed !== message && !hovered.current && !focused.current) {
      started.current = Date.now();
      timer.current = setTimeout(() => { timer.current = null; close.current?.(); }, 5000);
    }
    return () => { clearTimeout(timer.current); timer.current = null; };
  }, [message, type, dismissed]);
  if (!message || dismissed === message) return null;
  return <div className={`notice ${type === 'success' ? 'notice-success' : 'notice-error'} ${className}`}
    role={type === 'success' ? 'status' : 'alert'}
    onMouseEnter={() => { hovered.current = true; pause(); }}
    onMouseLeave={() => { hovered.current = false; resume(); }}
    onFocusCapture={() => { focused.current = true; pause(); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) { focused.current = false; resume(); } }}>
    <span>{message}</span>
    <button type="button" className="notice-dismiss" aria-label={`Dismiss ${type} notice`} onClick={() => close.current?.()}>
      <X size={18} aria-hidden="true" />
    </button>
  </div>;
}
