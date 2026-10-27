import AccordivLogo from './AccordivLogo.jsx';
import { ArrowUpRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Accordiv home">
      <AccordivLogo light={light} decorative />
    </Link>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button type="button" className={`app-button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SearchInput({ id, label, ...props }) {
  return (
    <div className="search-input">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search size={16} aria-hidden="true" />
      <input id={id} type="search" {...props} />
    </div>
  );
}

const labels = {
  unpaid: 'Unpaid',
  issued: 'Issued',
  active: 'Active',
  voided: 'Voided',
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partially paid',
  sent: 'Sent',
  draft: 'Draft',
  cancelled: 'Cancelled',
  planned: 'Planned',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
};
export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true" />
      {labels[status] || status}
    </span>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <section className={`app-card ${className}`} {...props}>
      {children}
    </section>
  );
}

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
