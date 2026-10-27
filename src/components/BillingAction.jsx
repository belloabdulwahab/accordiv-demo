import { useRef, useState } from 'react';
import { useMountedRef, useWorkspace } from '../hooks/useWorkspace.js';
import { Button } from './ui.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import FormField from './FormField.jsx';

export default function BillingAction({ label, method, id, explanation, needsReason = false, disabled = false }) {
  const { mutate, announce, isOwner, isCurrent } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useMountedRef();
  async function confirm() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await (needsReason ? mutate(method, id, reason) : mutate(method, id));
      if (!mounted.current || !isCurrent()) return;
      if (!result.ok) setError(result.message);
      else {
        setOpen(false);
        announce(`${label} completed${isOwner ? '.' : ' in this demo workspace.'}`);
      }
    } catch (failure) {
      if (mounted.current && isCurrent()) setError(failure.message || 'The change could not be saved. Please try again.');
    } finally {
      lock.current = false;
      if (mounted.current && isCurrent()) setBusy(false);
    }
  }
  return <>
    <Button variant="secondary" disabled={disabled || busy} onClick={() => {
      setReason(''); setError(''); setOpen(true);
    }}>{label}</Button>
    {open && <ConfirmDialog title={`${label}?`} action={label} onConfirm={confirm}
      onClose={() => setOpen(false)} error={error} busy={busy} onErrorDismiss={() => setError('')}>
      <p>{explanation}</p>
      {needsReason && <FormField name="reason" label="Reason" as="textarea" rows={4} required
        maxLength={1000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />}
    </ConfirmDialog>}
  </>;
}
