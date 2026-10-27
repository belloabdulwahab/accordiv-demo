import { Mail } from 'lucide-react';
import { MARKETING_CONTACT } from '../config/marketingContact.js';
import { salesContactLinks } from '../services/marketingContact.js';

function ContactIcon({ kind }) {
  if (kind === 'email') return <Mail size={24} aria-hidden="true" focusable="false" />;
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      {kind === 'whatsapp' && <>
        <path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.6l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.2 7.4c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.6 4 3.6 2 .8 2.4.7 2.9.7.4 0 1.4-.6 1.6-1.1.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.6-.4l-1.7-.8c-.2-.1-.4-.1-.6.2l-.8.9c-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.1-1.3-.8-.7-1.3-1.6-1.4-1.8-.2-.3 0-.4.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6l-.8-1.9Z" fill="currentColor" />
      </>}
      {kind === 'instagram' && <g fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </g>}
      {kind === 'x' && <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.4-8.6L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z" />}
    </svg>
  );
}

export default function PublicContactLinks({ compact = false }) {
  const links = salesContactLinks();
  const contacts = [
    { kind: 'whatsapp', href: links.whatsapp, label: 'WhatsApp ' + MARKETING_CONTACT.displayPhone },
    { kind: 'instagram', href: MARKETING_CONTACT.instagram, label: 'Accordiv developer on Instagram' },
    { kind: 'x', href: MARKETING_CONTACT.x, label: 'Accordiv developer on X' },
    { kind: 'email', href: links.email, label: 'Email Abdulwahab' },
  ];
  return (
    <div className={'public-contact-links' + (compact ? ' public-contact-links-compact' : '')}>
      {contacts.map(({ kind, href, label }) => (
        <a key={kind} className={'public-contact-button contact-' + kind} href={href}
          aria-label={label} title={label}
          {...(kind !== 'email' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          <ContactIcon kind={kind} />
          <span className={kind === 'whatsapp' && !compact ? '' : 'visually-hidden'}>{label}</span>
        </a>
      ))}
    </div>
  );
}
