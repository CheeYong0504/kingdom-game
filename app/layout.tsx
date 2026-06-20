import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Realm Forge',
  description: 'A kingdom management strategy game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
