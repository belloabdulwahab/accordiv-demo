import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMountedRef, useWorkspace } from './useWorkspace.js';
import { validateClientInput, validateProjectInput } from '../services/recordRules.js';
import { validateInvoiceInput } from '../services/billingRules.js';

export function useRecordForm(initialValues, type, id) {
  const [values, setValues] = useState(initialValues), [errors, setErrors] = useState({});
  const [message, setMessage] = useState(''), [review, setReview] = useState(null), [busy, setBusy] = useState(false);
  const lock = useRef(false), formRef = useRef(null), returnFocusRef = useRef(null);
  const mounted = useMountedRef();
  const { data, mutate, announce, basePath, isOwner, isCurrent } = useWorkspace();
  const navigate = useNavigate();
  useEffect(() => { formRef.current?.querySelector('input:not([type="hidden"]), select')?.focus(); }, []);
  function updateValues(updater) {
    const next = typeof updater === 'function' ? updater(values) : updater;
    setValues(next);
    const validation = type === 'clients' ? validateClientInput(next, data.clients, id)
      : type === 'projects' ? validateProjectInput(next, data.clients, data.projects.find(record => record.id === id))
      : validateInvoiceInput(next, data, data.invoices.find(record => record.id === id));
    if (isOwner) for (const field of ['startDate', 'deadline', 'issuedDate', 'dueDate']) {
      if (next[field] && next[field] < '1000-01-01') validation.errors[field] = 'Enter a date from year 1000 to 9999.';
    }
    const remainingErrors = Object.fromEntries(Object.entries(errors).filter(([field]) => Object.hasOwn(validation.errors, field)));
    setErrors(remainingErrors);
    if (Object.keys(errors).length && !Object.keys(remainingErrors).length) setMessage('');
  }
  function change(event) { updateValues({ ...values, [event.target.name]: event.target.value }); }
  async function save(confirmation) {
    if (lock.current) return;
    // The ref blocks repeated submits before React has rendered the disabled state.
    lock.current = true; setBusy(true); setMessage('');
    try {
      const args = [values, isOwner ? (id ?? null) : id];
      if (confirmation) args.push(confirmation);
      const result = await mutate({ clients: 'saveClient', projects: 'saveProject', invoices: 'saveDraft' }[type], ...args);
      if (!mounted.current || !isCurrent()) return;
      if (!result.ok) {
        setErrors(result.errors || {});
        if (Object.keys(result.errors || {}).length) requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
        if (result.code === 'duplicate_review' && result.review) { setReview(result.review); setMessage(''); }
        else { setReview(null); setMessage(result.message); }
      } else {
        setReview(null);
        const destination = `${basePath}/${type}/${result.record.id}`;
        announce(`${{ clients: 'Client', projects: 'Project', invoices: 'Invoice draft' }[type]} ${id ? 'updated' : 'created'}${isOwner ? '.' : ' in this demo workspace.'}`, destination);
        navigate(destination);
      }
    } catch (failure) {
      if (mounted.current && isCurrent()) { setReview(null); setMessage(failure.message || 'The change could not be saved. Your entries are still here.'); }
    } finally {
      lock.current = false; if (mounted.current && isCurrent()) setBusy(false);
    }
  }
  function submit(event) {
    event.preventDefault();
    returnFocusRef.current = formRef.current?.querySelector('button[type="submit"]');
    return save();
  }
  return { values, errors, message, busy, formRef, change, submit, setValues: updateValues, review, returnFocusRef,
    dismissMessage: () => setMessage(''), closeReview: () => setReview(null), confirmReview: () => save(review.token),
    clearErrors: () => { setErrors(previous => Object.fromEntries(Object.entries(previous).filter(([field]) => field !== 'items' && !field.startsWith('item-')))); setMessage(''); } };
}
