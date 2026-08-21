import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Expiry Tracker',
  description: 'Contract & Document Expiry Tracker',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
