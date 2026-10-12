import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fraud-detection-anomaly-pearl.vercel.app"),
  title: "Sentinel | Anomaly Detection & Fraud Prevention System",
  description:
    "Sistema preditivo de detecção de fraudes em tempo real com PyTorch Autoencoders, Isolation Forest e decisão sensível a custo. 488K transações analisadas, R$ 7.7M em perdas evitadas.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Sentinel | Anomaly Detection & Fraud Prevention System",
    description:
      "Detecção de fraudes em tempo real com ensemble de Isolation Forest e PyTorch Autoencoders. 488K transações analisadas, R$ 7.7M em perdas evitadas.",
    url: "https://fraud-detection-anomaly-pearl.vercel.app",
    siteName: "Sentinel • RN Intelligence",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sentinel Anomaly Detection & Fraud Prevention System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel | Anomaly Detection & Fraud Prevention System",
    description:
      "Detecção de fraudes em tempo real com ensemble de Isolation Forest e PyTorch Autoencoders. Powered by RN Intelligence.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`dark ${comfortaa.variable}`}>
      <body className={`${comfortaa.className} font-sans min-h-screen antialiased bg-[#090d16] text-slate-100`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
