import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { authConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Zenaide Revenue Engine",
  description:
    "Sistem operasi revenue internal Zenaide Design — Instagram & Meta Recovery Engine.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar showLogout={authConfigured()} />
          <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
