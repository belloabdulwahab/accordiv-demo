import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FileText,
  FolderKanban,
  Menu,
  UsersRound,
  Wallet,
  Settings2,
} from 'lucide-react';
import { Brand } from '../components/ui.jsx';
import NavigationDrawer from '../components/NavigationDrawer.jsx';
import MarketingPreview from '../components/MarketingPreview.jsx';
import SalesEnquiry from '../components/SalesEnquiry.jsx';
import PublicContactLinks from '../components/PublicContactLinks.jsx';
import { MARKETING_CONTACT } from '../config/marketingContact.js';

const sections = [
  ['features', 'Features'],
  ['workflow', 'How it works'],
  ['questions', 'FAQs'],
];
const features = [
  {
    icon: UsersRound,
    title: 'Give every client a home.',
    text: 'Keep contact details and notes alongside linked projects and invoices. Search your clients and archive old relationships without losing their history.',
    label: 'CLIENT RELATIONSHIPS',
    tone: 'violet',
  },
  {
    icon: FolderKanban,
    title: 'Keep the work in view.',
    text: 'Organise scope, dates, status and agreed fees. See active project deadlines on the dashboard, with planning amounts kept separate from your invoices.',
    label: 'PROJECT MANAGEMENT',
    tone: 'blue',
  },
  {
    icon: FileText,
    title: 'Turn completed work into clear invoices.',
    text: 'Build itemised drafts, review and issue them, then download a PDF. Issued billing details stay saved even when contact information changes later.',
    label: 'INVOICES & PDFS',
    tone: 'orange',
  },
  {
    icon: Wallet,
    title: "Know what's paid and what's due.",
    text: 'Record payments already received, including partial payments. Balances update immediately, and mistaken records can be voided with a reason and a visible history.',
    label: 'PAYMENT TRACKING',
    tone: 'green',
  },
];
const faqs = [
  [
    'What can I try today?',
    'The demo includes client and project management, draft and issued invoices, PDF downloads, manual payment records, and business settings. You can create, edit, archive and explore fictional records.',
  ],
  [
    'Will the demo keep my changes?',
    'Changes are saved temporarily in this browser tab and normally survive refresh. Reset Demo restores the samples. Browser storage may be unavailable, and this is not durable business storage. Use fictional information.',
  ],
  [
    'Does Accordiv collect payments or send invoices by email?',
    'No. Issue invoice records issuance without sending email. Record payment logs money you have already received; it does not collect money. Voiding a payment corrects the record and does not issue a refund.',
  ],
  [
    'Can I add my business details?',
    'Yes, in demo Settings. Set business details, default notes, payment instructions and payment terms. New drafts use these defaults; issued invoices keep their saved business and client details.',
  ],
  [
    'Is owner login available? Is this accounting software?',
    'Existing owners can sign in to their configured full installation. This public demo does not offer hosted owner registration. Accordiv is a client, project and invoicing workspace, not a complete accounting or tax-compliance system. NGN is currently the only currency.',
  ],
  [
    'How do I get Accordiv for my business?',
    'Review the four service packages in Get Accordiv, then send an enquiry when online sending is available, or contact Abdulwahab directly on WhatsApp or by email. Scope and charges are agreed individually.',
  ],
];

// publicOnly changes navigation copy; the separate export entry controls which routes and modules exist.
export default function Landing({ publicOnly = false }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trigger = useRef(null);
  const [search] = useSearchParams();
  const location = useLocation();
  const section = search.get('section');
  useEffect(() => {
    document.title = 'Accordiv Â· Clients, projects and invoices in one workspace';
    const frame = requestAnimationFrame(() => {
      const target =
        ['features', 'workflow', 'questions', 'sales', 'demo'].includes(section) &&
        document.getElementById(section);
      if (target) {
        target.querySelector('h2')?.focus({ preventScroll: true });
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
      } else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [section, location.key]);
  const navigation = (mobile = false) => (
    <>
      {publicOnly ? (
        <button type="button" className="public-owner-control" aria-disabled="true" aria-describedby={mobile ? 'public-owner-mobile-explanation' : 'public-owner-explanation'}>
          Owner Account <span>Unavailable in demo</span>
        </button>
      ) : <Link to="/owner/login" onClick={close}>Owner Account</Link>}
      {publicOnly && mobile && <p id="public-owner-mobile-explanation" className="public-owner-mobile-explanation">Owner access is available in full installations. Explore the demo or enquire about setup.</p>}
      <Link to="/?section=sales" onClick={close}>Get Accordiv</Link>
      {sections.map(([id, label]) => (
        <Link key={id} to={`/?section=${id}`} onClick={close}>
          {label}
        </Link>
      ))}
      <Link className="app-button button-primary" to="/demo/dashboard" onClick={close}>
        Try Live Demo
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </>
  );
  return (
    <div className="marketing">
      <a
        className="skip-link"
        href="#/"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('marketing-main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-nav">
          <Brand />
          <nav className="marketing-desktop-nav" aria-label="Public navigation">
            {navigation()}
          </nav>
          <button
            ref={trigger}
            type="button"
            className="app-button button-secondary marketing-menu"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
        </div>
      </header>
      <NavigationDrawer open={open} onClose={close} triggerRef={trigger}>
        <Brand light />
        <nav className="marketing-mobile-nav" aria-label="Public navigation">
          {navigation(true)}
        </nav>
      </NavigationDrawer>
      <main id="marketing-main" tabIndex={-1}>
        <div className="marketing-container">
          {publicOnly && <p id="public-owner-explanation" className="public-owner-explanation marketing-content">Owner access is available in full installations. Explore the demo or enquire about setup.</p>}
          <section className="marketing-hero marketing-content" aria-labelledby="hero-title">
            <div className="marketing-hero-copy">
              <p className="marketing-kicker">
                <span />
                FOR FREELANCERS & SMALL BUSINESSES
              </p>
              <h1 id="hero-title">
                Your work,
                <br />
                Your clients,
                <br />
                <em>All together.</em>
              </h1>
              <p className="marketing-lead">
                A clearer place to manage clients, organise projects, issue invoices and track
                payments you've received.
              </p>
              <div className="marketing-actions">
                <Link className="app-button button-primary" to="/demo/dashboard">
                  Try Live Demo
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link className="app-button button-secondary" to="/?section=sales">
                  Get Accordiv
                </Link>
              </div>
              <p className="marketing-reassurance">
                <Check size={16} aria-hidden="true" />
                No sign-up. Explore with fictional sample data.
              </p>
            </div>
            <MarketingPreview />
          </section>
          <div className="marketing-intro marketing-content">
            <p>
              FROM THE FIRST CONVERSATION
              <br />
              <strong>to the final recorded payment.</strong>
            </p>
            <span>Keep the details connected, so the next step is easier to find.</span>
          </div>
          <section className="marketing-section marketing-content" id="features" aria-labelledby="features-title">
            <div className="section-heading">
              <p className="eyebrow">ROOM FOR THE WORK THAT MATTERS</p>
              <h2 id="features-title" tabIndex={-1}>
                One workspace.
                <br />
                Four everyday essentials.
              </h2>
              <p>
                Practical tools for keeping your client work organised, from first brief to invoice
                balance.
              </p>
            </div>
            <div className="marketing-feature-grid">
              {features.map(({ icon: Icon, title, text, label, tone }) => (
                <article className={`marketing-feature feature-${tone}`} key={label}>
                  <div className="feature-icon">
                    <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <p className="feature-label">{label}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="marketing-settings-note">
              <Settings2 size={24} aria-hidden="true" />
              <div>
                <h3>A little more yours.</h3>
                <p>
                  Set your demo business details, invoice notes and payment terms. Defaults save
                  repetition; you stay in control of each draft.
                </p>
              </div>
            </div>
          </section>
          <section
            className="marketing-section workflow-section marketing-content"
            id="workflow"
            aria-labelledby="workflow-title"
          >
            <div className="section-heading">
              <p className="eyebrow">A NATURAL WAY TO WORK</p>
              <h2 id="workflow-title" tabIndex={-1}>
                From hello to paid,
                <br />
                one clear step at a time.
              </h2>
            </div>
            <ol className="marketing-workflow">
              {[
                ['Add a client', "Save the contact details and notes you'll need again."],
                ['Organise a project', 'Give the work a scope, status and useful dates.'],
                ['Issue an invoice', 'Review your draft and download a clear, itemised PDF.'],
                ['Record payment', 'Log money already received and see the balance update.'],
              ].map(([title, text], index) => (
                <li key={title}>
                  <span className="workflow-number">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </section>
          <section
            className="marketing-section demo-section marketing-content"
            id="demo"
            aria-labelledby="demo-title"
          >
            <div>
              <p className="eyebrow">TAKE A LOOK AROUND</p>
              <h2 id="demo-title" tabIndex={-1}>
                Try it with a little
                <br />
                work already in place.
              </h2>
              <p>
                Meet fictional clients, explore their projects, and follow an invoice through to
                payment. Then create a few records of your own.
              </p>
              <Link className="app-button button-primary" to="/demo/dashboard">
                Try Live Demo
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <ul className="demo-facts">
              <li>
                <Check size={18} aria-hidden="true" />
                <span>
                  <strong>Your own temporary workspace</strong>Changes stay in this browser tab.
                  Reset brings the samples back.
                </span>
              </li>
              <li>
                <Check size={18} aria-hidden="true" />
                <span>
                  <strong>No money or email is sent</strong>Payment actions record activity. They do
                  not collect or refund money.
                </span>
              </li>
              <li>
                <Check size={18} aria-hidden="true" />
                <span>
                  <strong>Fictional details, please</strong>This demo uses temporary browser data.
                  Full installations keep owner records separately.
                </span>
              </li>
            </ul>
          </section>
          <section
            className="marketing-section faq-section marketing-content"
            id="questions"
            aria-labelledby="questions-title"
          >
            <div className="section-heading">
              <p className="eyebrow">A FEW USEFUL ANSWERS</p>
              <h2 id="questions-title" tabIndex={-1}>
                Before you get started.
              </h2>
            </div>
            <div className="marketing-faqs">
              {faqs.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>
          <SalesEnquiry />
        </div>
      </main>
      <footer className="marketing-footer">
        <div className="marketing-container">
          <div className="marketing-footer-main">
            <div className="marketing-footer-brand">
              <Brand />
              <p>A little more clarity for your working day.</p>
            </div>
            <Link className="marketing-footer-navigation" to="/?section=sales">
              Get Accordiv
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <PublicContactLinks compact />
          </div>
          <p className="marketing-attribution">
            Built by <a href={MARKETING_CONTACT.portfolio} target="_blank" rel="noopener noreferrer">Abdulwahab</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
