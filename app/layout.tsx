import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oshxona CRM",
  description: "Oshxona CRM — kafe uchun kassa, buyurtmalar, oshxona cheki va AI operator",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
