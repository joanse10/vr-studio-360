import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'VR Studio 360 — Визуализация интерьеров',
    template: '%s | VR Studio 360',
  },
  description: 'Платформа для просмотра 360° панорамных визуализаций интерьеров и архитектурных проектов. Рендеры помещений с переходами между комнатами.',
  keywords: ['360 визуализация', 'панорама', '3D рендер', 'интерьер', 'архитектура', 'дизайн', 'VR тур'],
  authors: [{ name: 'VR Studio 360' }],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    title: 'VR Studio 360 — Визуализация интерьеров',
    description: 'Платформа для просмотра 360° панорамных визуализаций интерьеров и архитектурных проектов.',
    siteName: 'VR Studio 360',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VR Studio 360',
    description: 'Платформа для просмотра 360° панорамных визуализаций интерьеров.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'VR Studio 360',
              description: 'Платформа для просмотра 360° панорамных визуализаций интерьеров',
              applicationCategory: 'DesignApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className="bg-ink-900 text-ink-100 antialiased">
        {children}
      </body>
    </html>
  );
}
