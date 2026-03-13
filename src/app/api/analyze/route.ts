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
    const text = await new Promise<string>((resolve, reject) => {
      // @ts-ignore
      const pdfParser = new PDFParser(null, 1); // 1 = text parsing only
      
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || errData));
      pdfParser.on("pdfParser_dataReady", () => {
        // @ts-ignore
        resolve(pdfParser.getRawTextContent());
      });

      pdfParser.parseBuffer(buffer);
    });

    // Validate document type - must be a 등기사항전부증명서
    if (!text.includes('등기사항전부증명서') && !text.includes('등 기 사 항 전 부 증 명 서')) {
      return NextResponse.json({ 
        success: false, 
        error: "INVALID_DOCUMENT",
        message: "등기부등본(등기사항전부증명서)이 아닌 문서입니다. 등기부등본을 첨부해 주세요!" 
      }, { status: 400 });
    }

    // DEMO 모드: OPENAI_API_KEY가 없으면 더미 응답을 반환 (Vercel 배포 시 시연용)
    if (!process.env.OPENAI_API_KEY) {
      // 인위적 지연 시간 (추론 중 로딩 애니메이션 시연)
      await new Promise((resolve) => setTimeout(resolve, 3500));
      return NextResponse.json({
        success: true,
        data: {
          documentDate: "2024-03-12",
          propertyAddress: "서울특별시 강남구 테헤란로 123, 101동 202호",
          riskLevel: "상",
          issues: [
            { 
              type: "error", 
              section: "갑구",
              title: "가등기 설정 확인", 
              description: "이 집은 주인이 바뀔 수 있는 위험한 등기가 걸려있어요. 보증금을 지키기 어려울 수 있습니다. 추후 가등기권자가 본등기를 경료하면 물권변동의 효력이 발생하여 소유권을 상실하게 됩니다. 특별한 주의가 필요합니다.\n\n[임차인인 경우] 본등기가 실행되면 기존 임대차 계약이 대항력을 잃을 가능성이 크므로, 가급적 이 집은 피하는 것이 좋습니다.\n[매수자인 경우] 매도인과 협의하여 잔금 지급 시 가등기를 확실하게 말소하는 조건으로만 계약해야 합니다.", 
              matchedText: "소유권이전청구권가등기", 
              details: ["채권자: 김아무개", "설정일: 2023-01-01"] 
            },
            { 
              type: "warning", 
              section: "을구",
              title: "근저당권 설정 확인", 
              description: "집주인이 집을 담보로 은행에서 돈을 빌린 내역이 있습니다. 잔금 치르실 때 갚는 조건인지 꼭 확인하세요. 지연이자는 1년분에 한정하지 않고 최고액에 포함되는 이상 모두 담보됩니다. 동시이행이 필요합니다.\n\n[임차인인 경우] 선순위 근저당권 때문에 경매 넙어갈 시 보증금을 전액 보호받지 못할 수 있습니다. 잔금일 전액 상환/말소 조건을 특약에 넣으세요.\n[매수자인 경우] 매매잔금으로 은행 빚을 갚고 근저당권을 말소하는 법무사 동시이행 절차를 밟아야 안전합니다.",
              matchedText: "근저당권설정", 
              details: ["채권자: 국민은행", "채권최고액: 1억 2천만 원"] 
            },
            { 
              type: "safe", 
              section: "갑구",
              title: "가압류 내역 없음", 
              description: "갑구에 가압류, 가처분 등 복잡한 소유권 제한 내역이 발견되지 않아 비교적 깔끔한 상태입니다. 일반적인 소유권 이전 절차대로 진행 가능합니다.",
              matchedText: "", 
              details: [] 
            },
            { 
              type: "safe", 
              section: "을구",
              title: "을구 특이사항 없음", 
              description: "을구에 근저당권이나 전세권 등 소유권 이외의 권리 관계가 없습니다. 빚이 없는 깨끗한 부동산입니다.",
              matchedText: "", 
              details: [] 
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
다음 등기부등본(및 변환된 텍스트)에서 실효된 권리는 제외하고, 현재 살아있는 위험 권리를 모두 찾아내서 위험도를 상/중/하로 분류해줘.

위험 요소를 해설할 때는 반드시 다음의 규칙을 엄격하게 지켜서 '전문적이고 실무적인 법적 해설'을 생성해.
그리고 각 해설(description)의 마지막에는 반드시 줄바꿈 2번(\\n\\n)을 한 뒤, 다음 두 가지 상황별 조언을 각각 1~2줄로 요약해서 추가해줘:
[임차인인 경우] 관련 조언 내용
[매수자인 경우] 관련 조언 내용

- '가등기' 발견 시: 위험도 '상'. 해설: "추후 가등기권자가 본등기를 경료하면 물권변동의 효력이 발생하여 매수인은 즉시 소유권을 상실하게 됩니다. 가등기에 기한 본등기 실행으로 소유권을 잃게 될 경우, 매수인은 해당 가등기의 존재를 알고 있었더라도(악의) 매도인에게 계약 해제 및 손해배상을 청구할 수 있으나 분쟁의 위험이 매우 큽니다. (단, 채권담보 목적의 가등기라면 경매 실행 시 소멸합니다)."
- '근저당권' 발견 시: 위험도 '중'. (또는 금액이 너무 크면 '상'). 해설: "부동산을 담보로 한 대출이 존재합니다. 표기된 '채권최고액'은 책임의 한도가 아닌 담보권자가 우선변제받을 수 있는 최고 한도액이며, 지연이자는 1년분에 한정하지 않고 최고액에 포함되는 이상 모두 담보됩니다. 매수인은 제3취득자로서 실제 빚이 더 많더라도 이 '최고액'까지만 변제하면 근저당권 말소를 청구할 수 있습니다. 안전한 거래를 위해 매매대금(잔금) 지급과 근저당권 말소는 반드시 '동시이행'으로 진행해야 합니다."
- '가압류' 또는 '압류' 또는 '경매개시결정' 발견 시: 위험도 '상'. 해설: "소유자의 채무 문제로 권리 처분이 제한된 상태입니다. 가압류가 걸린 상태로 매수하더라도 추후 본안 소송에 따라 강제경매가 진행되면 소유권을 잃을 수 있습니다. 만약 경매로 소유권을 상실하게 되면 매수인은 선악을 불문하고 계약 해제 및 손해배상 청구가 가능합니다. 매도인의 가압류등기말소 의무는 매수인의 대금지급 의무와 법적으로 '동시이행관계'에 있으므로, 잔금 지급 시 법무사를 통해 즉각적인 말소 처리가 확인되어야 합니다."
- '전세권' 또는 '지상권' (용익물권) 발견 시: 위험도 '중'. 해설: "매수하더라도 해당 권리자가 계약 기간 동안 목적물을 점유하고 사용할 권리가 우선하므로 매수인의 즉시 사용이 불가능할 수 있습니다. 주의할 점은, 매수인이 이러한 제한물권(지상권 등)이 설정되어 있음을 알고 계약한 경우(악의), 추후 목적 달성이 불가능해져도 매도인에게 담보책임을 물어 계약 해제할 수 없다는 것입니다. 최선순위 전세권은 추후 해당 물건이 경매로 넘어가더라도 전세권자가 배당요구를 하지 않는 한 소멸하지 않고 인수됩니다."

추가 지시사항:
1. 문서 최상단의 표제부를 읽고 대상 부동산의 정확한 **물건지 주소(propertyAddress)**를 추출해줘.
2. 각 문제되는 권리(issue)마다 그와 관련된 구체적인 팩트(예: "채권자: 국민은행", "채권최고액: 1억 2천만 원", "설정일자: 2023.01.01")를 1~3개 정도 뽑아서 **details** 배열에 문자열로 넣어줘. (safe 타입은 빈 배열 가능)
3. 전체 문서를 **'갑구(소유권에 관한 사항)'**와 **'을구(소유권 이외의 권리에 관한 사항)'**로 나누어 평가해줘. 각 section(갑구, 을구)마다 최소 1개 이상의 issue 객체를 생성해야 해.
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
      description: "string (상세하고 친절한 법적 조언 및 가이드)",
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
