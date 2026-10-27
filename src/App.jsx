import { Route, Routes } from 'react-router-dom';
import { workspaceRoutes } from './routes/workspaceRoutes.jsx';
import DemoLayout from './layouts/DemoLayout.jsx';
import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';
import PublicOwnerUnavailable from './pages/PublicOwnerUnavailable.jsx';

// This is the public import boundary: owner URLs show information without loading authentication modules.
export default function App() {
  return <Routes>
    <Route path="/" element={<Landing publicOnly />} />
    <Route path="/owner/*" element={<PublicOwnerUnavailable />} />
    <Route path="/demo" element={<DemoLayout />}>{workspaceRoutes()}</Route>
    <Route path="*" element={<NotFound />} />
  </Routes>;
}
