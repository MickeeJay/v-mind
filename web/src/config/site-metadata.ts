import type { Metadata } from 'next';

export const SITE_URL = 'https://v-mind.app';

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'V-Mind | Bitcoin-Native Strategy Vaults',
    template: '%s | V-Mind',
  },
  description:
    'Professional-grade DeFi interface for Bitcoin-native strategy vaults on Stacks. Monitor vault health, execute deposits, and manage risk with precision.',
  applicationName: 'V-Mind',
  category: 'finance',
  referrer: 'strict-origin-when-cross-origin',
  openGraph: {
    title: 'V-Mind | Bitcoin-Native Strategy Vaults',
    description:
      'Professional-grade DeFi interface for Bitcoin-native strategy vaults on Stacks. Built for trust, execution precision, and transparent on-chain operations.',
    url: SITE_URL,
    siteName: 'V-Mind',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og/vmind-og.svg',
        width: 1200,
        height: 630,
        alt: 'V-Mind Bitcoin-native DeFi application',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'V-Mind | Bitcoin-Native Strategy Vaults',
    description:
      'DeFi strategy vault operations on Stacks, designed for security and operational clarity.',
    images: ['/og/vmind-og.svg'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  other: {
    'talentapp:project_verification':
      'cfb81e09bd361ee16a287c6642199a23c33a7094cd0e1068569daa663dc3ca9872783d938973da99dbc6af93b52f090a8af2591fb8c589eb6070ac45c23ee4fc',
  },
};
