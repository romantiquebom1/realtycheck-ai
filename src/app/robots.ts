import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // API 경로는 크롤링에서 제외
    },
    sitemap: 'https://realtycheck-ai.vercel.app/sitemap.xml', // 추후 실제 도메인으로 변경 필요
  };
}
