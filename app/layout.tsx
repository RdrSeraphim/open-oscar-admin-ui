import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/ui/Sidebar";
import { ToastProvider } from "./components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aimctl — open-oscar-server admin",
  description: "Admin UI for managing an open-oscar-server instance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen">
        <ToastProvider>
          <div className="w-64 shrink-0 md:w-72">
            <Sidebar />
          </div>
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
