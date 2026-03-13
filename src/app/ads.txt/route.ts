import { NextResponse } from 'next/server';

export async function GET() {
  // 게시자 ID는 환경 변수에서 가져와 깃허브에는 노출되지 않게 합니다.
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || 'pub-0000000000000000';
  const content = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
