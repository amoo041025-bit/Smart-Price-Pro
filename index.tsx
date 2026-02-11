
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  RefreshCcw, AlertCircle, TrendingUp, DollarSign, ChevronRight
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

  // 소비자가 변경 시 목표가 업데이트
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

  // 목표가 역산 로직
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
      // API Key는 환경 변수에서 직접 참조 (시스템 자동 주입 가정)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const prompt = `
        분석 데이터:
        - 상품: ${input.productName}
        - 매입가: ${formatCurrency(input.costPrice)}
        - 소비자가: ${formatCurrency(result.consumerPrice)}
        - 마진율: ${result.marginRate.toFixed(1)}%
        - 총 마진액: ${formatCurrency(result.totalMargin)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "당신은 이커머스 쇼핑몰 가격 전략 전문가입니다. 제공된 데이터를 기반으로 현재 마진의 건강 상태와 시장 경쟁력을 분석하여 한국어로 3문장 요약 제안을 제공하세요."
        }
      });

      if (response && response.text) {
        setAiAnalysis(response.text);
      } else {
        throw new Error("AI 응답을 받지 못했습니다.");
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      setError(`분석 오류: ${err.message || 'API 연결을 확인하세요.'}`);
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-xl flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Smart-Price <span className="text-indigo-400">PRO</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">AI Pricing Engine v6.0</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">System Secure</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 사이드바 제어판 */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm mb-8 flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="w-4 h-4 text-indigo-600" /> 시뮬레이션 제어
            </h2>
            <div className="space-y-6">
              <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg relative overflow-hidden group">
                <Target className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10" />
                <label className="text-[10px] font-black text-indigo-100 uppercase mb-2 block tracking-widest">목표 소비자 가격 (역산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-white opacity-50 font-bold text-2xl font-mono">₩</span>
                  <input 
                    type="number" 
                    value={targetPrice} 
                    onChange={handleTargetPriceChange} 
                    className="w-full pl-8 bg-transparent border-b-2 border-indigo-400 text-white text-3xl font-black outline-none font-mono focus:border-white transition-colors"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매입 원가 (VAT 별도)</label>
                <input 
                  type="number" 
                  name="costPrice" 
                  value={input.costPrice} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-tighter">주거래 마진 (GP%)</label>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black font-mono">{input.mainGpRate}%</span>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">도매 마진 (%)</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">소비자 마진 (%)</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 리포트 영역 */}
        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm group">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">권장 소비자가</span>
              <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm group">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">총 마진액</span>
              <div className="text-3xl font-black text-indigo-600 font-mono tracking-tighter">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm group">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">수익률 (GP)</span>
              <div className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> 데이터 시각화</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => formatCurrency(v)} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={40}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> AI 전략 분석</h3>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing} 
                  className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-black active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                  {isAnalyzing ? "분석 중" : "분석 시작"}
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-5 overflow-y-auto relative">
                {error ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-red-500">
                    <AlertCircle className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                  </div>
                ) : isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                    <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black tracking-widest uppercase">Engine Running...</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                    {aiAnalysis || "가격을 설정한 후 분석 버튼을 눌러 AI 조언을 확인하세요."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr><th className="px-8 py-4">유통 단계</th><th className="px-8 py-4 text-right">금액 (VAT 포함)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-sm">
                <tr className="hover:bg-slate-50 transition-colors"><td className="px-8 py-5 text-slate-500">매입 원가 (VAT 별도)</td><td className="px-8 py-5 text-right font-mono text-slate-400">{formatCurrency(input.costPrice)}</td></tr>
                <tr className="bg-indigo-50/20"><td className="px-8 py-5 font-bold text-indigo-900">주거래 공급가</td><td className="px-8 py-5 text-right font-mono font-black text-indigo-700">{formatCurrency(result.mainSupplyVatIncl)}</td></tr>
                <tr className="hover:bg-slate-50 transition-colors"><td className="px-8 py-5 text-slate-700 italic">도매 공급가</td><td className="px-8 py-5 text-right font-mono font-bold text-slate-700">{formatCurrency(result.wholesalePrice)}</td></tr>
                <tr className="bg-emerald-50/30"><td className="px-8 py-6 font-black text-emerald-900 text-lg flex items-center gap-2">최종 소비자가 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div></td><td className="px-8 py-6 text-right font-mono font-black text-emerald-600 text-3xl tracking-tighter">{formatCurrency(result.consumerPrice)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-10 text-center text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase border-t border-slate-100">© 2025 Smart-Price Pro • Core v6.0</footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
