import { Navigate, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard.jsx';
import Settings from '../pages/Settings.jsx';
import NotFound from '../pages/NotFound.jsx';
import Clients from '../pages/Clients.jsx';
import ClientDetail from '../pages/ClientDetail.jsx';
import ClientForm from '../pages/ClientForm.jsx';
import Projects from '../pages/Projects.jsx';
import ProjectDetail from '../pages/ProjectDetail.jsx';
import ProjectForm from '../pages/ProjectForm.jsx';
import Invoices from '../pages/Invoices.jsx';
import InvoiceForm from '../pages/InvoiceForm.jsx';
import InvoiceDetail from '../pages/InvoiceDetail.jsx';
import Payments from '../pages/Payments.jsx';
import PaymentForm from '../pages/PaymentForm.jsx';
import PaymentDetail from '../pages/PaymentDetail.jsx';


// Both builds share these screens; the parent layout supplies either demo or authenticated data access.
export function workspaceRoutes() {
  return <>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/new" element={<ClientForm />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:id/edit" element={<ClientForm />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="invoices/:id/payments/new" element={<PaymentForm />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:id" element={<PaymentDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
  </>;
}
