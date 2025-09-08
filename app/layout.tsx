import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono", 
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "XPortal - AVETMISS Compliance Management",
  description: "Comprehensive RTO management and AVETMISS compliance platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <main className="min-h-screen bg-background" aria-live="polite">
                  <div className="p-2">
                    <SidebarTrigger aria-label="Toggle sidebar" />
                  </div>
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
            <Toaster position="bottom-right" richColors />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
