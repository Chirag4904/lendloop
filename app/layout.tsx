import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});
const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/convex-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendLoop — Good things deserve to go around.",
  description:
    "Borrow everyday tools and share what you own with your neighborhood.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        {configured ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#152D3B",
                colorPrimaryForeground: "#FFFFFF",
                colorBackground: "#FFFFFF",
                colorForeground: "#152D3B",
                colorNeutral: "#152D3B",
                colorMuted: "#F6F2E9",
                colorMutedForeground: "#536269",
                colorInput: "#FFFFFF",
                colorInputForeground: "#152D3B",
                borderRadius: "1rem",
              },
              elements: {
                userButtonPopoverRootBox: {
                  backgroundColor: "#FFFFFF",
                  borderRadius: "20px",
                  boxShadow: "0 18px 50px rgba(32, 41, 56, 0.18)",
                },
                userButtonPopoverCard: {
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #D7DCE4",
                },
              },
            }}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
