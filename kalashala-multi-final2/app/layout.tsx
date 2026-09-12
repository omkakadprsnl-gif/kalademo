import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalashala — कला • कौशल • आत्मनिर्भरता",
  description: "Kalashala online craft and embroidery learning platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
