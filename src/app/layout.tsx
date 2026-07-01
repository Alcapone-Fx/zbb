import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Balancr",
  description: "Presupuesto de base cero personal",
  manifest: "/manifest.json",
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Balancr",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1422",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} dark`}
      data-accent="azul"
      suppressHydrationWarning
    >
      <head>
        {/* Prevent dark-mode flash before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('zbb-theme')||'{}');var s=t.state||{};var m=s.mode||'dark';var a=s.accent||'azul';var d=document.documentElement;var p=window.matchMedia('(prefers-color-scheme: dark)').matches;if(m==='dark'||(m==='system'&&p)){d.classList.add('dark')}else{d.classList.remove('dark');}d.dataset.accent=a;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
