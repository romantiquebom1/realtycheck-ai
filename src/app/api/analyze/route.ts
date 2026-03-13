import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import PDFParser from "pdf2json";

export const dynamic = "force-dynamic";

export type AnalyzeResult = {
  documentDate: string;
  propertyAddress: string;
  riskLevel: "상" | "중" | "하";
  issues: {
    type: "error" | "warning" | "safe";
    section: "갑구" | "을구";
    title: string;
    description: string;
    matchedText: string;
    details: string[];
  }[];
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "업로드된 파일이 없습니다." }, { status: 400 });
    }

    // Convert file to buffer for pdf2json
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using pdf2json
    let text = await new Promise<string>((resolve, reject) => {
      // @ts-ignore
      const pdfParser = new PDFParser(null, 1); // 1 = text parsing only
      
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || errData));
      pdfParser.on("pdfParser_dataReady", () => {
        // @ts-ignore
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.parseBuffer(buffer);
    });

    // --- [전처리] 등기부 하단 안내 문구 및 노이즈 제거 ---
    // 열람일시(기준일)는 중요하므로 먼저 추출한 뒤 노이즈 제거 진행
    let extractedDate = "";
    const dateMatch = text.match(/열람일시\s*:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (dateMatch) {
      extractedDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }

    const noisePatterns = [
      /기록사항 없는 갑구, 을구는 '기록사항 없음'으로 표시함/g,
      /실선으로 그어진 부분은 말소사항을 표시함/g,
      /증명서는 컬러 또는 흑백으로 출력 가능함/g,
      /본 등기사항증명서는 열람용이므로 출력하신 등기사항증명서는 법적인 효력이 없습니다/g,
      /열람일시\s*:\s*\d{4}년\d{2}월\d{2}일\s*\d{2}시\d{2}분\d{2}초/g, // 시간까지 포함하여 제거
      /--- 이 하 여 백 ---/g,
      /관할등기소\s+.*등기국/g
    ];

    noisePatterns.forEach(pattern => {
      text = text.replace(pattern, "");
    });
    // --------------------------------------------------

    // Validate document type - must be a 등기사항전부증명서
    if (!text.includes('등기사항전부증명서') && !text.includes('등 기 사 항 전 부 증 명 서')) {
      return NextResponse.json({ 
        success: false, 
        error: "INVALID_DOCUMENT",
        message: "등기부등본(등기사항전부증명서)이 아닌 문서입니다. 등기부등본을 첨부해 주세요!" 
      }, { status: 400 });
    }

    // DEMO 모드: OPENAI_API_KEY가 없으면 더미 응답을 반환
    if (!process.env.OPENAI_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return NextResponse.json({
        success: true,
        data: {
          documentDate: new Date().toISOString().split('T')[0],
          propertyAddress: "⚠️ [샘플 모드] API 키 설정이 필요합니다",
          riskLevel: "중",
          issues: [
            { 
              type: "error", 
              section: "중요 안내",
              title: "현재 샘플 모드(데모)로 작동 중입니다", 
              description: "클라우드플레어 설정에 **OPENAI_API_KEY**가 아직 반영되지 않았습니다. 현재 보시는 분석 결과는 실제 입력하신 문서의 내용이 아닌, 시스템 작동 확인용 **가짜 데이터**입니다.\n\n[해결 방법]\n1. 클라우드플레어 Settings > Environment variables > Production 에 키를 넣었는지 확인하세요.\n2. 키를 넣은 후 반드시 'Deployments' 탭에서 **재배포(Retry deployment)**를 해야 실제 분석이 시작됩니다.", 
              matchedText: "API_KEY_MISSING", 
              details: ["클라우드플레어 대시보드에서 설정을 확인해 주세요."] 
            }
          ]
        }
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
너는 한국 부동산 법률 전문가야. 
다음 등기부등본(및 변환된 텍스트)에서 **현재 유효한(살아있는) 권리**만을 분석해줘. 

참고: 이 등기부의 **발급(열람) 일시는 ${extractedDate || '문서 내 기재된 날짜'}**야. 
가급적 이 날짜를 기준으로 문서가 얼마나 최신인지 판단하고, 응답의 documentDate에도 이 날짜를 우선적으로 사용해줘.

### ⚠️ 중요: 오인식 및 환각 방지 규칙
1. **안내 문구 무시**: 문서 하단에 별표(*)와 함께 적힌 "기록사항 없는 갑구, 을구는 '기록사항 없음'으로 표시함", "법적 효력이 없습니다", "열람일시: ..." 등 모든 **안내/설명 문구는 분석에서 완전히 제외**해.
2. **실제 항목 검증**: "가등기", "근저당권", "가압류" 등의 키워드가 본문의 **'순위번호'가 있는 표 안에 실제 항목**으로 존재할 때만 리포트에 포함해. 안내 문구에 포함된 단어를 실제 권리로 착각해서 보고하지 마. (환각 방지)
3. **가등기 주의**: '가등기' 항목이 실제로 존재하지 않는데 리포트에 넣지 않도록 각별히 주의해.

### 위험 요소 해설 규칙
위험 요소를 해설할 때는 반드시 다음의 규칙을 엄격하게 지켜서 '전문적이고 실무적인 법적 해설'을 생성해.
각 해설(description)의 마지막에는 반드시 줄바꿈 2번(\\n\\n)을 한 뒤, 다음 두 가지 상황별 조언을 각각 1~2줄로 요약해서 추가해줘:
[임차인인 경우] 관련 조언 내용
[매수자인 경우] 관련 조언 내용

- '가등기' 발견 시: 위험도 '상'. 해설: "추후 가등기권자가 본등기를 경료하면 물권변동의 효력이 발생하여 매수인은 즉시 소유권을 상실하게 됩니다. 가등기에 기한 본등기 실행으로 소유권을 잃게 될 경우, 매수인은 해당 가등기의 존재를 알고 있었더라도(악의) 매도인에게 계약 해제 및 손해배상을 청구할 수 있으나 분쟁의 위험이 매우 큽니다. (단, 채권담보 목적의 가등기라면 경매 실행 시 소멸합니다)."
- '근저당권' 발견 시: 위험도 '중'. (또는 금액이 너무 크면 '상'). 해설: "부동산을 담보로 한 대출이 존재합니다. 표기된 '채권최고액'은 책임의 한도가 아닌 담보권자가 우선변제받을 수 있는 최고 한도액이며, 지연이자는 1년분에 한정하지 않고 최고액에 포함되는 이상 모두 담보됩니다. 매수인은 제3취득자로서 실제 빚이 더 많더라도 이 '최고액'까지만 변제하면 근저당권 말소를 청구할 수 있습니다. 안전한 거래를 위해 매매대금(잔금) 지급과 근저당권 말소는 반드시 '동시이행'으로 진행해야 합니다."
- '가압류' 또는 '압류' 또는 '경매개시결정' 발견 시: 위험도 '상'. 해설: "소유자의 채무 문제로 권리 처분이 제한된 상태입니다. 가압류가 걸린 상태로 매수하더라도 추후 본안 소송에 따라 강제경매가 진행되면 소유권을 잃을 수 있습니다. 만약 경매로 소유권을 상실하게 되면 매수인은 선악을 불문하고 계약 해제 및 손해배상 청구가 가능합니다. 매도인의 가압류등기말소 의무는 매수인의 대금지급 의무와 법적으로 '동시이행관계'에 있으므로, 잔금 지급 시 법무사를 통해 즉각적인 말소 처리가 확인되어야 합니다."
- '전세권' 또는 '지상권' (용익물권) 발견 시: 위험도 '중'. 해설: "매수하더라도 해당 권리자가 계약 기간 동안 목적물을 점유하고 사용할 권리가 우선하므로 매수인의 즉시 사용이 불가능할 수 있습니다. 주의할 점은, 매수인이 이러한 제한물권(지상권 등)이 설정되어 있음을 알고 계약한 경우(악의), 추후 목적 달성이 불가능해져도 매도인에게 담보책임을 물어 계약 해제할 수 없다는 것입니다. 최선순위 전세권은 추후 해당 물건이 경매로 넘어가더라도 전세권자가 배당요구를 하지 않는 한 소멸하지 않고 인수됩니다."

### 추가 지시사항:
1. 문서 최상단의 표제부를 읽고 대상 부동산의 정확한 **물건지 주소(propertyAddress)**를 추출해줘.
2. 각 문제되는 권리(issue)마다 그와 관련된 구체적인 팩트(예: "채권자: 국민은행", "채권최고액: 1억 2천만 원", "설정일자: 2023.01.01")를 1~3개 정도 뽑아서 **details** 배열에 문자열로 넣어줘. (safe 타입은 빈 배열 가능)
3. 전체 문서를 **'갑구(소유권에 관한 사항)'**와 **'을구(소유권 이외의 권리에 관한 사항)'**로 나누어 평가해줘. 각 section(갑구, 을구)마다 최소 1개 이상의 issue 객체를 생성해야 해. **단, 해당 구에 실제 등기 기록이 하나도 없다면 'safe' 타입으로 하나만 생성해.**
4. 만약 '갑구'나 '을구' 중 한 영역에 아무런 제한물권이나 위험 요소가 없다면, \`type: "safe"\`, \`title: "[해당구]: 특이사항 없음"\`, \`description: "\` 깨끗하다는 설명 \`"\` 형태의 완료 카드를 반드시 하나 만들어줘.

분석할 텍스트:
${text.substring(0, 10000)}

반드시 다음 JSON 배열 형식으로만 응답해줘. (마크다운 백틱 제외)
{
  "documentDate": "YYYY-MM-DD",
  "propertyAddress": "정확한 물건지 주소 (예: 서울특별시 강남구 테헤란로 123, 101동 202호)",
  "riskLevel": "상" | "중" | "하",
  "issues": [
    { 
      "type": "error" | "warning" | "safe", 
      "section": "갑구" | "을구",
      title: "string (ex. 근저당권 설정 확인)",
      description: "string (상세하고친절한 법적 조언 및 가이드)",
      matchedText: "string (문서에서 발견한 원본 텍스트 매칭용. ex. '근저당권설정'. 띄어쓰기 없이 정확히)",
      "details": ["채권자: 국민은행", "채권최고액: 1억 2천만 원"]
    }
  ]
}
`;

    // o3-preview 또는 o1 모델을 사용하여 추론
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // o1-mini 접근 권한이 없을 경우를 대비하여 우선 gpt-4o로 변경
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const reply = response.choices[0].message.content || "{}";
    
    // 모델이 마크다운(```json ... ```)으로 묶어서 줬을 경우 정리
    const jsonStr = reply.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "분석 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
