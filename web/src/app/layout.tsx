import './globals.css';
import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk } from 'next/font/google';
import { siteMetadata } from '@/config/site-metadata';

const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo-black' });

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${space.variable} ${archivoBlack.variable}`}>{children}</body>
    </html>
  );
}
