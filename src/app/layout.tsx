import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { defaultLocale, getDictionary } from "@/i18n";
import "@/styles/globals.css";

// Noto Sans covers both Latin and Devanagari, so Hindi renders without a fallback font.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
});

const dict = getDictionary(defaultLocale);

export const metadata: Metadata = {
  title: dict.meta.title,
  description: dict.meta.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale} className={`${notoSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
