"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, AlertTriangle, CheckCircle, AlertCircle, Share2, ThumbsUp, ThumbsDown, Calendar, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import InteractiveBackground from "./components/InteractiveBackground";

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Issue = {
  type: "error" | "warning" | "safe";
  section: "갑구" | "을구";
  title: string;
  description?: string;
  matchedText?: string;
  details?: string[];
};

type AnalyzeResult = {
  documentDate?: string;
  propertyAddress?: string;
  riskLevel: "상" | "중" | "하";
  issues: Issue[];
};

export default function Home() {
  const [step, setStep] = useState<"idle" | "analyzing" | "result">("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activeIssueIndex, setActiveIssueIndex] = useState<number | null>(null);
  const [flashingCardIndex, setFlashingCardIndex] = useState<number | null>(null);
  const [pdfWidthPercent, setPdfWidthPercent] = useState<number>(60);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isDragging = useRef(false);

  // Refs for scrolling
  const issueRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
      startAnalysis(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setFileUrl(URL.createObjectURL(droppedFile));
        startAnalysis(droppedFile);
      } else {
        alert("PDF 파일만 업로드 가능합니다.");
      }
    }
  };

  const startAnalysis = async (selectedFile: File) => {
    setStep("analyzing");
    setFeedback(null);
    let handled = false;
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        // Simulate a page transition for better AdSense interstitial triggering
        window.history.pushState({ step: "result" }, "", "#report");
        setStep("result");
      } else if (data.error === "INVALID_DOCUMENT") {
        handled = true;
        setResult(null);
        setStep("idle");
        setFile(null);
        setFileUrl(null);
        // Show styled modal for invalid document
        const modal = document.createElement('div');
        modal.innerHTML = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999"><div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:32px;max-width:400px;text-align:center;color:white;box-shadow:0 25px 50px rgba(0,0,0,0.5)"><div style="font-size:48px;margin-bottom:12px">⚠️</div><h3 style="font-size:18px;font-weight:700;margin-bottom:8px">등기부등본이 아닙니다</h3><p style="font-size:14px;color:#999;margin-bottom:24px">등기사항전부증명서 PDF를 첨부해 주세요!</p><button id="invalid-doc-modal-btn" style="background:#3b82f6;color:white;border:none;padding:10px 32px;border-radius:999px;font-weight:700;cursor:pointer;font-size:14px">확인</button></div></div>';
        document.body.appendChild(modal);
        document.getElementById('invalid-doc-modal-btn')?.addEventListener('click', () => modal.remove());
      } else {
        alert(data.message || data.error || "분석에 실패했습니다.");
        setResult(null);
        setStep("idle");
        setFile(null);
        setFileUrl(null);
      }
    } catch (error) {
      console.error(error);
      alert("서버 오류가 발생했습니다.");
      setResult(null);
      setStep("idle");
      setFile(null);
      setFileUrl(null);
    }
  };

  const handleDemoClick = () => {
    setStep("analyzing");
    setIsDemoMode(true);
    
    setTimeout(() => {
      setResult({
        documentDate: "2024-03-12",
        propertyAddress: "서울특별시 강남구 테헤란로 123, 101동 202호 (샘플 문서)",
        riskLevel: "상",
        issues: [
          { 
            type: "error", 
            section: "갑구",
            title: "가등기 설정 확인", 
            description: "이 집은 주인이 바뀔 수 있는 위험한 등기가 걸려있어요. 보증금을 지키기 어려울 수 있습니다. 추후 가등기권자가 본등기를 경료하면 물권변동의 효력이 발생하여 소유권을 상실하게 됩니다. 특별한 주의가 필요합니다.", 
            matchedText: "소유권이전청구권가등기", 
            details: ["채권자: 김아무개", "설정일: 2023-01-01"] 
          },
          { 
            type: "warning", 
            section: "을구",
            title: "근저당권 설정 확인", 
            description: "집주인이 집을 담보로 은행에서 돈을 빌린 내역이 있습니다. 잔금 치르실 때 갚는 조건인지 꼭 확인하세요. 지연이자는 1년분에 한정하지 않고 최고액에 포함되는 이상 모두 담보됩니다. 동시이행이 필요합니다.",
            matchedText: "근저당권설정", 
            details: ["채권자: 국민은행", "채권최고액: 1억 2천만 원"] 
          }
        ]
      });
      setStep("result");
    }, 2500);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidthPercent = (e.clientX / window.innerWidth) * 100;
      // Restrict width between 30% and 80%
      if (newWidthPercent > 30 && newWidthPercent < 80) {
        setPdfWidthPercent(newWidthPercent);
      }
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // State to hold the text items from PDF to calculate highlights
  const [pageTextItems, setPageTextItems] = useState<{ [pageIndex: number]: any[] }>({});

  const onPageLoadSuccess = async (page: any, pageIndex: number) => {
    try {
      const textContent = await page.getTextContent();
      setPageTextItems((prev) => ({ ...prev, [pageIndex]: textContent.items }));
    } catch (e) {
      console.error("Error loading text content:", e);
    }
  };

  // Calculate box coordinates for highlights based on active results
  const renderHighlights = (pageIndex: number, originalWidth: number = 800) => {
    if (!result || !result.issues || !pageTextItems[pageIndex]) return null;
    const items = pageTextItems[pageIndex];
    if (!items || items.length === 0) return null;

    // We assume standard page width to calculate percentage based positioning. 
    // PDF coordinates typically assume a standard space (e.g., 595x842 roughly for A4), 
    // but the items transform matrix provides absolute positions.
    const viewport = items.length > 0 ? items[0].transform : null;
    
    // A simplified heuristic: We search the string items for the matchedText.
    const highlights: React.ReactNode[] = [];
    const usedItemIndices = new Set<string>(); // Tracker for used items: "pageIndex-itemIndex"
    
    result.issues.forEach((issue, issueIdx) => {
      if (issue.type === 'safe' && issue.section === '갑구') {
        // For safe 갑구 issues, find the LAST 소유권이전 across ALL pages, only highlight on that page
        let lastPageWithMatch = -1;
        for (const pIdx of Object.keys(pageTextItems)) {
          const pItems = pageTextItems[Number(pIdx)];
          if (pItems && pItems.some((it: any) => it.str && it.str.includes('소유권이전'))) {
            lastPageWithMatch = Math.max(lastPageWithMatch, Number(pIdx));
          }
        }
        // Only render highlight on the last page that has 소유권이전
        if (lastPageWithMatch !== pageIndex) return;
        
        let lastMatchIdx = -1;
        for (let i = 0; i < items.length; i++) {
          if (items[i].str && items[i].str.includes('소유권이전')) {
            lastMatchIdx = i;
          }
        }
        if (lastMatchIdx >= 0) {
          const item = items[lastMatchIdx];
          const pageW = 595.28;
          const pageH = 841.89;
          const x = item.transform[4];
          const y = item.transform[5];
          const width = item.width || (item.str.length * 10);
          const height = item.height || 14;
          const topPercent = ((pageH - y - height) / pageH) * 100;
          const leftPercent = (x / pageW) * 100;
          const widthPercent = (width / pageW) * 100;
          const heightPercent = ((height + 4) / pageH) * 100;
          const isActive = activeIssueIndex === issueIdx;
          highlights.push(
            <div
              key={`hl-safe-gap-${pageIndex}-${issueIdx}`}
              id={`pdf-mark-${issueIdx}`}
              className={`absolute cursor-pointer mix-blend-multiply transition-all duration-300 rounded ${
                isActive ? 'ring-4 ring-blue-500 scale-110 z-20' : 'z-10 hover:opacity-80'
              } bg-emerald-400/50`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent + 2}%`,
                height: `${heightPercent}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIssueIndex(issueIdx);
              }}
            />
          );
        }
        return;
      }
      if (issue.type === 'safe' && issue.section === '을구') {
        // For safe 을구 issues, find '기록사항 없음' text and highlight it green
        let matchIdx = -1;
        for (let i = 0; i < items.length; i++) {
          if (items[i].str && items[i].str.includes('기록사항')) {
            matchIdx = i;
            break;
          }
        }
        if (matchIdx >= 0) {
          const item = items[matchIdx];
          const pageW = 595.28;
          const pageH = 841.89;
          const x = item.transform[4];
          const y = item.transform[5];
          const width = item.width || (item.str.length * 10);
          const height = item.height || 14;
          const topPercent = ((pageH - y - height) / pageH) * 100;
          const leftPercent = (x / pageW) * 100;
          const widthPercent = (width / pageW) * 100;
          const heightPercent = ((height + 4) / pageH) * 100;
          const isActive = activeIssueIndex === issueIdx;
          highlights.push(
            <div
              key={`hl-safe-eul-${pageIndex}-${issueIdx}`}
              id={`pdf-mark-${issueIdx}`}
              className={`absolute cursor-pointer mix-blend-multiply transition-all duration-300 rounded ${
                isActive ? 'ring-4 ring-blue-500 scale-110 z-20' : 'z-10 hover:opacity-80'
              } bg-emerald-400/50`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent + 2}%`,
                height: `${heightPercent}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIssueIndex(issueIdx);
              }}
            />
          );
        }
        return;
      }
      if (!issue.matchedText || !issue.matchedText.trim()) return;
      const targetText = issue.matchedText.trim();
      
      // Look through items for partial or full match
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const uniqueItemKey = `${pageIndex}-${i}`;
        
        if (!usedItemIndices.has(uniqueItemKey) && item.str && item.str.includes(targetText)) {
          // Found a match in this text item block.
          usedItemIndices.add(uniqueItemKey); // Mark as used so identical issues match later occurrences
          
          // PDF.js transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
          // The coordinates are from bottom-left natively, but react-pdf scales and flips them usually.
          // For a robust universal overlay without deep coordinate mapping, 
          // we use a rough percentage approximation or just standard mapping.
          
          // Let's use a simpler approach: a full CSS styled div over the text item.
          // PDF width is usually ~595pts. We'll use relative percentages.
          const pageW = 595.28; // Standard A4 width pt
          const pageH = 841.89; // Standard A4 height pt
          
          const x = item.transform[4];
          const y = item.transform[5];
          const width = item.width || (item.str.length * 10); // fallback
          const height = item.height || 14; 

          // PDF native Y is from bottom. We need Y from top for CSS.
          const topPercent = ((pageH - y - height) / pageH) * 100;
          const leftPercent = (x / pageW) * 100;
          const widthPercent = (width / pageW) * 100;
          const heightPercent = ((height + 4) / pageH) * 100;

          const isError = issue.type === "error";
          const isWarning = issue.type === "warning";
          const isActive = activeIssueIndex === issueIdx;

          // Push the highlight box
          highlights.push(
            <div
              key={`hl-${pageIndex}-${issueIdx}-${i}`}
              id={`pdf-mark-${issueIdx}`}
              className={`absolute cursor-pointer mix-blend-multiply transition-all duration-300 rounded ${
                isActive ? 'ring-4 ring-blue-500 scale-110 z-20' : 'z-10 hover:opacity-80'
              } ${
                isError ? 'bg-red-400/50' : 
                isWarning ? 'bg-yellow-400/50' : 
                'bg-emerald-400/50'
              }`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent + 2}%`, // Add a little padding
                height: `${heightPercent}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIssueIndex(issueIdx);
              }}
            />
          );
          
          break; // Stop after first highlight per issue on this page to prevent clutter
        }
      }
    });

    return highlights;
  };

  const riskColor = 
    result?.riskLevel === "상" ? "text-red-700 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900" :
    result?.riskLevel === "중" ? "text-orange-700 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900" :
    "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900";

  return (
    <div className="h-screen overflow-hidden bg-transparent text-neutral-900 dark:text-neutral-100 font-sans flex flex-col relative">
      <InteractiveBackground />
      <header className="border-b border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-black/70 backdrop-blur-md h-16 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setStep("idle"); setFile(null); setFileUrl(null); setIsDemoMode(false); }}>
          <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center shadow-sm rounded-md shrink-0">
            <span className="text-white dark:text-black font-bold text-lg leading-none">R</span>
          </div>
          <span className="font-semibold text-lg tracking-tight hidden sm:flex items-center gap-1.5 leading-none">
            RealtyCheck AI
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold leading-none">V2</span>
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-sm font-black text-emerald-500 dark:text-emerald-400 leading-none"
            >
              Free ✨
            </motion.span>
          </span>
        </div>

        {/* 중앙 AI 상태 뱃지 */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold tracking-tight border border-emerald-200 dark:border-emerald-800/50 shadow-xs flex items-center gap-1.5 whitespace-nowrap overflow-hidden max-w-xs transition-all animate-in fade-in zoom-in duration-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]"></span>
            </span>
            <span className="truncate">AI 추론형 권리 분석 엔진 가동 중</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {step === "result" && result && (
            <button 
              onClick={() => { setStep("idle"); setFile(null); setFileUrl(null); setResult(null); setIsDemoMode(false); }}
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[15px] font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 border border-blue-400/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
              다시 시작
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full h-[calc(100vh-64px)] overflow-hidden relative">
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full flex flex-col items-center justify-center p-6 bg-transparent relative"
            >
              <div className="max-w-2xl w-full flex flex-col items-center z-10">
                <div className="flex flex-col items-center justify-center gap-1 md:gap-1.5 mb-10 w-full">
                  <div className="relative inline-flex flex-col items-center">
                    <div className="text-lg md:text-2xl font-bold tracking-tight text-neutral-700 dark:text-neutral-200 text-center uppercase mb-0.5">
                      계약 전 딱 10초, 무료 등기 분석
                    </div>
                  </div>
                  <h1 className="text-[2.5rem] md:text-[4.8rem] font-black tracking-tighter text-center leading-[1] md:leading-[1] w-full">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 drop-shadow-sm">AI 권리분석 리포트</span>
                  </h1>
                </div>
                <p className="text-lg text-neutral-500 dark:text-neutral-400 text-center mb-10 max-w-xl leading-relaxed">
                  전세사기·깡통전세·숨겨진 권리관계 —<br/>
                  원본 문서 그대로, AI가 10초 만에 <b className="text-neutral-800 dark:text-neutral-200">핵심 위험만 콕 짚어</b> 알려드립니다.
                </p>

                <div className="w-full relative group">
                  <label 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl transition-all cursor-pointer overflow-hidden shadow-lg hover:shadow-xl backdrop-blur-sm group 
                      ${isDragOver 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 scale-[1.02]" 
                        : "border-neutral-300 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 hover:border-blue-400 dark:hover:border-blue-500"
                      }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                        <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="mb-2 text-base text-neutral-600 dark:text-neutral-300">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">여기를 클릭</span> 또는 파일을 드래그하여 업로드
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                        등기부등본 PDF (최대 10MB)
                      </p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                  </label>
                </div>
                
                {/* 인식 오류 방지 팁 툴팁 */}
                <div className="mt-6 relative flex flex-col items-center">
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-3 px-4 py-3 bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-700/50 rounded-2xl shadow-2xl z-30 w-72 pointer-events-none"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold text-white">인식 오류 방지 팁</span>
                        </div>
                        <p className="text-xs leading-relaxed text-neutral-300 break-keep">
                          인식 오류 시 등기부등본을 새로 다운로드하거나, 글자가 깨지지 않은 깨끗한 PDF 파일로 다시 시도해 주세요.
                        </p>
                        {/* 화살표 */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neutral-900 dark:bg-neutral-800 border-r border-b border-neutral-700/50 rotate-45"></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-help group/tip"
                  >
                    <Info className="w-3.5 h-3.5 group-hover/tip:rotate-12 transition-transform" />
                    인식 오류 방지 팁
                  </button>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleDemoClick}
                    className="px-6 py-3.5 rounded-full border-2 border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-800/30 hover:border-blue-500 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <FileText className="w-5 h-5" />
                    샘플 등기부등본으로 AI 분석 체험하기
                  </button>
                </div>



              </div>
            </motion.div>
          )}

          {step === "analyzing" && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-50 absolute inset-0"
            >
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 border-[4px] border-neutral-200 dark:border-neutral-800 rounded-full"></div>
                <div className="absolute inset-0 border-[4px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight text-center">AI가 문서를 정밀 분석 중입니다</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-sm text-center break-keep">등기 기록을 면밀히 분석하여 핵심 권리 관계의 좌표를 매핑하고 법률적 해설을 생성하고 있습니다.</p>
            </motion.div>
          )}

          {step === "result" && result && (fileUrl || isDemoMode) && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col md:flex-row overflow-hidden bg-neutral-100 dark:bg-neutral-900"
            >
              {/* Left Pane: PDF Viewer or Demo Image */}
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${pdfWidthPercent}%` }}
                className="h-[50vh] md:h-full bg-neutral-100/50 dark:bg-neutral-900/50 overflow-y-auto relative flex flex-col shadow-inner"
              >
                <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 flex items-center justify-between z-20 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-500" />
                    <span className="text-sm font-medium truncate max-w-[200px]">{isDemoMode ? '샘플_등기부등본.pdf' : file?.name}</span>
                  </div>
                  <div className="text-xs font-semibold text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded">
                    {isDemoMode ? '샘플 문서' : `총 ${numPages || 0}페이지`}
                  </div>
                </div>
                
                <div 
                  ref={pdfContainerRef}
                  className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center"
                >
                  {isDemoMode ? (
                    /* Demo Mode: HTML Mock Registry Document */
                    <div className="bg-white rounded shadow-lg border border-neutral-200 dark:border-neutral-700 w-full max-w-full p-6 md:p-10 text-black text-sm font-sans">
                      <h2 className="text-center text-lg font-bold mb-1 tracking-tight">등기사항전부증명서 (말소사항 포함)</h2>
                      <p className="text-right text-xs text-neutral-500 mb-6">고유번호 1101-2024-123456</p>

                      {/* 표제부 */}
                      <p className="font-bold text-xs mb-1">[표제부]</p>
                      <table className="w-full border-collapse border border-neutral-400 mb-6 text-xs">
                        <thead><tr className="bg-neutral-100">
                          <th className="border border-neutral-400 px-2 py-1.5">순위번호</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기접수</th>
                          <th className="border border-neutral-400 px-2 py-1.5">표시번호</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기목적/내용</th>
                        </tr></thead>
                        <tbody><tr>
                          <td className="border border-neutral-400 px-2 py-1.5 text-center"></td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-center">2010-01-01</td>
                          <td className="border border-neutral-400 px-2 py-1.5 text-center">1</td>
                          <td className="border border-neutral-400 px-2 py-2">서울특별시 강남구 테헤란로 123, 101동 202호</td>
                        </tr></tbody>
                      </table>

                      {/* 갑구 */}
                      <p id="demo-section-gap" className="font-bold text-xs mb-1">[갑구] (소유권에 관한 사항)</p>
                      <table className="w-full border-collapse border border-neutral-400 mb-6 text-xs">
                        <thead><tr className="bg-neutral-100">
                          <th className="border border-neutral-400 px-2 py-1.5">순위번호</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기목적</th>
                          <th className="border border-neutral-400 px-2 py-1.5">접수일</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기원인</th>
                          <th className="border border-neutral-400 px-2 py-1.5">권리자 및 기타사항</th>
                        </tr></thead>
                        <tbody>
                          <tr>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">1</td>
                            <td className="border border-neutral-400 px-2 py-1.5">소유권보존</td>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">2010-01-01</td>
                            <td className="border border-neutral-400 px-2 py-1.5">신축</td>
                            <td className="border border-neutral-400 px-2 py-1.5">소유자: 홍길동</td>
                          </tr>
                          <tr>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">2</td>
                            <td className="border border-neutral-400 px-2 py-1.5">
                              <span 
                                id="pdf-mark-0"
                                className={`inline-block px-1 py-0.5 rounded cursor-pointer transition-all duration-300 bg-red-400/50 ${activeIssueIndex === 0 ? 'ring-2 ring-blue-500' : 'hover:bg-red-400/70'}`}
                                onClick={() => setActiveIssueIndex(0)}
                              >소유권이전청구권가등기</span>
                            </td>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">2023-01-01</td>
                            <td className="border border-neutral-400 px-2 py-1.5">매매예약</td>
                            <td className="border border-neutral-400 px-2 py-1.5">권리자: 김아무개</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 을구 */}
                      <p id="demo-section-eul" className="font-bold text-xs mb-1">[을구] (소유권 이외의 권리에 관한 사항)</p>
                      <table className="w-full border-collapse border border-neutral-400 mb-4 text-xs">
                        <thead><tr className="bg-neutral-100">
                          <th className="border border-neutral-400 px-2 py-1.5">순위번호</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기목적</th>
                          <th className="border border-neutral-400 px-2 py-1.5">접수일</th>
                          <th className="border border-neutral-400 px-2 py-1.5">등기원인</th>
                          <th className="border border-neutral-400 px-2 py-1.5">권리자 및 기타사항</th>
                        </tr></thead>
                        <tbody>
                          <tr>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">1</td>
                            <td className="border border-neutral-400 px-2 py-1.5">
                              <span 
                                id="pdf-mark-1"
                                className={`inline-block px-1 py-0.5 rounded cursor-pointer transition-all duration-300 bg-yellow-400/50 ${activeIssueIndex === 1 ? 'ring-2 ring-blue-500' : 'hover:bg-yellow-400/70'}`}
                                onClick={() => setActiveIssueIndex(1)}
                              >근저당권설정</span>
                            </td>
                            <td className="border border-neutral-400 px-2 py-1.5 text-center">2023-05-05</td>
                            <td className="border border-neutral-400 px-2 py-1.5">설정계약</td>
                            <td className="border border-neutral-400 px-2 py-1.5">채권최고액: 1억 2천만 원<br/>채무자: 홍길동<br/>근저당권자: 국민은행</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Real Mode: PDF Viewer */
                    <Document
                      file={fileUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      className="flex flex-col gap-6 items-center w-full"
                      loading={
                        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mb-4"></div>
                          <span>리포트 시각화 렌더링 중...</span>
                        </div>
                      }
                    >
                      {Array.from(new Array(numPages), (el, index) => {
                        const pageWidth = typeof window !== 'undefined' ? (window.innerWidth < 768 ? window.innerWidth - 40 : (window.innerWidth * (pdfWidthPercent / 100)) - 80) : 800;
                        
                        return (
                          <div key={`page_${index + 1}`} className="shadow-lg rounded-sm overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white relative hover:shadow-xl transition-shadow w-full max-w-full flex justify-center">
                            <div className="absolute inset-0 z-10">
                              {renderHighlights(index + 1, pageWidth)}
                            </div>
                            
                            <Page 
                              pageNumber={index + 1} 
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              onLoadSuccess={(page) => onPageLoadSuccess(page, index + 1)}
                              className="max-w-full"
                              width={pageWidth}
                            />
                          </div>
                        );
                      })}
                    </Document>
                  )}
                </div>
              </div>

              {/* Resizer Handle */}
              <div 
                className="hidden md:flex w-1.5 cursor-col-resize bg-neutral-300 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-blue-500 transition-colors z-30 flex-col justify-center items-center group"
                onMouseDown={() => {
                  isDragging.current = true;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
              >
                <div className="h-8 w-1 bg-white/50 rounded-full group-hover:bg-white transition-colors"></div>
              </div>

              {/* Analysis Results Pane */}
              <div 
                style={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : `${100 - pdfWidthPercent}%` }}
                className="h-[50vh] md:h-full bg-white dark:bg-neutral-950 overflow-y-auto flex flex-col shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]"
              >
                <div className="p-6 md:p-8 flex-1 flex flex-col relative">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold tracking-tight">분석 리포트</h2>
                    <div className={"px-4 py-2 rounded-full text-base font-extrabold flex items-center gap-2 border-2 transition-all shadow-md " + riskColor}>
                      <AlertTriangle className="w-5 h-5" /> 위험도: {result.riskLevel}
                    </div>
                  </div>
                  
                  {/* Property Address & Date */}
                  <div className="mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                    {result.propertyAddress && (
                      <div className="flex gap-3 items-start">
                        <div className="mt-0.5 p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">대상 물건지</p>
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{result.propertyAddress}</p>
                        </div>
                      </div>
                    )}
                    
                    {result.documentDate && (
                      <div className="flex gap-3 items-start pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                        <div className="mt-0.5 p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">등기부 기준일</p>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-blue-800 dark:text-blue-300">{result.documentDate}</p>
                            {(() => {
                              try {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const docDate = new Date(result.documentDate);
                                docDate.setHours(0, 0, 0, 0);
                                const diffTime = today.getTime() - docDate.getTime();
                                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (isNaN(diffDays)) return null;
                                let badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
                                if (diffDays > 30) badgeColor = "bg-red-100 text-red-700 border-red-200";
                                else if (diffDays > 7) badgeColor = "bg-orange-100 text-orange-700 border-orange-200";
                                
                                return (
                                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${badgeColor}`}>
                                    {diffDays <= 0 ? "오늘 발급" : `${diffDays}일 경과`}
                                  </span>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                          {(() => {
                            try {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const docDate = new Date(result.documentDate);
                              docDate.setHours(0, 0, 0, 0);
                              const diffDays = Math.floor((today.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
                              if (diffDays > 30) {
                                return <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">⚠️ 발급일이 30일 이상 경과하였습니다. 정확한 분석을 위해 최신 등기부등본을 사용해 주세요.</p>;
                              }
                              return null;
                            } catch (e) { return null; }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Nav Summary */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">빠른 요약 ({result.issues.length}건)</h3>
                      <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 w-48 shadow-xl z-30">
                          <p className="font-bold mb-1.5">하이라이터 컬러 의미</p>
                          <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded bg-red-400/70 inline-block"></span> 매우 위험 (error)</div>
                          <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded bg-yellow-400/70 inline-block"></span> 주의 필요 (warning)</div>
                          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-400/70 inline-block"></span> 안전 (safe)</div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900"></div>
                        </div>
                      </div>
                    </div>
                    
                    {["갑구", "을구"].map(sectionName => {
                      const sectionIssues = result.issues.filter(i => i.section === sectionName);
                      if (sectionIssues.length === 0) return null;
                      
                      return (
                        <div key={`nav-group-${sectionName}`} className="mb-4 last:mb-0">
                          <h4 className="text-xs font-semibold text-neutral-400 mb-2 pl-1 border-l-2 border-neutral-300 dark:border-neutral-700">{sectionName} (소유권{sectionName === "을구" ? " 이외의 권리" : ""})</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.issues.map((issue, idx) => {
                              if (issue.section !== sectionName) return null;
                              
                              const isError = issue.type === "error";
                              const isWarning = issue.type === "warning";
                              const isActive = activeIssueIndex === idx;
                              
                              return (
                                <button
                                  key={`chip-${idx}`}
                                  onClick={() => {
                                    setActiveIssueIndex(idx);
                                    const targetMark = document.getElementById(`pdf-mark-${idx}`);
                                    if (targetMark) {
                                      targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      targetMark.classList.add('ring-2', 'ring-blue-500');
                                      setTimeout(() => targetMark.classList.remove('ring-2', 'ring-blue-500'), 1200);
                                    } else if (issue.type === 'safe' && pdfContainerRef.current) {
                                      // For safe issues, scroll to section header
                                      if (isDemoMode) {
                                        const sectionId = issue.section === '갑구' ? 'demo-section-gap' : 'demo-section-eul';
                                        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      } else {
                                        // For real PDF, search for section text in pageTextItems
                                        const sectionText = issue.section === '갑구' ? '갑' : '을';
                                        let found = false;
                                        for (const pageIdx of Object.keys(pageTextItems)) {
                                          const items = pageTextItems[Number(pageIdx)];
                                          for (let i = 0; i < items.length; i++) {
                                            if (items[i].str && items[i].str.includes(sectionText) && items[i].str.includes('구')) {
                                              // Found the section header, scroll to that page area
                                              const pageEl = document.querySelector(`[data-page-number="${pageIdx}"]`);
                                              if (pageEl) {
                                                pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                found = true;
                                              }
                                              break;
                                            }
                                          }
                                          if (found) break;
                                        }
                                        if (!found) {
                                          pdfContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                      }
                                    }
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                                    ${isActive ? 'ring-2 ring-offset-1 ring-neutral-400 dark:ring-neutral-600 scale-105' : 'hover:scale-105'}
                                    ${isError ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30' : 
                                      isWarning ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30' : 
                                      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30'}
                                  `}
                                >
                                  {isError ? <AlertCircle className="w-3.5 h-3.5" /> : isWarning ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                  {issue.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* AdSlot: In-Feed Ad - Completely invisible until loaded */}
                  <div id="adsense-infeed-slot" className="w-full"></div>

                  {/* Sticky Detail View */}
                  <div className="flex-1 relative">
                    <div className="sticky top-4">
                      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">상세 분석 내용</h3>
                      
                      {(() => {
                        const idx = activeIssueIndex !== null ? activeIssueIndex : 0; // Default to first if none strictly active
                        const issue = result.issues[idx];
                        if (!issue) return null;

                        const isError = issue.type === "error";
                        const isWarning = issue.type === "warning";
                        const isFlashing = flashingCardIndex === idx;
                        
                        const borderColor = 
                          isError ? "border-red-400 dark:border-red-600" : isWarning ? "border-yellow-400 dark:border-yellow-600" : "border-emerald-400 dark:border-emerald-600";
                        
                        const iconBgColor =
                          isError ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/50" : isWarning ? "bg-yellow-50 border-yellow-100 text-yellow-600 dark:bg-yellow-950/50" : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/50";

                        const badgeColor = 
                          isError ? "text-red-700 bg-red-50 border-red-200" : isWarning ? "text-yellow-700 bg-yellow-50 border-yellow-200" : "text-emerald-700 bg-emerald-50 border-emerald-200";

                        return (
                          <div 
                            key={`detail-${idx}`}
                            ref={(el: HTMLDivElement | null) => { issueRefs.current[idx] = el; }}
                            className={`bg-white dark:bg-neutral-900 border-2 flex flex-col rounded-2xl shadow-md relative overflow-hidden transition-all duration-300 h-full
                              ${borderColor}
                            `}
                          >

                            <div className="p-6 flex-1 flex flex-col">
                              <div className="flex gap-4">
                                <div className={`mt-0.5 p-2 rounded-xl h-fit border shadow-sm ${iconBgColor}`}>
                                  {isError ? <AlertCircle className="w-6 h-6" /> : isWarning ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {issue.section}
                                    </span>
                                    <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{issue.title}</h3>
                                  </div>
                                  
                                  <div className="min-h-[100px] mb-6">
                                    <p className="text-neutral-700 dark:text-neutral-300 text-[15px] leading-relaxed whitespace-pre-line">
                                      {issue.description || (issue as any).customerBriefing || (issue as any).agentLegalTip}
                                    </p>
                                  </div>
                                  
                                  {/* Detailed Fact Extraction Area */}
                                  {issue.details && issue.details.length > 0 && (
                                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800 mb-5">
                                      <h4 className="text-xs font-bold text-neutral-500 mb-3 uppercase flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> 핵심 요약 정보</h4>
                                      <ul className="space-y-2">
                                        {issue.details.map((detail, dIdx) => (
                                          <li key={dIdx} className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200 flex items-start gap-2.5">
                                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                                            {detail}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {(issue.matchedText || issue.type === 'safe') && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded uppercase tracking-wider">포착된 키워드</span>
                                      {issue.type === 'safe' ? (
                                        <span className="text-xs font-bold px-2.5 py-1 rounded border text-emerald-700 bg-emerald-50 border-emerald-200">포착된 위험 키워드 없음 ✓</span>
                                      ) : (
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${badgeColor}`}>"{issue.matchedText}"</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
