import { FolderKanban, LayoutDashboard, FileText, UsersRound, Wallet } from 'lucide-react';
import AccordivLogo from './AccordivLogo.jsx';
import { Card, StatusBadge } from './ui.jsx';
import { formatMoney } from '../utils/money.js';
import { invoiceBalance, invoiceTotal } from '../services/finance.js';

const sample = {
  id: 'preview',
  items: [{ description: 'Brand identity', quantity: 1, unitAmount: 15000000 }],
  status: 'issued',
};
const payments = [{ invoiceId: 'preview', amount: 5000000, status: 'active' }];

export default function MarketingPreview() {
  return (
    <figure className="marketing-preview">
      <figcaption>
        AN INSIDE LOOK <span>Fictional sample · NGN</span>
      </figcaption>
      <div className="preview-window">
        <aside aria-hidden="true" className="preview-sidebar">
          <AccordivLogo symbolOnly decorative className="preview-logo" />
          {[LayoutDashboard, UsersRound, FolderKanban, FileText, Wallet].map((Icon, index) => (
            <span key={index} className={index === 0 ? 'preview-active' : ''}>
              <Icon size={18} />
            </span>
          ))}
        </aside>
        <div className="preview-workspace">
          <div className="preview-top">
            <span>Demo workspace</span>
            <span className="preview-avatar">JD</span>
          </div>
          <div className="preview-body">
            <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
            <h2>A clearer view of your work.</h2>
            <div className="preview-stats">
              <Card>
                <Wallet size={17} aria-hidden="true" />
                <span>Payments received</span>
                <strong>{formatMoney(5000000)}</strong>
              </Card>
              <Card>
                <FileText size={17} aria-hidden="true" />
                <span>Outstanding balance</span>
                <strong>{formatMoney(invoiceBalance(sample, payments))}</strong>
              </Card>
            </div>
            <Card className="preview-invoice">
              <div className="preview-row">
                <h3>Recent invoice</h3>
                <StatusBadge status="partial" />
              </div>
              <div className="preview-client">
                <span className="client-avatar avatar-violet">BS</span>
                <div>
                  <strong>Bloom Studio</strong>
                  <span>INV-007 · Brand identity</span>
                </div>
              </div>
              <div className="preview-row">
                <span>Total {formatMoney(invoiceTotal(sample))}</span>
                <strong>{formatMoney(invoiceBalance(sample, payments))} due</strong>
              </div>
            </Card>
            <div className="preview-project">
              <FolderKanban size={19} aria-hidden="true" />
              <div>
                <strong>Brand identity refresh</strong>
                <span>In progress · A project with a clear next step</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="preview-caption">
        A preview of the workflow. Open the live demo to explore and make changes.
      </p>
    </figure>
  );
}
