import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/convex-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendLoop — Share more. Own less.",
  description:
    "Borrow everyday tools and share what you own with your neighborhood.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="en">
      <body>
        {configured ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#2854C5",
                colorPrimaryForeground: "#FFFFFF",
                colorBackground: "#FFFFFF",
                colorForeground: "#202938",
                colorNeutral: "#202938",
                colorMuted: "#F7F6F2",
                colorMutedForeground: "#566174",
                colorInput: "#FFFFFF",
                colorInputForeground: "#202938",
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
