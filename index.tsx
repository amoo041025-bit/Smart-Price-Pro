
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  ArrowUpRight, PieChart, RefreshCcw, DollarSign, TrendingUp, ChevronRight
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

/**
 * [Pricing Logic 통합]
 */
const calculatePricing = (input: any) => {
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
};

const calculateGpFromTargetPrice = (
  costPrice: number,
  targetConsumerPrice: number,
  wholesaleMargin: number,
  consumerMargin: number
): number => {
  if (targetConsumerPrice <= 0 || costPrice <= 0) return 0;
  const wholesalePrice = targetConsumerPrice * (1 - (consumerMargin / 100));
  const mainSupplyVatIncl = wholesalePrice * (1 - (wholesaleMargin / 100));
  const mainSupplyNet = mainSupplyVatIncl / 1.1;
  if (mainSupplyNet <= 0) return 0;
  const gpRate = (1 - (costPrice / mainSupplyNet)) * 100;
  return parseFloat(gpRate.toFixed(4));
};

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    productName: '프리미엄 전략 신상품',
    costPrice: 55000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdatingFromTarget = useRef(false);

  // 전방향 계산 결과
  const result = useMemo(() => calculatePricing(input), [input]);

  // 소비자가 변경 시 역산 타겟 가격 업데이트
  useEffect(() => {
    if (!isUpdatingFromTarget.current) {
      setTargetPrice(Math.round(result.consumerPrice).toString());
    }
  }, [result.consumerPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    isUpdatingFromTarget.current = false;
    setInput(prev => ({
      ...prev,
      [name]: name === 'productName' ? value : Number(value)
    }));
  };

  const handleTargetPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetPrice(val);
    const num = Number(val);
    if (!num || num <= 0) return;

    isUpdatingFromTarget.current = true;
    const newGp = calculateGpFromTargetPrice(
      input.costPrice,
      num,
      input.wholesaleMargin,
      input.consumerMargin
    );
    
    setInput(prev => ({ ...prev, mainGpRate: parseFloat(newGp.toFixed(2)) }));
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY || "" });
      const prompt = `이커머스 가격 전략가로서 상품(${input.productName})의 원가 ${input.costPrice}원 대비 소비자가 ${Math.round(result.consumerPrice)}원(마진율 ${result.marginRate.toFixed(1)}%) 구조를 3문장으로 날카롭게 분석해줘.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAnalysis(response.text || "분석 결과를 생성할 수 없습니다.");
    } catch (e) {
      setAiAnalysis("AI 분석을 사용하려면 API 키가 필요합니다. 시스템 설정에서 API_KEY를 확인하세요.");
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
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-2xl border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-900/40">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Smart-Price <span className="text-indigo-400">PRO</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pricing Simulation Engine</p>
          </div>
        </div>
        <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Simulation Active</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 제어판 */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm mb-8 flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="w-4 h-4 text-indigo-600" /> 전략 파라미터 설정
            </h2>

            <div className="space-y-6">
              <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg relative overflow-hidden group">
                <Target className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10 group-hover:scale-110 transition-transform" />
                <label className="text-[10px] font-black text-indigo-100 uppercase mb-2 block tracking-widest">목표 소비자가 입력 (역계산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-white opacity-50 font-bold text-2xl font-mono">₩</span>
                  <input type="number" value={targetPrice} onChange={handleTargetPriceChange} className="w-full pl-8 bg-transparent border-b-2 border-indigo-400 text-white text-3xl font-black outline-none font-mono focus:border-white transition-colors"/>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매입 원가 (VAT 별도)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-bold">₩</span>
                  <input type="number" name="costPrice" value={input.costPrice} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"/>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 uppercase">주거래 마진 (GP %)</label>
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black font-mono">{input.mainGpRate}%</span>
                  </div>
                  <input type="range" name="mainGpRate" min="-10" max="80" step="0.1" value={input.mainGpRate} onChange={handleInputChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">도매 마진 (%)</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">소비자 마진 (%)</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none focus:border-indigo-500"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 대시보드 메인 */}
        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <TrendingUp className="absolute top-4 right-4 w-5 h-5 text-emerald-500" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">권장 소비자가</span>
              <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <DollarSign className="absolute top-4 right-4 w-5 h-5 text-indigo-500" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">총 예상 마진액</span>
              <div className="text-3xl font-black text-indigo-600 font-mono tracking-tighter">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">수익률 (GP)</span>
              <div className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> 가격 단계 시각화</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={40}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> AI 전략 인사이트</h3>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="text-[10px] font-black bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2">
                  {isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <RefreshCcw className="w-3 h-3"/>}
                  분석 실행
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-5 overflow-y-auto text-[13px] text-slate-600 leading-relaxed font-medium">
                {aiAnalysis || "데이터 입력 후 분석 버튼을 클릭하여 AI 전문 전략가의 인사이트를 확인하세요."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-500" /> 단계별 가격 명세</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr><th className="px-8 py-4">구분</th><th className="px-8 py-4 text-right">금액 (VAT 포함)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="bg-indigo-50/20"><td className="px-8 py-5 font-bold text-indigo-900">주거래 공급가</td><td className="px-8 py-5 text-right font-mono font-black text-indigo-700 text-lg">{formatCurrency(result.mainSupplyVatIncl)}</td></tr>
                <tr><td className="px-8 py-5 text-slate-700">도매 공급가 (직거래가)</td><td className="px-8 py-5 text-right font-mono font-bold text-slate-700">{formatCurrency(result.wholesalePrice)}</td></tr>
                <tr className="bg-emerald-50/30 font-black"><td className="px-8 py-6 text-emerald-900 text-xl flex items-center gap-2">최종 소비자가 <span className="text-[10px] bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Final</span></td><td className="px-8 py-6 text-right font-mono text-emerald-600 text-3xl tracking-tighter">{formatCurrency(result.consumerPrice)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-10 text-center text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">© 2025 Smart-Price Pro • No-Build Enterprise Engine v5.0</footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
