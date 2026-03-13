import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://realtycheck.mmfinsights.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // 추후 '건축물대장 교차검증' 등 새로운 페이지 추가 시 배열에 객체 추가
  ];
}
