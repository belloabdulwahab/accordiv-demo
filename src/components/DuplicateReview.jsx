import { Link } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog.jsx';
import { PROJECT_STATUSES } from '../services/recordRules.js';
import { useWorkspace } from '../hooks/useWorkspace.js';

export default function DuplicateReview({ form }) {
  const { basePath } = useWorkspace();
  if (!form.review) return null;
  const client = form.review.kind === 'clients';
  return <ConfirmDialog title={`Possible duplicate ${client ? 'contacts' : 'projects'}`}
    action={`Save separate ${client ? 'contact' : 'project'}`} cancelLabel="Return to editing"
    returnFocusRef={form.returnFocusRef} onClose={form.closeReview} onConfirm={form.confirmReview} busy={form.busy}>
    <p>{client ? 'These contacts share the same name and company. Check their details before confirming a separate contact.' : 'These projects have the same title for this client. Return to editing to choose a distinguishing title, or confirm a separate project.'}</p>
    <ul className="duplicate-matches">{form.review.matches.map(match => <li key={match.id}>
      <Link to={`${basePath}/${form.review.kind}/${match.id}`}>{client ? match.contact : match.name}</Link>
      {client ? <><span>Company: {match.company || 'No company'}</span><span>{match.email}</span><span>Phone: {match.phone || 'Not supplied'}</span></>
        : <><span>{PROJECT_STATUSES[match.status]}</span><span>Start: {match.startDate || 'Not supplied'} · Deadline: {match.deadline || 'Not supplied'}</span></>}
      <span>{match.archived ? 'Archived' : 'Not archived'}</span>
    </li>)}</ul>
  </ConfirmDialog>;
}
