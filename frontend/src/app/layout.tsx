import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrustVerse | Digital Trust Infrastructure",
  description: "Digital trust infrastructure combining ZK proofs and AI forensics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black min-h-screen text-gray-100 selection:bg-blue-500/30 selection:text-blue-200 antialiased`}>
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <Header />
        <main className="relative flex flex-col min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </body>
    </html>
  );
}
