import { Link } from 'react-router-dom';
import { Brand } from '../components/ui.jsx';

export default function PublicOwnerUnavailable() {
  return <div className="marketing"><main className="marketing-container public-owner-page">
    <Brand />
    <h1>Owner Account</h1>
    <p><strong>Unavailable in demo</strong></p>
    <p>Owner access is available in full installations. Explore the demo or enquire about setup.</p>
    <div className="marketing-actions">
      <Link className="app-button button-primary" to="/demo/dashboard">Try Demo</Link>
      <Link className="app-button button-secondary" to="/?section=sales">Get Accordiv</Link>
    </div>
  </main></div>;
}
