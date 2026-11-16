import type { Metadata } from "next";
import "./globals.css";
import "./looks.css";

// System font only (style sheet decision). Concept wireframe by Artonest; all data is mock.
export const metadata: Metadata = {
  title: "Skyhand Wireframe",
  description: "Greyscale wireframe prototype for a concept drone control app (Artonest).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
