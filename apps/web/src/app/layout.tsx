import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { AuthProvider } from "@/context/auth";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Growwlytics",
  description: "AI-powered content intelligence for Instagram & YouTube creators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable}`}>
      <body className="font-sans bg-brand-bg text-brand-text">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
