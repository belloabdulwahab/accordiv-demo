import { useEffect, useRef } from 'react';
import Notice from './Notice.jsx';
import { Button } from './ui.jsx';

export default function ConfirmDialog({
  title,
  children,
  action,
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  busy = false,
  error,
  onErrorDismiss,
  returnFocusRef,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = returnFocusRef?.current || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector('button')?.focus();
    const navigation = () => closeRef.current();
    window.addEventListener('hashchange', navigation);
    return () => {
      window.removeEventListener('hashchange', navigation);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [returnFocusRef]);
  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [
      ...dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ),
    ];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      onKeyDown={trapFocus}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="confirmation-title">{title}</h2>
      <div id="confirmation-description">{children}</div>
      <Notice key={error} message={error} onDismiss={onErrorDismiss} className="form-error-summary" />
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? 'Saving…' : action}
        </Button>
      </div>
    </dialog>
  );
}
