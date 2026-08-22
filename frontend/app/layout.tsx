import type { Metadata } from 'next';
import './globals.css';
import '../components/workspace-chrome.css';
import WorkspaceChrome from '../components/WorkspaceChrome';

export const metadata: Metadata = {
  title: 'Expiry Tracker',
  description: 'Contract & Document Expiry Tracker',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WorkspaceChrome>{children}</WorkspaceChrome></body></html>;
}
