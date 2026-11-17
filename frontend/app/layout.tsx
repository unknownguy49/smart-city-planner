
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { ThemeProvider } from "../components/theme/ThemeProvider";
import ReportSnapshotBridge from "../components/reports/ReportSnapshotBridge";
import { AuthProvider } from "../contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart City Planner",
  description: "AI Powered Urban Planning Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ReportSnapshotBridge />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
