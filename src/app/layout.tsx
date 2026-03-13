import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RealtyCheck AI - 등기부등본 AI 권리분석",
  description: "계약 전 딱 10초, 등기부등본을 AI로 분석하여 전세사기, 깡통전세 등 숨겨진 권리관계 위험요소를 즉시 확인하세요.",
  keywords: ["등기부등본", "AI권리분석", "전세사기", "깡통전세", "부동산", "권리분석", "부동산계약"],
  authors: [{ name: "RealtyCheck" }],
  openGraph: {
    title: "RealtyCheck AI - 10초 만에 끝나는 등기부등본 분석",
    description: "어려운 등기부등본, AI가 핵심 위험만 콕 짚어 알려드립니다. 전세사기 예방 필수 서비스.",
    url: "https://realtycheck.mmfinsights.com",
    siteName: "RealtyCheck AI",
    images: [
      {
        url: "/og-image.png", // 추후 public/og-image.png 디자인 추가 필요
        width: 1200,
        height: 630,
        alt: "RealtyCheck AI 로고 및 서비스 소개",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RealtyCheck AI - 10초 만에 끝나는 등기부등본 분석",
    description: "어려운 등기부등본, AI가 핵심 위험만 콕 짚어 알려드립니다. 전세사기 예방 필수 서비스.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <head>
        {publisherId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body
        className="antialiased bg-black"
        style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif", backgroundColor: 'black' }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

