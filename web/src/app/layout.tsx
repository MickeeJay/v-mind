import './globals.css';
import type { Metadata } from 'next';
import { siteMetadata } from '@/config/site-metadata';
import { fontDisplay, fontMono, fontSans } from '@/config/fonts';

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} font-sans`}>{children}</body>
    </html>
  );
}
