import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const yekanBakh = localFont({
  src: [
    { path: "../../public/fonts/FaNum/Yekan Bakh FaNum 04 Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/FaNum/Yekan Bakh FaNum 05 Medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/FaNum/Yekan Bakh FaNum 06 Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/FaNum/Yekan Bakh FaNum 07 Heavy.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-yekan-bakh-local",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ترب بلیط | کشف و مقایسه پرواز",
  description: "ترب بلیط؛ جست‌وجو و مقایسه پرواز بر اساس قیمت، مسیر و سابقه لغو و ادامهٔ خرید در وب‌سایت فروشنده. داده‌های پیش‌فرض آزمایشی‌اند؛ ترب بلیط پرداخت یا صدور بلیط انجام نمی‌دهد.",
  applicationName: "ترب بلیط",
  icons: {
    icon: [
      { url: "/branding/favicon.ico", sizes: "32x32" },
      { url: "/branding/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/branding/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/branding/favicon.ico",
    apple: [{ url: "/branding/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl" className={yekanBakh.variable}><body>{children}</body></html>;
}
