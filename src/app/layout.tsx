import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Manrope, Mukta, Poppins } from 'next/font/google'
import { Shell } from '@/components/Shell'
import './globals.css'

/* The three faces the news map is set in, declared here and used nowhere but
   inside `.newsmap` — see `src/styles/tokens.css`. They have to be declared on
   `<html>` because the map's panels portal onto `<body>`, outside the page
   element that would otherwise carry them. Declaring a variable is not using
   it: every other screen in this product still reads `--font-ui`.

   Poppins is static on Google Fonts, so every weight the map sets is named.
   `font-synthesis-weight: none` in `styles/base.css` means an unlisted weight
   is not faked; it falls back instead. */
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' })

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  variable: '--font-poppins',
})

/* The public news page's body face (headings are Poppins). Mukta is drawn for
   Devanagari first, so a Marathi summary sets as evenly as its Latin digits. */
const mukta = Mukta({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['devanagari', 'latin'],
  display: 'swap',
  variable: '--font-mukta',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

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
    <html
      lang="mr"
      className={`${manrope.variable} ${poppins.variable} ${mukta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
