import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Brain, 
  Database, 
  LayoutDashboard, 
  AlertCircle,
  Settings2,
  FileSpreadsheet,
  Zap,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { DataGenerator } from './services/dataGenerator';
import { MLEngine } from './services/mlEngine';
import { State, DataPoint, ModelMetrics, FeatureImportance } from './types';
import { GeminiService } from './services/gemini';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lab' | 'model'>('dashboard');
  const [data, setData] = useState<DataPoint[]>([]);
  const [inferenceHistory, setInferenceHistory] = useState<{ state: State; timestamp: number }[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [importances, setImportances] = useState<FeatureImportance[]>([]);
  const [expertAnalysis, setExpertAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Predictor Form State
  const [formInputs, setFormInputs] = useState({
    rtMs: 850,
    gsrMean: 1.85,
    peakCount: 2
  });
  const [predictionResult, setPredictionResult] = useState<{ state: State; confidence: number; commentary: string } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const dataGenerator = useMemo(() => new DataGenerator(), []);
  const mlEngine = useMemo(() => new MLEngine(), []);

  const loadDataset = () => {
    const newData = dataGenerator.generateDataset();
    setData(newData);
    setInferenceHistory([]); // Reset live history when dataset resets
    setMetrics(null);
    setImportances([]);
  };

  const runTraining = async () => {
    if (data.length === 0) return;
    setIsTraining(true);
    
    setTimeout(() => {
      const { metrics, importances } = mlEngine.trainModels(data);
      setMetrics(metrics);
      setImportances(importances);
      setIsTraining(false);
    }, 1500);
  };

  const getGeminiAnalysis = async () => {
    if (!metrics) return;
    setIsAnalyzing(true);
    try {
      const analysis = await GeminiService.analyzeResults(metrics, importances);
      setExpertAnalysis(analysis);
    } catch (error) {
      setExpertAnalysis("Failed to load expert insights. Please ensure API_KEY is valid.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    
    try {
      const result = mlEngine.predict(formInputs);
      const commentary = await GeminiService.getClinicalCommentary(
        formInputs.rtMs,
        formInputs.gsrMean,
        formInputs.peakCount,
        result.state
      );

      const newResult = {
        state: result.state,
        confidence: result.confidence,
        commentary: commentary
      };

      setPredictionResult(newResult);
      
      // Update inference history to increment counts in real-time
      setInferenceHistory(prev => [...prev, { state: result.state, timestamp: Date.now() }]);
      
    } catch (error) {
      console.error("Prediction failed", error);
    } finally {
      setIsPredicting(false);
    }
  };

  // Calculated aggregated stats
  const totalSamples = data.length + inferenceHistory.length;
  const drowsyCount = data.filter(d => d.label === State.DROWSY).length + 
                    inferenceHistory.filter(h => h.state === State.DROWSY).length;
  const alertCount = data.filter(d => d.label === State.ALERT).length + 
                   inferenceHistory.filter(h => h.state === State.ALERT).length;

  useEffect(() => {
    loadDataset();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-900/40">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight">NeuroGuard</h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Research Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4 text-sm font-medium">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('lab')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'lab' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Activity size={18} />
            <span>Signal Lab</span>
          </button>
          <button 
            onClick={() => setActiveTab('model')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'model' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings2 size={18} />
            <span>Analysis</span>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="bg-slate-800/40 p-4 rounded-xl space-y-2 border border-slate-700/30">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Database Source</p>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <FileSpreadsheet size={14} />
              <span>GSR-STROOP-S2024</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">Session:</span>
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
              {activeTab === 'dashboard' && 'Biomedical Dataset & Predictor'}
              {activeTab === 'lab' && 'Physiological Waveforms'}
              {activeTab === 'model' && 'Model Diagnostics'}
            </h2>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={loadDataset}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold text-slate-600"
            >
              <Database size={14} />
              Refresh Dataset
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto w-full">
            
            {activeTab === 'dashboard' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2">
                {/* Real-time Predictor Section at the Top */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-600" size={24} />
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Real-time Inference Engine</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Input Card */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                            <Activity size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Input Parameters</h3>
                            <p className="text-sm text-slate-400">Specify physiological features</p>
                          </div>
                        </div>

                        <form onSubmit={handlePredict} className="space-y-6">
                          <div className="space-y-4">
                            <div className="group">
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Stroop Reaction Time (ms)
                              </label>
                              <input 
                                type="number"
                                value={formInputs.rtMs}
                                onChange={(e) => setFormInputs({...formInputs, rtMs: Number(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="e.g. 950"
                              />
                            </div>
                            <div className="group">
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                GSR Mean Conductance (µS)
                              </label>
                              <input 
                                type="number"
                                step="0.01"
                                value={formInputs.gsrMean}
                                onChange={(e) => setFormInputs({...formInputs, gsrMean: Number(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="e.g. 1.85"
                              />
                            </div>
                            <div className="group">
                              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Phasic SCR Peak Count
                              </label>
                              <input 
                                type="number"
                                value={formInputs.peakCount}
                                onChange={(e) => setFormInputs({...formInputs, peakCount: Number(e.target.value)})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                placeholder="e.g. 3"
                              />
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={isPredicting}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 disabled:opacity-50"
                          >
                            {isPredicting ? (
                              <>
                                <Loader2 className="animate-spin" size={20} />
                                Analyzing Signals...
                              </>
                            ) : (
                              <>
                                Run Inference Engine
                                <ChevronRight size={20} />
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Result Column */}
                    <div className="lg:col-span-7">
                      {predictionResult ? (
                        <div className="space-y-6">
                          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                            <div className="flex items-center justify-between mb-10">
                              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Classification Output</span>
                              <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Inference ID: #RT-{Math.floor(Math.random() * 9000 + 1000)}
                              </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-10">
                              <div className={`w-48 h-48 rounded-full flex items-center justify-center border-8 shadow-inner ${
                                predictionResult.state === State.ALERT ? 'border-emerald-50 bg-emerald-50/30' : 'border-rose-50 bg-rose-50/30'
                              }`}>
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-tighter">Subject State</p>
                                  <p className={`text-4xl font-black tracking-tight ${
                                    predictionResult.state === State.ALERT ? 'text-emerald-500' : 'text-rose-500'
                                  }`}>
                                    {predictionResult.state.toUpperCase()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex-1 space-y-6 w-full">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-700">Inference Confidence</span>
                                    <span className="text-sm font-black text-blue-600">{(predictionResult.confidence * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-600 transition-all duration-1000 ease-out rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                                      style={{ width: `${predictionResult.confidence * 100}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                      {predictionResult.state === State.ALERT ? (
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                      ) : (
                                        <ShieldAlert size={16} className="text-rose-500" />
                                      )}
                                      <span className="text-sm font-bold text-slate-700">
                                        {predictionResult.state === State.ALERT ? 'Operating Normal' : 'Critical Warning'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reliability</p>
                                    <span className="text-sm font-bold text-slate-700">High Resolution</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-slate-100">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                  <Brain size={16} />
                                </div>
                                <h4 className="font-bold text-slate-800">Biomedical Interpretation</h4>
                              </div>
                              <div className="bg-indigo-50/50 p-6 rounded-[1.5rem] border border-indigo-100/50">
                                <p className="text-slate-600 text-sm leading-relaxed italic">
                                  "{predictionResult.commentary}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white/40 border-4 border-dashed border-slate-200 rounded-[3rem]">
                          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                            <Zap size={40} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-400 mb-2">Awaiting Analysis</h3>
                          <p className="text-slate-400 text-sm max-w-xs">Enter subject parameters on the left and run the engine to see the classification result.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-12">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden ring-1 ring-slate-100">
                    <div className="max-w-3xl">
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">Research Overview</span>
                      <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Dataset: GSR & Stroop Trials</h3>
                      <p className="text-slate-600 leading-relaxed mb-6">
                        Analyzing synced <strong>Galvanic Skin Response (GSR)</strong> and <strong>Stroop Test</strong> reaction times. 
                        The model identifies patterns of physiological arousal drop and cognitive inhibition latency that precede microsleep.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <h4 className="font-bold text-sm text-slate-800 mb-2">Physiological Markers</h4>
                          <ul className="text-xs text-slate-500 space-y-2">
                            <li className="italic">• Skin Conductance Level (Tonic)</li>
                            <li className="italic">• Phasic Peaks per Window</li>
                          </ul>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <h4 className="font-bold text-sm text-slate-800 mb-2">Behavioral Markers</h4>
                          <ul className="text-xs text-slate-500 space-y-2">
                            <li className="italic">• Reaction Time (Inhibition Delay)</li>
                            <li className="italic">• Error Rates per Condition</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Samples Analyzed', value: totalSamples, color: 'text-slate-900' },
                    { label: 'Drowsy Instances', value: drowsyCount, color: 'text-rose-500' },
                    { label: 'Alert Instances', value: alertCount, color: 'text-emerald-500' },
                    { label: 'Confidence Score', value: metrics ? `${(metrics.accuracy * 100).toFixed(1)}%` : '--', color: 'text-blue-600' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:-translate-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{stat.label}</p>
                      <p className={`text-4xl font-bold transition-all duration-300 ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <Database className="text-blue-500" size={20} />
                    Dataset Preview (First 10 Trials)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                          <th className="pb-4">Trial #</th>
                          <th className="pb-4">Reaction Time (s)</th>
                          <th className="pb-4">GSR Tonic Mean</th>
                          <th className="pb-4">Phasic Peaks</th>
                          <th className="pb-4">ML Label</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {data.slice(0, 10).map((point) => (
                          <tr key={point.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-4 text-slate-400 font-mono group-hover:text-blue-600">00{point.id}</td>
                            <td className="py-4">{point.stroopTime.toFixed(3)}</td>
                            <td className="py-4">{point.features?.mean.toFixed(4)} <span className="text-slate-300 ml-1 underline decoration-dotted">µS</span></td>
                            <td className="py-4">{point.features?.peakCount}</td>
                            <td className="py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ring-1 ring-inset ${point.label === State.ALERT ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-rose-100'}`}>
                                {point.label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lab' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[550px]">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">Signal Visualization</h3>
                      <p className="text-xs text-slate-400">Viewing Phasic activity during the Stroop response window.</p>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data[0]?.gsrHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="timestamp" hide />
                          <YAxis domain={['auto', 'auto']} tick={{fontSize: 10}} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={1000} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-slate-300 p-8 rounded-3xl border border-slate-800 shadow-xl overflow-y-auto h-[550px]">
                    <h3 className="text-xl font-bold text-white mb-6">Expert Methodology</h3>
                    <div className="space-y-8">
                      {[
                        { title: 'Temporal Windowing', desc: 'Syncing 5000ms GSR windows to trial completion triggers.' },
                        { title: 'Peak Detection', desc: 'Implementing heuristic derivation for Skin Conductance Responses (SCR).' },
                        { title: 'Label Verification', desc: 'Ground truth derived from RT thresholds > 1.1s and incorrect responses.' },
                        { title: 'Artifact Handling', desc: 'Removing signal drift using moving-average baseline estimation.' }
                      ].map((step, idx) => (
                        <div key={idx} className="flex gap-5 group">
                          <div className="flex-none w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-black text-sm group-hover:bg-blue-500 group-hover:text-white transition-all">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm mb-1">{step.title}</h4>
                            <p className="text-xs leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'model' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {!metrics && !isTraining ? (
                  <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="bg-slate-50 p-6 rounded-full mb-4">
                      <Settings2 className="text-slate-300 w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Needed</h3>
                    <p className="text-slate-500 mb-8 text-sm">Run the diagnostic analysis to evaluate the CSV dataset.</p>
                    <button 
                      onClick={runTraining}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-200 active:scale-95"
                    >
                      Launch Analysis Engine
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Confusion Matrix Metrics</h3>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                              { subject: 'Accuracy', value: (metrics?.accuracy || 0) * 100 },
                              { subject: 'Precision', value: (metrics?.precision || 0) * 100 },
                              { subject: 'Recall', value: (metrics?.recall || 0) * 100 },
                              { subject: 'F1 Score', value: (metrics?.f1 || 0) * 100 }
                            ]}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontWeight: 600, fontSize: 12}} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                              <Radar name="Classifier" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.15} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Relative Feature Weight</h3>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={importances} layout="vertical" margin={{ left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                              <Tooltip cursor={{fill: '#f8fafc'}} />
                              <Bar dataKey="importance" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm ring-1 ring-blue-50">
                      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                          <div className="p-2 bg-blue-600 rounded-lg text-white"><Brain size={18} /></div>
                          AI Research Perspective
                        </h3>
                        <button 
                          onClick={getGeminiAnalysis}
                          disabled={isAnalyzing}
                          className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg disabled:opacity-50 transition-all active:scale-95"
                        >
                          {isAnalyzing ? 'Processing...' : 'Generate New Insight'}
                        </button>
                      </div>

                      {expertAnalysis ? (
                        <div className="prose prose-slate max-w-none text-slate-600 font-medium">
                           <div className="whitespace-pre-wrap leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">{expertAnalysis}</div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-20 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                          <AlertCircle className="text-slate-300 mb-3" size={40} />
                          <p className="text-slate-500 font-semibold">Requesting interpretation from Gemini LLM...</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;