import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen antialiased bg-[#090d16] text-slate-100">
        {children}
      </body>
    </html>
  );
}
