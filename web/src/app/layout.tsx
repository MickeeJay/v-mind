import './globals.css';
import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk } from 'next/font/google';

const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo-black' });

export const metadata: Metadata = {
  title: 'V-Mind | Frontend Skeleton',
  description: 'Continuation-ready frontend shell for V-Mind on Stacks',
  other: {
    'talentapp:project_verification':
      'cfb81e09bd361ee16a287c6642199a23c33a7094cd0e1068569daa663dc3ca9872783d938973da99dbc6af93b52f090a8af2591fb8c589eb6070ac45c23ee4fc',
  },
};

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
