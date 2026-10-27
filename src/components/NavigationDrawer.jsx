import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui.jsx';

export default function NavigationDrawer({ open, onClose, triggerRef, children }) {
  const dialogRef = useRef(null);

  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [
      ...dialogRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((control) => control.getClientRects().length > 0);
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

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    // The native modal makes the page inert; explicit Tab wrapping also keeps navigation focus inside.
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 992px)');
    const closeOnDesktop = (event) => {
      if (event.matches) onClose();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, onClose, triggerRef]);

  return (
    <dialog
      ref={dialogRef}
      className="navigation-drawer"
      aria-label="Main navigation"
      onKeyDown={containKeyboardFocus}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drawer-content">
        <Button
          variant="icon"
          className="drawer-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={22} />
        </Button>
        {children}
      </div>
    </dialog>
  );
}
