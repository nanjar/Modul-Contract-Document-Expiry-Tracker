import type { Metadata } from 'next';
import './globals.css';
import './premium-login.css';
import '../components/workspace-chrome.css';
import WorkspaceChrome from '../components/WorkspaceChrome';
import { LanguageProvider } from '../components/LanguageProvider';

export const metadata: Metadata = {
  title: 'Expiry Tracker',
  description: 'Contract & Document Expiry Tracker',
};

const disableLoginNativeValidation = `
  (() => {
    const normalize = () => {
      document.querySelectorAll('.premium-login form').forEach((form) => {
        form.setAttribute('novalidate', '');
      });
    };
    normalize();
    new MutationObserver(normalize).observe(document.documentElement, { childList: true, subtree: true });
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><LanguageProvider><WorkspaceChrome>{children}</WorkspaceChrome></LanguageProvider><script dangerouslySetInnerHTML={{ __html: disableLoginNativeValidation }} /></body></html>;
}
