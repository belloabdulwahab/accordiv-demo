import AccordivLogo from '../components/AccordivLogo.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, FlaskConical, Menu, RotateCcw, Sparkles } from 'lucide-react';
import { Brand, Button } from '../components/ui.jsx';
import NavigationDrawer from '../components/NavigationDrawer.jsx';
import Notice from '../components/Notice.jsx';
import { useWorkspaceNotice } from '../hooks/useWorkspaceNotice.js';
import { createDemoRepository } from '../services/demoRepository.js';
import { todayDate } from '../utils/date.js';
import { navigation } from './navigation.js';

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Brand light />
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="sidebar-nav">
        {navigation.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={`/demo/${path}`}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="sidebar-note-icon">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <strong>A little more clarity.</strong>
          <p>
            A little more space to do
            <br />
            your best work.
          </p>
          <Link to="/" onClick={onNavigate}>
            Meet Accordiv <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="sidebar-footer">
          <span className="availability-dot" />
          Demo workspace<span>v0.4</span>
        </div>
      </div>
    </>
  );
}

export default function DemoLayout() {
  const [repository] = useState(() => createDemoRepository());
  const [snapshot, setSnapshot] = useState(() => repository.getSnapshot());
  const [today, setToday] = useState(todayDate);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { announcement, announce, dismiss } = useWorkspaceNotice();
  const [resetVersion, setResetVersion] = useState(0);
  const triggerRef = useRef(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const location = useLocation();
  const current = navigation.find(
    (item) =>
      location.pathname === `/demo/${item.path}` ||
      location.pathname.startsWith(`/demo/${item.path}/`),
  );
  const title = current?.label || 'Page not found';

  useEffect(() => {
    document.title = `${title} · Accordiv`;
  }, [title]);
  useEffect(() => {
    const interval = window.setInterval(() => setToday(todayDate()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    // NavLink handles clicks; hash changes cover browser back/forward as well.
    window.addEventListener('hashchange', closeDrawer);
    return () => window.removeEventListener('hashchange', closeDrawer);
  }, [closeDrawer]);

  function resetDemo() {
    const next = repository.reset();
    setSnapshot(next);
    setResetVersion((version) => version + 1);
    setToday(todayDate());
    announce('Demo reset. Fresh sample data has been restored.');
  }

  function mutate(method, ...args) {
    const result = repository[method](...args);
    if (result.ok) setSnapshot(result.snapshot);
    return result;
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="desktop-sidebar">
        <SidebarContent />
      </aside>
      <NavigationDrawer open={drawerOpen} onClose={closeDrawer} triggerRef={triggerRef}>
        <SidebarContent onNavigate={closeDrawer} />
      </NavigationDrawer>
      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              ref={triggerRef}
              className="app-button button-icon menu-toggle"
              type="button"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb-parent">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="profile">
            <span className="profile-avatar" aria-hidden="true">
              JD
            </span>
            <div>
              <strong>Jamie Davis</strong>
              <span>Demo profile</span>
            </div>
          </div>
        </header>
        <div className="demo-banner">
          <div>
            <FlaskConical size={16} aria-hidden="true" />
            <span>
              Demo workspace <span className="banner-separator">·</span> Sample data{' '}
              <span className="banner-separator">·</span> Changes are temporary.
            </span>
          </div>
          <Button variant="text" onClick={resetDemo}>
            <RotateCcw size={14} aria-hidden="true" />
            Reset Demo
          </Button>
        </div>
        {snapshot.notice && (
          <div className="storage-notice" role="status">
            {snapshot.notice}
          </div>
        )}
        <Notice key={announcement?.id} message={announcement?.message} type="success" onDismiss={dismiss} className="workspace-feedback" />
        <main id="main-content" tabIndex={-1} className="main-content">
          <Outlet
            key={resetVersion}
            context={{ data: snapshot.data, today, mutate, announce, basePath: "/demo", isOwner: false }}
          />
        </main>
        <footer className="workspace-footer">
          <span>Made for the work you love.</span>
          <AccordivLogo className="workspace-logo" />
        </footer>
      </div>
    </div>
  );
}
