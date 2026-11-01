import type { Metadata } from 'next';
import './globals.css';
import { buildSiteJsonLd } from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tender.pryro.com';

export const metadata: Metadata = {
  title: {
    default: 'PryroTender – Rwanda Tenders & AI Proposals',
    template: '%s | PryroTender',
  },
  description: 'Find every Rwanda government and private tender in one place. Generate winning proposals with AI in seconds.',
  metadataBase: new URL(APP_URL),
  icons: { icon: '/tablogo.png' },
  openGraph: {
    siteName: 'PryroTender',
    type: 'website',
    locale: 'en_RW',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteJsonLd = buildSiteJsonLd(APP_URL);

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Site-wide structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col" style={{fontFamily:'Inter,system-ui,sans-serif'}}>{children}</body>
    </html>
  );
}
