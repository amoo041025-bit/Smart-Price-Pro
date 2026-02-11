
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
    productName: '프리미엄 전략 상품',
    costPrice: 55000,
    mainGpRate: 35.0,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('150000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdatingFromTarget = useRef(false);

  // 가격 계산 로직 (전방향)
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

  // 소비자가 변경 시 역산
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
    const wholesale = num * (1 - (input.consumerMargin / 100));
    const supplyVat = wholesale * (1 - (input.wholesaleMargin / 100));
    const supplyNet = supplyVat / 1.1;
    const newGp = supplyNet > 0 ? (1 - (input.costPrice / supplyNet)) * 100 : 0;
    
    setInput(prev => ({ ...prev, mainGpRate: parseFloat(newGp.toFixed(2)) }));
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      const prompt = `당신은 이커머스 전략가입니다. 상품: ${input.productName}, 원가: ${input.costPrice}, 소비자가: ${Math.round(result.consumerPrice)}, 마진율: ${result.marginRate.toFixed(1)}%. 현재 구조의 장단점을 3문장으로 분석해줘.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiAnalysis(response.text || "결과를 가져오지 못했습니다.");
    } catch (e) {
      setAiAnalysis("AI 분석을 위해서는 유효한 API 키가 설정되어 있어야 합니다.");
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 sticky top-0 z-50 shadow-xl border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/40">
            <Calculator className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Smart-Price <span className="text-indigo-400">PRO</span></h1>
        </div>
        <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Engine Active</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Settings2 className="w-4 h-4 text-indigo-600" /> 파라미터 제어판
            </h2>

            <div className="space-y-6">
              <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg relative overflow-hidden group">
                <label className="text-[10px] font-black text-indigo-200 uppercase mb-2 block tracking-widest">목표 소비자가 (역산)</label>
                <div className="relative">
                  <span className="absolute left-0 top-1 text-white opacity-50 font-bold text-2xl">₩</span>
                  <input type="number" value={targetPrice} onChange={handleTargetPriceChange} className="w-full pl-8 bg-transparent border-b-2 border-indigo-400 text-white text-3xl font-black outline-none font-mono"/>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">매입 원가 (VAT 별도)</label>
                <input type="number" name="costPrice" value={input.costPrice} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"/>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 uppercase">주거래 마진 (GP %)</label>
                  <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-black">{input.mainGpRate}%</span>
                </div>
                <input type="range" name="mainGpRate" min="0" max="80" step="0.1" value={input.mainGpRate} onChange={handleInputChange} className="w-full"/>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">소비자가</span>
              <div className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">총 마진액</span>
              <div className="text-3xl font-black text-indigo-600 font-mono tracking-tighter">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">수익률</span>
              <div className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-72">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-4">가격 구성 시각화</h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)'}}/>
                  <Bar dataKey="val" radius={[8, 8, 0, 0]} barSize={35}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm h-72 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase">AI 인사이트</h3>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-black disabled:opacity-50">분석</button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 overflow-y-auto text-xs font-medium text-slate-600 leading-relaxed">
                {aiAnalysis || "데이터 입력 후 분석 버튼을 눌러 리포트를 확인하세요."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr><th className="px-8 py-4">단계</th><th className="px-8 py-4 text-right">금액 (VAT 포함)</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-indigo-50/20"><td className="px-8 py-5 font-bold text-indigo-900">주거래 공급가</td><td className="px-8 py-5 text-right font-mono font-black text-indigo-700 text-lg">{formatCurrency(result.mainSupplyVatIncl)}</td></tr>
                <tr><td className="px-8 py-5 text-slate-700">도매 공급가</td><td className="px-8 py-5 text-right font-mono font-bold text-slate-700">{formatCurrency(result.wholesalePrice)}</td></tr>
                <tr className="bg-emerald-50/30 font-black"><td className="px-8 py-6 text-emerald-900">최종 소비자가</td><td className="px-8 py-6 text-right font-mono text-emerald-600 text-2xl">{formatCurrency(result.consumerPrice)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-10 text-center text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">© 2025 Smart-Price Pro v5.0 • No-Build Engine</footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
