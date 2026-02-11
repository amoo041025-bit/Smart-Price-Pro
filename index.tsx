
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calculator, BarChart3, Sparkles, Target, Settings2, ShieldCheck, ArrowUpRight, PieChart, Info
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// --- 가격 계산 로직 ---
const calculatePricing = (input) => {
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

const calculateGpFromTarget = (cost, target, wholesaleM, consumerM) => {
  if (target <= 0 || cost <= 0) return 0;
  const wholesale = target * (1 - (consumerM / 100));
  const supplyVat = wholesale * (1 - (wholesaleM / 100));
  const supplyNet = supplyVat / 1.1;
  return supplyNet > 0 ? (1 - (cost / supplyNet)) * 100 : 0;
};

const formatCurrency = (v) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(v));

const App = () => {
  const [input, setInput] = useState({
    productName: '신규 전략 상품',
    costPrice: 48000,
    mainGpRate: 35,
    wholesaleMargin: 15,
    consumerMargin: 20
  });

  const [targetPrice, setTargetPrice] = useState('120000');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isUpdating = useRef(false);

  const result = useMemo(() => calculatePricing(input), [input]);

  useEffect(() => {
    if (!isUpdating.current) setTargetPrice(Math.round(result.consumerPrice).toString());
  }, [result.consumerPrice]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    isUpdating.current = false;
    setInput(prev => ({ ...prev, [name]: name === 'productName' ? value : Number(value) }));
  };

  const handleTargetChange = (e) => {
    const val = e.target.value;
    setTargetPrice(val);
    const num = Number(val);
    if (!num || num <= 0) return;
    isUpdating.current = true;
    const newGp = calculateGpFromTarget(input.costPrice, num, input.wholesaleMargin, input.consumerMargin);
    setInput(prev => ({ ...prev, mainGpRate: parseFloat(newGp.toFixed(2)) }));
  };

  const handleAiAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `분석: 상품(${input.productName}), 원가(${input.costPrice}), 소비자가(${Math.round(result.consumerPrice)}). 마진율 ${result.marginRate.toFixed(1)}%. 이 가격 정책의 장단점과 개선안을 한국어로 3줄 요약해줘.`
      });
      setAiAnalysis(response.text);
    } catch (e) {
      setAiAnalysis("AI 분석을 위해 API 키가 필요합니다.");
    } finally { setIsAnalyzing(false); }
  };

  const chartData = [
    { name: '원가', val: input.costPrice, color: '#94a3b8' },
    { name: '공급가', val: result.mainSupplyVatIncl, color: '#818cf8' },
    { name: '도매가', val: result.wholesalePrice, color: '#6366f1' },
    { name: '소비자가', val: result.consumerPrice, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><Calculator className="w-5 h-5"/></div>
            <h1 className="text-lg font-black tracking-tight">Smart-Price <span className="text-indigo-400">PRO</span></h1>
          </div>
          <div className="text-[10px] font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-emerald-400">● LIVE ENGINE</div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="font-bold flex items-center gap-2 text-slate-700"><Settings2 className="w-4 h-4 text-indigo-500"/> 파라미터 설정</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-indigo-600 rounded-2xl shadow-inner">
                <label className="text-[10px] font-black text-indigo-200 uppercase block mb-2">목표 소비자가 (역산)</label>
                <input type="number" value={targetPrice} onChange={handleTargetChange} className="w-full bg-transparent border-b border-indigo-400 text-white text-2xl font-black outline-none font-mono"/>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">매입 원가 (VAT 별도)</label>
                <input type="number" name="costPrice" value={input.costPrice} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600">주거래 GP (%)</label>
                  <span className="text-xs font-black text-indigo-600 font-mono">{input.mainGpRate}%</span>
                </div>
                <input type="range" name="mainGpRate" min="0" max="80" step="0.1" value={input.mainGpRate} onChange={handleInputChange} className="w-full cursor-pointer"/>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">최종 소비자가</span>
              <div className="text-2xl font-black text-emerald-600 font-mono">{formatCurrency(result.consumerPrice)}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">총 마진액</span>
              <div className="text-2xl font-black text-indigo-600 font-mono">{formatCurrency(result.totalMargin)}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-1">수익률(GP)</span>
              <div className="text-2xl font-black text-slate-800 font-mono">{result.marginRate.toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-64">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-500"/> 가격 분포</h3>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{borderRadius: '12px', border: 'none'}}/>
                  <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-64">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500"/> AI 분석</h3>
                <button onClick={handleAiAnalyze} disabled={isAnalyzing} className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50">리포트 생성</button>
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 overflow-y-auto text-sm text-slate-600 leading-relaxed">
                {aiAnalysis || "데이터 분석 버튼을 눌러 전략 리포트를 확인하세요."}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr><th className="px-6 py-4">항목</th><th className="px-6 py-4 text-right">VAT 포함가</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                <tr><td className="px-6 py-4 text-slate-500">매입 원가 (VAT 별도)</td><td className="px-6 py-4 text-right font-mono text-slate-400">{formatCurrency(input.costPrice)}</td></tr>
                <tr className="bg-indigo-50/30"><td className="px-6 py-4 font-bold text-indigo-900">주거래 공급가</td><td className="px-6 py-4 text-right font-mono font-black text-indigo-700">{formatCurrency(result.mainSupplyVatIncl)}</td></tr>
                <tr><td className="px-6 py-4 text-slate-700">도매 공급가</td><td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{formatCurrency(result.wholesalePrice)}</td></tr>
                <tr className="bg-emerald-50/50"><td className="px-6 py-4 font-black text-emerald-900">최종 소비자가</td><td className="px-6 py-4 text-right font-mono font-black text-emerald-600 text-lg">{formatCurrency(result.consumerPrice)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2025 Smart-Price Pro • No-Build Engine</footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
