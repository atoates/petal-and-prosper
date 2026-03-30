import type { Metadata } from "next";
import { Crimson_Text, Inter } from "next/font/google";
import "./globals.css";

const seriffont = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Petal & Prosper | Floristry Business Management",
  description:
    "Simple and powerful floristry business management software. Manage enquiries, orders, proposals, invoices, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${seriffont.variable} ${sansFont.variable}`}>
      <body className="bg-[#FFF8F0] font-sans">{children}</body>
    </html>
  );
}
