
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  RefreshCcw, AlertCircle, TrendingUp, DollarSign, ChevronRight, Info
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    productName: '프리미엄 전략 상품',
    costPrice: 55000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUpdatingFromTarget = useRef(false);

  // 가격 계산 엔진
  const result = useMemo(() => {
    const { costPrice, mainGpRate, wholesaleMargin, consumerMargin } = input;
    // 1. 주거래공급가(Net) = 원가 / (1 - GP%)
    const mainSupplyNet = costPrice / (1 - (mainGpRate / 100));
    // 2. 주거래공급가(VAT 포함)
    const mainSupplyVatIncl = mainSupplyNet * 1.1;
    // 3. 도매가 = 주거래공급가(Gross) / (1 - 도매마진%)
    const wholesalePrice = mainSupplyVatIncl / (1 - (wholesaleMargin / 100));
    // 4. 최종 소비자가 = 도매가 / (1 - 소비자마진%)
    const consumerPrice = wholesalePrice / (1 - (consumerMargin / 100));
    
    return {
      mainSupplyNet,
      mainSupplyVatIncl,
      wholesalePrice,
      consumerPrice,
      totalMargin: consumerPrice - costPrice,
      marginRate: ((consumerPrice - costPrice) / consumerPrice) * 100
    };
  }, [input]);

  // 소비자가 변경 시 목표가 동기화
  useEffect(() => {
    if (!isUpdatingFromTarget.current) {
      setTargetPrice(Math.round(result.consumerPrice).toString());
    }
  }, [result.consumerPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    isUpdatingFromTarget.current = false;
    setInput(prev => ({ ...prev, [name]: name === 'productName' ? value : Number(value) }));
  };

  const handleTargetPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetPrice(val);
    const num = Number(val);
    if (!num || num <= 0) return;

    isUpdatingFromTarget.current = true;
    const wholesale = num * (1 - (input.consumerMargin / 100));
    const supplyVat = wholesale * (1 - (input.wholesaleMargin / 100));
    const supplyNet = supplyVat / 1.1;
    const newGp = supplyNet > 0 ? (1 - (input.costPrice / supplyNet)) * 100 : 0;
    setInput(prev => ({ ...prev, mainGpRate: parseFloat(newGp.toFixed(2)) }));
  };

  const handleAiAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key가 설정되지 않았습니다. 환경 변수를 확인하세요.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        다음 이커머스 상품 가격 구조를 분석하고 한국어로 조언하세요.
        - 상품명: ${input.productName}
        - 매입가: ${formatCurrency(input.costPrice)}
        - 최종 판매가: ${formatCurrency(result.consumerPrice)}
        - 마진율: ${result.marginRate.toFixed(1)}%
        - 총 마진액: ${formatCurrency(result.totalMargin)}
        
        전문적인 가격 전략가로서 현재 마진의 건강함과 시장 경쟁력을 3문장 이내로 요약해 주세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "당신은 10년 경력의 이커머스 MD 및 가격 전략가입니다. 날카롭고 실무적인 조언을 제공하세요."
        }
      });

      if (response && response.text) {
        setAiAnalysis(response.text);
      } else {
        throw new Error("AI 응답 데이터가 비어 있습니다.");
      }
    } catch (err: any) {
      console.error("Analysis Failure:", err);
      setError(`분석 실패: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [
    { name: '원가', val: input.costPrice, color: '#94a3b8' },
    { name: '공급가', val: result.mainSupplyVatIncl, color: '#818cf8' },
    { name: '도매가', val: result.wholesalePrice, color: '#6366f1' },
    { name: '소비자가', val: result.consumerPrice, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
      {/* 고도화된 헤더 */}
      <header className="bg-slate-900 text-white px-8 py-5 sticky top-0 z-50 shadow-2xl flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none italic">
              Smart-Price <span className="text-indigo-400 not-italic">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> AI Strategic Pricing Engine
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 bg-slate-800/50 px-5 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Analysis Mode Active</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* 컨트롤 패널 */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl"></div>
            
            <h2 className="font-black text-slate-800 text-xs mb-10 flex items-center gap-3 uppercase tracking-widest">
              <Settings2 className="w-4 h-4 text-indigo-600" /> Parameter Simulation
            </h2>
            
            <div className="space-y-8 relative z-10">
              <div className="p-7 bg-indigo-600 rounded-[32px] shadow-[0_20px_40px_rgba(79,70,229,0.2)] relative overflow-hidden group transition-all hover:scale-[1.02]">
                <Target className="absolute -right-4 -bottom-4 w-28 h-28 text-white opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                <label className="text-[10px] font-black text-indigo-100 uppercase mb-3 block tracking-widest opacity-80">목표 소비자 가격 (역산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-white/50 font-bold text-2xl font-mono">₩</span>
                  <input 
                    type="number" 
                    value={targetPrice} 
                    onChange={handleTargetPriceChange} 
                    className="w-full pl-9 bg-transparent border-b-2 border-indigo-400/50 text-white text-3xl font-black outline-none font-mono focus:border-white transition-all pb-1"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3 h-3" /> 매입 원가 (VAT 별도)
                </label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₩</span>
                   <input 
                    type="number" 
                    name="costPrice" 
                    value={input.costPrice} 
                    onChange={handleInputChange} 
                    className="w-full pl-10 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-tighter">주거래 마진 (GP%)</label>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-black font-mono shadow-sm">{input.mainGpRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    name="mainGpRate" 
                    min="-10" 
                    max="80" 
                    step="0.1" 
                    value={input.mainGpRate} 
                    onChange={handleInputChange} 
                    className="w-full cursor-pointer accent-indigo-600"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2 text-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">도매 마진 (%)</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full bg-transparent text-center font-black text-slate-700 font-mono outline-none"/>
                  </div>
                  <div className="space-y-2 text-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">소비자 마진 (%)</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full bg-transparent text-center font-black text-slate-700 font-mono outline-none"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 대시보드 리포트 */}
        <section className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">권장 소비자가</span>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter group-hover:text-emerald-600 transition-colors">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">예상 마진액</span>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter group-hover:text-indigo-600 transition-colors">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">수익 효율 (GP)</span>
              <div className="text-3xl font-black text-slate-900 font-mono tracking-tighter group-hover:text-amber-600 transition-colors">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[400px] flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Price Ladder Chart
              </h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => formatCurrency(v)} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
                    <Bar dataKey="val" radius={[12, 12, 0, 0]} barSize={45}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm h-[400px] flex flex-col overflow-hidden relative">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500" /> AI Strategy Insight
                </h3>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing} 
                  className="text-[10px] font-black bg-slate-900 text-white px-5 py-2.5 rounded-2xl hover:bg-black active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                >
                  {isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                  {isAnalyzing ? "분석 중" : "전략 분석"}
                </button>
              </div>
              <div className="flex-1 bg-slate-50/50 rounded-[32px] p-7 overflow-y-auto border border-slate-100/50 relative">
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-red-500">
                    <AlertCircle className="w-10 h-10 opacity-20" />
                    <p className="text-sm font-bold leading-relaxed">{error}</p>
                    <button onClick={handleAiAnalyze} className="text-[10px] font-black underline uppercase tracking-widest">다시 시도</button>
                  </div>
                ) : isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-5">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center">
                      <p className="text-[11px] font-black tracking-widest uppercase text-slate-400 animate-pulse">Consulting AI Expert...</p>
                      <p className="text-[9px] text-slate-300 mt-1 uppercase">Analyzing Margin Health & Competitiveness</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[13px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {aiAnalysis || "파라미터 설정이 완료되면 [전략 분석] 버튼을 눌러 AI 어드바이저의 의견을 확인하세요."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">단계별 가격 리포트</h3>
              <div className="flex items-center gap-2 text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-50 shadow-sm">
                 <DollarSign className="w-3 h-3" />
                 <span className="text-[10px] font-black uppercase tracking-tighter">Gross Margins</span>
              </div>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-50 font-medium">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-10 py-5 text-slate-400 flex items-center gap-3 italic"><span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span> 매입 원가 (VAT 별도)</td>
                  <td className="px-10 py-5 text-right font-mono font-bold text-slate-400">{formatCurrency(input.costPrice)}</td>
                </tr>
                <tr className="bg-indigo-50/20 group hover:bg-indigo-50 transition-colors">
                  <td className="px-10 py-6 font-black text-indigo-900 flex items-center gap-3"><ChevronRight className="w-4 h-4 text-indigo-400" /> 주거래 공급가 (VAT 포함)</td>
                  <td className="px-10 py-6 text-right font-mono font-black text-indigo-700 text-xl tracking-tighter">{formatCurrency(result.mainSupplyVatIncl)}</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-10 py-5 text-slate-700 flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 도매 공급가 (Gross)</td>
                  <td className="px-10 py-5 text-right font-mono font-bold text-slate-600">{formatCurrency(result.wholesalePrice)}</td>
                </tr>
                <tr className="bg-emerald-50/30 group">
                  <td className="px-10 py-8 font-black text-emerald-900 text-2xl flex items-center gap-4">최종 소비자가 <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div></td>
                  <td className="px-10 py-8 text-right font-mono font-black text-emerald-600 text-4xl tracking-tighter">{formatCurrency(result.consumerPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      
      <footer className="p-12 text-center border-t border-slate-100 bg-white mt-auto">
        <p className="text-[10px] font-black text-slate-300 tracking-[0.6em] uppercase">© 2025 Smart-Price Pro • Final v7.0 • Secure Engine</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
