import {
  LayoutDashboard,
  UsersRound,
  FolderKanban,
  FileText,
  Wallet,
  Settings2,
} from 'lucide-react';

export const navigation = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    path: 'clients',
    label: 'Clients',
    icon: UsersRound,
    description: 'A home for your client relationships.',
  },
  {
    path: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    description: 'Keep every project moving forward.',
  },
  {
    path: 'invoices',
    label: 'Invoices',
    icon: FileText,
    description: 'Bring clarity to your billing.',
  },
  {
    path: 'payments',
    label: 'Payments',
    icon: Wallet,
    description: 'Know what has been paid, and what is still due.',
  },
  {
    path: 'settings',
    label: 'Settings',
    icon: Settings2,
    description: 'Make Accordiv feel like your business.',
  },
];
