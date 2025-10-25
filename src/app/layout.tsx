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

export const metadata: Metadata = {
  title: "Sasha K Makeup - AI Booking Concierge",
  description:
    "Book luxury makeup sessions with Sasha K through an always-on AI assistant ready with pricing, availability, and instant confirmations.",
  openGraph: {
    title: "Sasha K Makeup - AI Booking Concierge",
    description:
      "Secure Sasha K for bridal, red carpet, or editorial glam using an intelligent concierge that responds instantly.",
    url: "https://agentic-a8f7b870.vercel.app",
    siteName: "Sasha K Makeup",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sasha K Makeup - AI Booking Concierge",
    description:
      "Chat with Sasha's AI assistant to get availability, pricing, and bookings confirmed in seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
