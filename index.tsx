
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  RefreshCcw, AlertCircle, ChevronRight, Info, DollarSign, TrendingUp, Layers
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    costPrice: 55000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdatingFromTarget = useRef(false);

  // 가격 계산 로직
  const result = useMemo(() => {
    const { costPrice, mainGpRate, wholesaleMargin, consumerMargin } = input;
    const mainSupplyNet = costPrice / (1 - (mainGpRate / 100));
    const mainSupplyVatIncl = mainSupplyNet * 1.1;
    const wholesalePrice = mainSupplyVatIncl / (1 - (wholesaleMargin / 100));
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

  useEffect(() => {
    if (!isUpdatingFromTarget.current) {
      setTargetPrice(Math.round(result.consumerPrice).toString());
    }
  }, [result.consumerPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    isUpdatingFromTarget.current = false;
    setInput(prev => ({ ...prev, [name]: Number(value) }));
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
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `매입가 ${input.costPrice}원, 판매가 ${Math.round(result.consumerPrice)}원, 마진율 ${result.marginRate.toFixed(1)}% 상품의 수익성을 분석해주세요. 전문가처럼 한국어로 2줄 요약하세요.`,
      });
      setAiAnalysis(response.text || "분석 불가");
    } catch (err) {
      setAiAnalysis("AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [
    { name: '매입원가', val: input.costPrice, color: '#94a3b8' },
    { name: '공급가격', val: result.mainSupplyVatIncl, color: '#818cf8' },
    { name: '도매가격', val: result.wholesalePrice, color: '#6366f1' },
    { name: '판매가격', val: result.consumerPrice, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col">
      <header className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg"><Calculator className="w-5 h-5" /></div>
          <h1 className="text-lg font-black tracking-tighter italic uppercase">Smart-Price <span className="text-indigo-400 not-italic">PRO</span></h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400">
          <ShieldCheck className="w-3 h-3" /> Live Engine
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" /> 시뮬레이션 설정
            </h2>
            
            <div className="space-y-6">
              <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg">
                <label className="text-[9px] font-black text-indigo-100 uppercase block mb-1">목표 소비자가 (역계산)</label>
                <input 
                  type="number" 
                  value={targetPrice} 
                  onChange={handleTargetPriceChange} 
                  className="w-full bg-transparent border-b border-indigo-400 text-white text-2xl font-black outline-none font-mono"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">매입 원가 (VAT 별도)</label>
                  <input type="number" name="costPrice" value={input.costPrice} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"/>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase">
                    <span>공급 마진 (GP%)</span>
                    <span className="text-indigo-600">{input.mainGpRate}%</span>
                  </div>
                  <input type="range" name="mainGpRate" min="0" max="80" step="0.1" value={input.mainGpRate} onChange={handleInputChange} className="w-full"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">도매마진%</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full bg-transparent font-black text-slate-700 font-mono outline-none"/>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">소비자마진%</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full bg-transparent font-black text-slate-700 font-mono outline-none"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-[9px] font-black uppercase block mb-1">최종 판매가</span>
              <div className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-[9px] font-black uppercase block mb-1">총 마진액</span>
              <div className="text-xl font-black text-slate-900 font-mono tracking-tight">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-[9px] font-black uppercase block mb-1">최종 마진율</span>
              <div className="text-xl font-black text-emerald-600 font-mono tracking-tight">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 h-[350px]">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> 가격 구성</h3>
              <div className="h-full pb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="val" radius={[8, 8, 0, 0]} barSize={35}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI 전문가 조언</h3>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing}
                  className="bg-slate-900 text-white text-[9px] px-3 py-1.5 rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {isAnalyzing ? "분석 중..." : "분석 요청"}
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl p-4 text-[12px] text-slate-600 leading-relaxed font-medium">
                {aiAnalysis || "가격을 조정한 후 AI 분석 버튼을 클릭하세요."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-50">
                <tr className="bg-indigo-50/30">
                  <td className="px-6 py-4 font-black text-indigo-900">주거래 공급가 (VAT 포함)</td>
                  <td className="px-6 py-4 text-right font-mono font-black text-indigo-600">{formatCurrency(result.mainSupplyVatIncl)}</td>
                </tr>
                <tr className="bg-emerald-50/20">
                  <td className="px-6 py-5 font-black text-emerald-900 text-sm">최종 권장 소비자가</td>
                  <td className="px-6 py-5 text-right font-mono font-black text-emerald-600 text-2xl">{formatCurrency(result.consumerPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      
      <footer className="p-8 text-center border-t border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-widest">
        © 2025 Smart-Price Pro • Strategic Pricing System
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
