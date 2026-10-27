import { addDays, todayDate } from '../../src/utils/date.js';
import { upgradeDemoData } from '../../src/data/upgradeDemoData.js';

export function createLegacyDemoData(today = todayDate()) {
  const clients = [
    {
      id: 'client-1',
      name: 'Bloom Studio',
      contact: 'Ada Bello',
      email: 'ada@bloom.example.com',
      initials: 'BS',
      color: 'violet',
    },
    {
      id: 'client-2',
      name: 'Form & Field',
      contact: 'Tomi Cole',
      email: 'tomi@formfield.example.com',
      initials: 'FF',
      color: 'blue',
    },
    {
      id: 'client-3',
      name: 'Northstar Labs',
      contact: 'Sam Okoro',
      email: 'sam@northstar.example.com',
      initials: 'NL',
      color: 'orange',
    },
    {
      id: 'client-4',
      name: 'Olive & Co.',
      contact: 'Jude Green',
      email: 'jude@olive.example.com',
      initials: 'OC',
      color: 'green',
    },
  ];
  const projects = [
    {
      id: 'project-1',
      clientId: 'client-1',
      name: 'Brand identity refresh',
      status: 'active',
      deadline: addDays(today, 3),
      progress: 75,
    },
    {
      id: 'project-2',
      clientId: 'client-2',
      name: 'E-commerce website',
      status: 'active',
      deadline: addDays(today, 7),
      progress: 45,
    },
    {
      id: 'project-3',
      clientId: 'client-3',
      name: 'Product launch campaign',
      status: 'active',
      deadline: addDays(today, 12),
      progress: 30,
    },
    {
      id: 'project-4',
      clientId: 'client-4',
      name: 'Packaging design',
      status: 'completed',
      deadline: addDays(today, -12),
      progress: 100,
    },
  ];
  const invoice = (id, clientId, projectId, description, naira, issued, due, status = 'sent') => ({
    id,
    clientId,
    projectId,
    number: `INV-00${id.split('-')[1]}`,
    status,
    issuedDate: addDays(today, issued),
    dueDate: addDays(today, due),
    items: [{ description, quantity: 1, unitAmount: naira * 100 }],
  });
  const invoices = [
    invoice(
      'invoice-6',
      'client-2',
      'project-2',
      'Website development — milestone 2',
      320000,
      -2,
      12,
    ),
    invoice(
      'invoice-5',
      'client-1',
      'project-1',
      'Brand strategy & visual identity',
      250000,
      -5,
      9,
    ),
    invoice('invoice-4', 'client-3', 'project-3', 'Launch campaign creative', 180000, -20, -6),
    invoice('invoice-3', 'client-4', 'project-4', 'Packaging design delivery', 150000, -28, -14),
    invoice(
      'invoice-2',
      'client-2',
      'project-2',
      'Website development — milestone 1',
      300000,
      -40,
      -26,
    ),
    invoice('invoice-1', 'client-1', 'project-1', 'Brand discovery workshop', 100000, -55, -41),
  ];
  const payments = [
    { id: 'payment-1', invoiceId: 'invoice-1', amount: 10000000, date: addDays(today, -43) },
    { id: 'payment-2', invoiceId: 'invoice-2', amount: 30000000, date: addDays(today, -29) },
    { id: 'payment-3', invoiceId: 'invoice-3', amount: 15000000, date: addDays(today, -15) },
    { id: 'payment-4', invoiceId: 'invoice-5', amount: 10000000, date: addDays(today, -3) },
  ];
  const data = upgradeDemoData({
    version: 1,
    createdOn: today,
    clients,
    projects,
    invoices,
    payments,
  });
  const fees = [35000000, 62000000, 18000000, 15000000];
  data.projects.forEach((project, index) => {
    project.fee = fees[index];
    project.startDate = addDays(today, -60);
  });
  return data;
}
