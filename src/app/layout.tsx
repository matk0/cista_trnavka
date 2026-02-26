import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cistatrnavka.sk";

export const metadata: Metadata = {
  title: "Čistá Trnávka",
  description: "Sledovanie čistenia rieky Trnávka v Trnave. Pridaj sa k nám a pomôž vyčistiť našu rieku!",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Čistá Trnávka",
    description: "Sledovanie čistenia rieky Trnávka v Trnave. Pridaj sa k nám a pomôž vyčistiť našu rieku!",
    url: siteUrl,
    siteName: "Čistá Trnávka",
    locale: "sk_SK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Čistá Trnávka",
    description: "Sledovanie čistenia rieky Trnávka v Trnave. Pridaj sa k nám a pomôž vyčistiť našu rieku!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}
      >
        {children}
      </body>
    </html>
  );
}
