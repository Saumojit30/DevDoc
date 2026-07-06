import type { Metadata } from "next"
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "./providers"
import "./globals.css"

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "Dev-Doc | Developer Documentation Ecosystem",
  description: "Knowledge-graph-powered developer Q&A with Cognee",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className={`${hanken.variable} ${jetbrains.variable} font-body-md antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
