import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import "./globals.css";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentinel | Anomaly Detection & Fraud Prevention System",
  description: "Production-ready real-time fraud detection with PyTorch Autoencoders and Isolation Forest.",
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
      </body>
    </html>
  );
}
