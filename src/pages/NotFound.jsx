import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const { pathname } = useLocation();
  const basePath = pathname.startsWith('/owner') ? '/owner' : '/demo';
  return (
    <div className="not-found">
      <p className="eyebrow">404 · A SMALL DETOUR</p>
      <h1>This page isn’t here.</h1>
      <p>Let’s get you back to your workspace.</p>
      <Link to={`${basePath}/dashboard`} className="app-button button-primary">
        Go to dashboard
      </Link>
      <Link to="/" className="text-link">
        Accordiv home
      </Link>
    </div>
  );
}
