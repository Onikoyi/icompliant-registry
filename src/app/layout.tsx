import "./globals.css"
import { ReactNode } from "react"
import BrandHeader from "@/components/layout/BrandHeader"
import AppFooter from "@/components/layout/AppFooter"
import Sidebar from "@/components/layout/Sidebar"

export const metadata = {
  title: "Digital Registry",
  description: "Nikosoft Digital Registry System",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-gray-900">

        <div className="min-h-screen flex flex-col">

          {/* 🔷 GLOBAL HEADER */}
          <BrandHeader />

          {/* 🔷 CONTENT AREA WITH SIDEBAR */}
          <div className="flex flex-1 max-w-7xl mx-auto w-full">

            {/* SIDEBAR */}
            <div className="hidden md:block">
              <Sidebar />
            </div>

            {/* MAIN CONTENT */}
            <main className="flex-1 px-4 md:px-6 py-6">
              {children}
            </main>

          </div>

          {/* 🔷 GLOBAL FOOTER */}
          <AppFooter />

        </div>

      </body>
    </html>
  )
}