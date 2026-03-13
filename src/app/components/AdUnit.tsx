"use client";

import { useEffect } from "react";

interface AdUnitProps {
  client?: string;
  slot: string;
  format?: string;
  responsive?: string;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function AdUnit({
  client = "ca-pub-3856566045996766",
  slot,
  format = "auto",
  responsive = "true",
  className = "",
  style = { display: "block" },
}: AdUnitProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`} style={{ minHeight: '100px', overflow: 'hidden' }}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      ></ins>
    </div>
  );
}
