import type { Metadata, Viewport } from 'next'
import { Shell } from '@/components/Shell'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'NewsSharing — महासंवाद',
    template: '%s · NewsSharing',
  },
  description: 'वृत्त संकलन, तपासणी, फोल्ड निर्मिती आणि वितरण — माहिती व जनसंपर्क महासंचालनालय, महाराष्ट्र',
}

export const viewport: Viewport = {
  themeColor: '#f6f5f2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mr">
      <body className="flex min-h-screen flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
