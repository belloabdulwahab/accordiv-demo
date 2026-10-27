import { useMountedRef, useWorkspace } from '../hooks/useWorkspace.js';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button, Card, EmptyState } from './ui.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import InvoiceTable from './InvoiceTable.jsx';

export function MissingRecord({ type }) {
  const { basePath, isOwner } = useWorkspace();
  return (
    <Card className="missing-record">
      <EmptyState
        title={`${{ clients: 'Client', projects: 'Project', invoices: 'Invoice', payments: 'Payment' }[type]} not found`}
      >
        {isOwner ? 'This record is unavailable in your account, or the link is incorrect.' : 'This record may have been removed by Reset Demo, or the link may be incorrect.'}
      </EmptyState>
      <Link className="app-button button-primary" to={`${basePath}/${type}`}>
        <ArrowLeft size={16} />
        Back to {type}
      </Link>
    </Card>
  );
}

export function ArchiveAction({ record, type }) {
  const { mutate, announce, isOwner, isCurrent } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useMountedRef();
  const [busy, setBusy] = useState(false);
  const action = record.archived ? 'Restore' : 'Archive';
  const label = type === 'clients' ? 'client' : 'project';
  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await mutate(
        type === 'clients' ? 'setClientArchived' : 'setProjectArchived',
        record.id,
        !record.archived,
      );
      if (!mounted.current || !isCurrent()) return;
      if (!result.ok) setError(result.message);
      else {
        announce(
          `${label === 'client' ? 'Client' : 'Project'} ${record.archived ? 'restored' : 'archived'}${isOwner ? '.' : ' in this demo workspace.'}`, 
        );
        setOpen(false);
      }
    } catch (failure) {
      if (mounted.current && isCurrent()) setError(failure.message || 'The change could not be saved. Please try again.');
    } finally {
      lock.current = false;
      if (mounted.current && isCurrent()) setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setError('');
          setOpen(true);
        }}
      >
        {record.archived ? (
          <RotateCcw size={16} aria-hidden="true" />
        ) : (
          <Archive size={16} aria-hidden="true" />
        )}
        {action} {label}
      </Button>
      {open && (
        <ConfirmDialog
          title={`${action} ${label}?`}
          action={`${action} ${label}`}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
          busy={busy}
          error={error}
          onErrorDismiss={() => setError('')}
        >
          <p>
            <strong>{record.name}</strong>
          </p>
          <p>
            {record.archived
              ? `This ${label} will return to the active list. Its ${type === 'projects' ? 'status and client relationship' : 'linked records'} will stay the same.`
              : type === 'clients'
                ? 'Projects, invoices and payments will be preserved. This client will no longer be available for new projects.'
                : 'The project will leave the active list and dashboard deadlines. Its status, invoices and payments will be preserved.'}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

export function InvoiceSummary({ invoices }) {
  return (
    <Card className="linked-invoices">
      <div className="card-heading">
        <div>
          <h2>Linked invoices</h2>
          <p>Current balances and recorded payment status.</p>
        </div>
      </div>
      {invoices.length ? (
        <InvoiceTable invoices={invoices} />
      ) : (
        <EmptyState title="No linked invoices">
          No invoices have been recorded for this record.
        </EmptyState>
      )}
    </Card>
  );
}
