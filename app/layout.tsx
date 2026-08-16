import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.scss";

const siteName = "敲敲韓國代購";
const siteDescription = "收藏每一個心動瞬間。敲敲精選官方偶像周邊、應援手燈、小卡、服飾與日常選物，提供官方正品、安心包裝與快速出貨。";

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const canonical = `${protocol}://${host}`;
  const image = `${protocol}://${host}/og.png`;

  return {
    metadataBase: new URL(canonical),
    title: {
      default: "敲敲韓國代購",
      template: "%s｜敲敲",
    },
    description: siteDescription,
    applicationName: siteName,
    keywords: ["偶像周邊", "官方周邊", "偶像小卡", "應援手燈", "追星周邊", "壓克力立牌", "偶像商品", "敲敲"],
    authors: [{ name: "敲敲", url: canonical }],
    creator: "敲敲",
    publisher: "敲敲",
    category: "購物",
    alternates: { canonical, languages: { "zh-Hant-TW": canonical } },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: "敲敲韓國代購",
      description: siteDescription,
      type: "website",
      url: canonical,
      siteName,
      locale: "zh_TW",
      images: [{ url: image, width: 1792, height: 936, alt: "敲敲韓國代購" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "敲敲韓國代購",
      description: siteDescription,
      images: [image],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body className="min-h-screen bg-paper text-ink antialiased">{children}</body></html>;
}
