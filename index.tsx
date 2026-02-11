
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  RefreshCcw, AlertCircle, ChevronRight, Info, Layers, TrendingUp
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    productName: '전략 상품 Alpha',
    costPrice: 55000, 
    mainGpRate: 35.0, 
    wholesaleMargin: 15, 
    consumerMargin: 20 
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdatingFromTarget = useRef(false);

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
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `당신은 이커머스 가격 전략 전문가입니다. 다음 데이터를 기반으로 한국어로 짧고 명확한(3문장 이내) MD 조언을 해주세요: 상품명: ${input.productName}, 원가: ${input.costPrice}원, 판매가: ${Math.round(result.consumerPrice)}원, 마진율: ${result.marginRate.toFixed(1)}%`,
      });
      setAiAnalysis(response.text || "분석 결과를 생성할 수 없습니다.");
    } catch (err) {
      setAiAnalysis("AI 분석 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [
    { name: '원가', val: input.costPrice, color: '#94a3b8' },
    { name: '공급가', val: result.mainSupplyVatIncl, color: '#818cf8' },
    { name: '도매가', val: result.wholesalePrice, color: '#6366f1' },
    { name: '판매가', val: result.consumerPrice, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
      <header className="bg-slate-900 text-white px-8 py-6 flex justify-between items-center shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl"><Calculator className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">Smart-Price <span className="text-indigo-400 not-italic">PRO</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pricing Strategy Engine</p>
          </div>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Simulation</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <h2 className="font-black text-slate-800 text-[10px] mb-8 flex items-center gap-2 uppercase tracking-widest">
              <Settings2 className="w-3.5 h-3.5 text-indigo-600" /> 시뮬레이션 제어판
            </h2>
            <div className="space-y-8">
              <div className="p-6 bg-slate-900 rounded-3xl shadow-xl">
                <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block tracking-widest">목표 소비자가 (역산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-slate-600 font-bold text-xl font-mono">₩</span>
                  <input type="number" value={targetPrice} onChange={handleTargetPriceChange} className="w-full pl-8 bg-transparent border-b border-slate-700 text-white text-3xl font-black outline-none font-mono focus:border-indigo-500 transition-all pb-1"/>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">매입 원가 (VAT 별도)</label>
                  <input type="number" name="costPrice" value={input.costPrice} onChange={handleInputChange} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-lg"/>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-600 uppercase">공급 마진 (GP%)</label><span className="text-indigo-600 font-mono font-black">{input.mainGpRate}%</span></div>
                  <input type="range" name="mainGpRate" min="0" max="85" step="0.1" value={input.mainGpRate} onChange={handleInputChange} className="w-full cursor-pointer"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><label className="text-[8px] font-black text-slate-400 uppercase block mb-1">도매 마진 %</label><input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full bg-transparent font-black text-slate-700 font-mono outline-none"/></div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><label className="text-[8px] font-black text-slate-400 uppercase block mb-1">소비자 마진 %</label><input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full bg-transparent font-black text-slate-700 font-mono outline-none"/></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-1">권장 판매가</span>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-1">예상 수익액</span>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-1">최종 마진율</span>
              <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[380px] flex flex-col">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> 구성 요소 시각화</h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={40}>{chartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> AI 전략 리포트</h3>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="text-[9px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-all flex items-center gap-2">
                  {isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>} 분석 실행
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-6 overflow-y-auto custom-scroll border border-slate-100/50">
                <div className="text-[13px] text-slate-600 leading-relaxed font-medium">
                  {aiAnalysis || "가격 설정 후 상단의 버튼을 눌러 AI 조언을 확인하세요."}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm font-medium">
              <tbody className="divide-y divide-slate-50">
                <tr className="bg-indigo-50/20"><td className="px-8 py-5 font-black text-indigo-900">주거래 공급가 (VAT포함)</td><td className="px-8 py-5 text-right font-mono font-black text-indigo-700 text-lg">{formatCurrency(result.mainSupplyVatIncl)}</td></tr>
                <tr className="bg-emerald-50/30"><td className="px-8 py-6 font-black text-emerald-900 text-lg">최종 권장 소비자가</td><td className="px-8 py-6 text-right font-mono font-black text-emerald-600 text-3xl">{formatCurrency(result.consumerPrice)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-8 text-center border-t border-slate-100 text-[10px] font-black text-slate-300 tracking-[0.4em] uppercase">© 2025 Smart-Price Pro</footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
