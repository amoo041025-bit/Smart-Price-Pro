
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, 
  ArrowUpRight, PieChart, RefreshCcw, DollarSign, TrendingUp 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const formatCurrency = (v: number) => 
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    productName: '프리미엄 신규 테크 상품',
    costPrice: 55000,
    mainGpRate: 30,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdatingFromTarget = useRef(false);

  // 전방 계산 로직
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

  // 소비자가로부터 GP 역산
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
    // 역산 로직
    const wholesale = num * (1 - (input.consumerMargin / 100));
    const supplyVat = wholesale * (1 - (input.wholesaleMargin / 100));
    const supplyNet = supplyVat / 1.1;
    const newGp = supplyNet > 0 ? (1 - (input.costPrice / supplyNet)) * 100 : 0;
    
    setInput(prev => ({
      ...prev,
      mainGpRate: parseFloat(newGp.toFixed(2))
    }));
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Fix: Always use process.env.API_KEY directly for initialization as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `당신은 이커머스 가격 전략가입니다. 상품명: ${input.productName}, 원가: ${input.costPrice}원, 소비자가: ${Math.round(result.consumerPrice)}원, 마진율: ${result.marginRate.toFixed(1)}%. 현재 가격 구조의 시장 경쟁력과 수익성을 3문장으로 날카롭게 분석해줘.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      // Fix: Access .text property directly (do not call as a method)
      setAiAnalysis(response.text || "분석 결과를 생성하지 못했습니다.");
    } catch (e) {
      setAiAnalysis("AI 분석을 실행하는 도중 오류가 발생했습니다. API 키 설정을 확인하세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [
    { name: '매입원가', val: input.costPrice, color: '#94a3b8' },
    { name: '주거래가', val: result.mainSupplyVatIncl, color: '#818cf8' },
    { name: '도매가', val: result.wholesalePrice, color: '#6366f1' },
    { name: '소비자가', val: result.consumerPrice, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/40">
              <Calculator className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">Smart-Price <span className="text-indigo-400">PRO</span></h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Enterprise Engine v5.0</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-200">
            <div className="flex items-center gap-2 mb-8">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-800 uppercase text-sm tracking-tight">가격 파라미터 설정</h2>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-200 relative overflow-hidden group">
                <Target className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-10 group-hover:scale-110 transition-transform" />
                <label className="text-[10px] font-black text-indigo-200 uppercase mb-2 block tracking-widest">목표 소비자가 (역산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-white opacity-50 font-bold text-2xl">₩</span>
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
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">₩</span>
                  <input 
                    type="number" 
                    name="costPrice" 
                    value={input.costPrice} 
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-tighter">주거래 마진율 (GP %)</label>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-mono font-black">{input.mainGpRate}%</span>
                  </div>
                  <input 
                    type="range" 
                    name="mainGpRate" 
                    min="0" max="80" step="0.1" 
                    value={input.mainGpRate} 
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">도매 마진 (%)</label>
                    <input type="number" name="wholesaleMargin" value={input.wholesaleMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none"/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">소비자 마진 (%)</label>
                    <input type="number" name="consumerMargin" value={input.consumerMargin} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono outline-none"/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Dashboard */}
        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <TrendingUp className="absolute top-4 right-4 w-5 h-5 text-emerald-500" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">권장 소비자가</span>
              <div className="text-3xl font-black text-emerald-600 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <DollarSign className="absolute top-4 right-4 w-5 h-5 text-indigo-500" />
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">총 예상 마진액</span>
              <div className="text-3xl font-black text-indigo-600 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-4 right-4 text-xs font-black text-slate-300">GP</div>
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-2">최종 수익률</span>
              <div className="text-3xl font-black text-slate-800 font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500" /> 가격 단계 시각화</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={40}>
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> AI 전략 리포트</h3>
                <button 
                  onClick={handleAiAnalyze} 
                  disabled={isAnalyzing} 
                  className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin"/> : <RefreshCcw className="w-3 h-3"/>}
                  분석 실행
                </button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-5 overflow-y-auto text-[13px] text-slate-600 leading-relaxed font-medium">
                {aiAnalysis || "데이터 입력 후 분석 실행 버튼을 클릭하여 전문 전략가의 인사이트를 확인하세요."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><PieChart className="w-4 h-4 text-indigo-500" /> 단계별 가격 명세</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4">유통 및 마진 단계</th>
                  <th className="px-8 py-4 text-right">금액 (VAT 포함)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 text-slate-500">매입 원가 (VAT 별도)</td>
                  <td className="px-8 py-4 text-right font-mono text-slate-400">{formatCurrency(input.costPrice)}</td>
                </tr>
                <tr className="bg-indigo-50/20">
                  <td className="px-8 py-5 font-bold text-indigo-900">주거래 공급가</td>
                  <td className="px-8 py-5 text-right font-mono font-black text-indigo-700">{formatCurrency(result.mainSupplyVatIncl)}</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 text-slate-700 italic">도매 공급가</td>
                  <td className="px-8 py-4 text-right font-mono font-bold text-slate-700">{formatCurrency(result.wholesalePrice)}</td>
                </tr>
                <tr className="bg-emerald-50/30">
                  <td className="px-8 py-6 font-black text-emerald-900 text-lg flex items-center gap-2">최종 소비자가 <span className="text-[10px] bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Final</span></td>
                  <td className="px-8 py-6 text-right font-mono font-black text-emerald-600 text-2xl tracking-tighter">{formatCurrency(result.consumerPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
        © 2025 Smart-Price Pro • No-Build Enterprise Engine
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
