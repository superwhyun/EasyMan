import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserProvider } from "@/contexts/UserContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EasyMan Task Manager",
  description: "Efficient task management for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="flex h-full overflow-hidden bg-background">
          <UserProvider>
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </UserProvider>
        </div>
      </body>
    </html>
  );
}