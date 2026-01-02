import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import { MODULES } from './constants';
import { 
  generateProductVision, 
  generateObjectives, 
  generateBacklog, 
  generateEstimates, 
  generateTeamStructure, 
  generateKPIDecomposition,
  generateObeyaRendering,
  generateRoadmapMVP
} from './services/gemini';

interface Task {
  id: string;
  storyId: string;
  title: string;
  assignedTo: string;
  status: 'todo' | 'doing' | 'done';
}

interface UserStory {
  id: string;
  text: string;
}

const App: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0].id); // Start with Mindset

  // Store per il contesto a cascata
  const [storedVision, setStoredVision] = useState<string>('');
  const [storedObjectives, setStoredObjectives] = useState<string>('');
  const [storedBacklog, setStoredBacklog] = useState<string>('');
  
  // State per editing utente nei vari step
  const [editableVision, setEditableVision] = useState<string>('');
  const [editableStrategicContext, setEditableStrategicContext] = useState<string>('');
  const [editableBacklogContext, setEditableBacklogContext] = useState<string>('');
  
  // Mindset Adherence State
  const [mindsetAdherence, setMindsetAdherence] = useState<Record<string, boolean>>({
    values: false,
    roles: false,
    empirical: false,
    iterative: false
  });

  // Sprint & Session states
  const [sprintStatus, setSprintStatus] = useState<'planning' | 'active' | 'daily'>('planning');
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [sprintStories, setSprintStories] = useState<UserStory[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<Record<string, number>>({
    "Marco (PO)": 0, "Sara (SM)": 0, "Luca (Dev)": 0, "Elena (Dev)": 0, "Giorgio (Dev)": 0
  });
  const [impediments, setImpediments] = useState<string[]>([]);
  const [teamMoods, setTeamMoods] = useState<Record<string, string>>({});
  const [sessionTimer, setSessionTimer] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionInterval = useRef<number | null>(null);

  // Obeya Section State
  const [obeyaChecklist, setObeyaChecklist] = useState<string[]>([
    "Product Vision Board", "Strategic Objectives (OKRs)", "KPI Dashboard", 
    "Team Structure & Roles", "Product Backlog", "Kanban / Sprint Board",
    "Impediment List", "Team Agreement", "Sprint Burndown Chart"
  ]);
  const [selectedObeyaItems, setSelectedObeyaItems] = useState<string[]>([]);
  const [roomImage, setRoomImage] = useState<string | null>(null);

  // Vision Inputs - Generic Default Values
  const [visionData, setVisionData] = useState({
    productName: 'Nome Prodotto...',
    target: 'Target di riferimento...',
    problem: 'Problema da risolvere...',
    currentSolution: 'Alternative attuali...',
    differentiation: 'Vantaggio competitivo...'
  });

  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeModule = MODULES.find(m => m.id === activeModuleId) || MODULES[0];

  const formatSessionTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (activeModuleId === 'f2' && storedVision) setEditableVision(storedVision);
  }, [activeModuleId, storedVision]);

  useEffect(() => {
    if (isSessionActive && sessionTimer > 0) {
      sessionInterval.current = window.setInterval(() => {
        setSessionTimer(s => s - 1);
      }, 1000);
    } else if (sessionTimer === 0) {
      setIsSessionActive(false);
    }
    return () => {
      if (sessionInterval.current) clearInterval(sessionInterval.current);
    };
  }, [isSessionActive, sessionTimer]);

  const handleSelectModule = (id: string) => {
    setActiveModuleId(id);
    setGeneratedOutput('');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    let result = '';
    try {
      if (activeModuleId === 'f1') result = await generateProductVision(visionData);
      else if (activeModuleId === 'f2') result = await generateObjectives({ deadline: 'Dicembre 2025' }, editableVision || storedVision);
      else if (activeModuleId === 'f6') result = await generateBacklog(editableStrategicContext || storedObjectives);
      // ... rest of generative logic is implied to be similar or expandable
    } catch (e) {
      result = "<p class='text-red-500'>Errore AI</p>";
    }
    setGeneratedOutput(result);
    setIsGenerating(false);
  };

  return (
    <div className="flex h-screen bg-[#4B4E54] overflow-hidden">
      <Sidebar activeModuleId={activeModuleId} onSelectModule={handleSelectModule} />

      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#FDFDFD]">
        <div className="max-w-7xl mx-auto p-12 pb-32">
          
          <header className="flex justify-between items-start mb-16 gap-12">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-6">
                <span className="bg-[#FF5A79] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">
                  Fase {activeModule.id.replace('f', '')}
                </span>
                <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Learning Hub</span>
              </div>
              
              <h1 className="text-7xl font-black text-slate-900 leading-[0.85] uppercase tracking-tighter mb-8 italic">
                {activeModule.title.split('. ')[1]}
              </h1>
              <div className="h-1.5 w-20 bg-[#FF5A79] mb-8 rounded-full"></div>
              <p className="text-xl text-slate-500 font-semibold leading-tight max-w-2xl">{activeModule.tagline}</p>
            </div>
            <div className="shrink-0 pt-2"><Timer /></div>
          </header>

          <div className="space-y-20">
            {activeModuleId === 'f0' ? (
              <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Intro Section */}
                <section className="bg-slate-900 rounded-[64px] p-16 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5A79]/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <div className="relative z-10 max-w-3xl">
                    <h2 className="text-4xl font-black mb-8 italic uppercase tracking-tighter">Perché partire dal Mindset?</h2>
                    <p className="text-xl text-gray-300 leading-relaxed font-medium mb-12">
                      L'Agile non è solo un processo, è un <span className="text-[#FF5A79] font-black underline decoration-2 underline-offset-8">modo di pensare</span>. 
                      Prima di definire cosa fare (il prodotto), dobbiamo definire come lavorare insieme.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <span className="text-2xl mb-4 block">📖</span>
                        <p className="text-xs font-bold leading-tight text-gray-400">Leggi i valori del Manifesto Agile per allineare il team.</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <span className="text-2xl mb-4 block">👥</span>
                        <p className="text-xs font-bold leading-tight text-gray-400">Studia i ruoli di Scrum: PO, SM e Dev Team.</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <span className="text-2xl mb-4 block">✅</span>
                        <p className="text-xs font-bold leading-tight text-gray-400">Conferma la tua adesione ai principi in basso.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Waterfall vs Agile Comparison */}
                <section>
                  <div className="text-center mb-16">
                    <h3 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.5em] mb-4">La Grande Differenza</h3>
                    <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Waterfall vs Agile</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Waterfall Card */}
                    <div className="bg-slate-100 rounded-[48px] p-12 border border-slate-200">
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="w-12 h-12 bg-slate-300 rounded-2xl flex items-center justify-center text-slate-600 font-black">W</div>
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-slate-600">Waterfall (Tradizionale)</h4>
                      </div>
                      <ul className="space-y-6 mb-12">
                        <li className="flex items-start space-x-4">
                          <span className="text-slate-400 font-bold mt-1">01</span>
                          <div>
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Approccio Rigido</p>
                            <p className="text-sm text-slate-500 font-medium">Pianificazione completa e tutto definito prima di iniziare.</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-4">
                          <span className="text-slate-400 font-bold mt-1">02</span>
                          <div>
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Fasi Sequenziali</p>
                            <p className="text-sm text-slate-500 font-medium">Analisi → Design → Sviluppo → Test. Feedback solo alla fine.</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-4">
                          <span className="text-slate-400 font-bold mt-1">03</span>
                          <div>
                            <p className="font-black text-slate-800 uppercase text-xs tracking-widest mb-1">Consegna Unica</p>
                            <p className="text-sm text-slate-500 font-medium">Tutto o niente al termine di un lungo ciclo di sviluppo.</p>
                          </div>
                        </li>
                      </ul>
                      <div className="bg-white rounded-3xl p-8 border border-slate-200">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Flusso Lineare</p>
                         <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                            <span className="bg-slate-100 px-3 py-2 rounded-lg">Requisiti</span>
                            <span className="text-slate-300">→</span>
                            <span className="bg-slate-100 px-3 py-2 rounded-lg">Design</span>
                            <span className="text-slate-300">→</span>
                            <span className="bg-slate-100 px-3 py-2 rounded-lg">Dev</span>
                            <span className="text-slate-300">→</span>
                            <span className="bg-slate-100 px-3 py-2 rounded-lg">Test</span>
                         </div>
                      </div>
                    </div>

                    {/* Agile Card */}
                    <div className="bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#FF5A79]/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="w-12 h-12 bg-[#FF5A79] rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-[#FF5A79]/40">A</div>
                        <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white">Agile (Iterativo)</h4>
                      </div>
                      <ul className="space-y-6 mb-12">
                        <li className="flex items-start space-x-4">
                          <span className="text-[#FF5A79] font-bold mt-1">01</span>
                          <div>
                            <p className="font-black text-white uppercase text-xs tracking-widest mb-1">Approccio Flessibile</p>
                            <p className="text-sm text-gray-400 font-medium">Pianificazione progressiva a breve termine (Sprint).</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-4">
                          <span className="text-[#FF5A79] font-bold mt-1">02</span>
                          <div>
                            <p className="font-black text-white uppercase text-xs tracking-widest mb-1">Iterazioni Continue</p>
                            <p className="text-sm text-gray-400 font-medium">Cicli di 2-4 settimane con feedback costante e valore tangibile.</p>
                          </div>
                        </li>
                        <li className="flex items-start space-x-4">
                          <span className="text-[#FF5A79] font-bold mt-1">03</span>
                          <div>
                            <p className="font-black text-white uppercase text-xs tracking-widest mb-1">Consegne Incrementali</p>
                            <p className="text-sm text-gray-400 font-medium">Valore consegnato e validato ad ogni singolo Sprint.</p>
                          </div>
                        </li>
                      </ul>
                      <div className="bg-white/5 rounded-3xl p-8 border border-white/10 relative">
                         <p className="text-[9px] font-black text-[#FF5A79] uppercase tracking-widest mb-6">Ciclo Iterativo</p>
                         <div className="flex justify-center">
                            <div className="w-24 h-24 border-4 border-dashed border-[#FF5A79] rounded-full flex items-center justify-center animate-spin-slow">
                               <span className="font-black text-xs uppercase tracking-tighter">Sprint</span>
                            </div>
                         </div>
                         <div className="absolute right-8 top-1/2 -translate-y-1/2">
                            <div className="bg-[#FF5A79] px-4 py-2 rounded-xl text-[10px] font-black uppercase">Incremento</div>
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Scrum Framework Infographic */}
                <section className="space-y-16">
                  <div className="max-w-4xl">
                    <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">Il Framework Scrum</h2>
                    <p className="text-lg text-slate-500 font-medium">Nasce nel 1995 da Ken Schwaber e Jeff Sutherland per gestire progetti complessi dove i requisiti cambiano frequentemente. Scrum si basa sul <span className="text-slate-900 font-bold italic">Processo Empirico</span>.</p>
                  </div>

                  {/* Pillars & Values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-100 rounded-[48px] p-12 border border-slate-200">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10">🔬 Pilastri dell'Empirismo</h4>
                      <div className="space-y-8">
                        {[
                          { icon: '👁️', title: 'Trasparenza', desc: 'Tutti vedono cosa sta succedendo. Niente è nascosto.' },
                          { icon: '🔍', title: 'Ispezione', desc: 'Si controlla regolarmente il progresso e i risultati.' },
                          { icon: '🔄', title: 'Adattamento', desc: 'Si corregge la rotta in base a ciò che si osserva.' },
                        ].map(p => (
                          <div key={p.title} className="flex items-center space-x-6">
                            <span className="text-3xl bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm">{p.icon}</span>
                            <div>
                              <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{p.title}</p>
                              <p className="text-xs text-slate-500 font-semibold">{p.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#FF5A79] rounded-[48px] p-12 text-white shadow-2xl shadow-[#FF5A79]/20">
                      <h4 className="text-[10px] font-black text-white/60 uppercase tracking-[0.4em] mb-10">💎 I 5 Valori di Scrum</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { icon: '🎯', title: 'Impegno', desc: 'Il team si impegna a raggiungere gli obiettivi' },
                          { icon: '🦁', title: 'Coraggio', desc: 'Affrontare problemi difficili e dire la verità' },
                          { icon: '🔭', title: 'Focus', desc: 'Concentrarsi sul lavoro dello Sprint' },
                          { icon: '🤝', title: 'Apertura', desc: 'Trasparenza su lavoro e sfide' },
                          { icon: '🙏', title: 'Rispetto', desc: 'Rispetto reciproco tra membri del team' }
                        ].map(v => (
                          <div key={v.title} className="bg-white/10 p-4 rounded-2xl border border-white/20 flex items-center space-x-4">
                            <span className="text-2xl">{v.icon}</span>
                            <div>
                              <p className="font-black text-white uppercase text-xs tracking-tight">{v.title}</p>
                              <p className="text-[10px] text-white/80 font-medium">{v.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Roles Table */}
                <section>
                  <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-12">👥 I Ruoli di Scrum</h3>
                  <div className="overflow-hidden rounded-[40px] border border-slate-200 shadow-xl bg-white">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-8 font-black uppercase text-xs tracking-widest italic">Ruolo</th>
                          <th className="p-8 font-black uppercase text-xs tracking-widest italic">Responsabilità</th>
                          <th className="p-8 font-black uppercase text-xs tracking-widest italic">NON è...</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-8 align-top">
                            <span className="inline-block bg-[#FF5A79] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase mb-2">Product Owner</span>
                            <p className="font-bold text-slate-800 italic">Massimizza il valore del prodotto.</p>
                          </td>
                          <td className="p-8 text-sm text-slate-600 font-medium align-top">Gestisce e prioritizza il Product Backlog. È la voce del cliente e del business.</td>
                          <td className="p-8 text-sm text-slate-400 italic align-top">Un project manager tradizionale. Non assegna task operativi al team.</td>
                        </tr>
                        <tr>
                          <td className="p-8 align-top">
                            <span className="inline-block bg-slate-800 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase mb-2">Scrum Master</span>
                            <p className="font-bold text-slate-800 italic">Facilita il processo Scrum.</p>
                          </td>
                          <td className="p-8 text-sm text-slate-600 font-medium align-top">Rimuove impedimenti. Aiuta il team a migliorare costantemente l'efficienza.</td>
                          <td className="p-8 text-sm text-slate-400 italic align-top">Un capo. Non dà ordini diretti ma serve il team (Servant Leader).</td>
                        </tr>
                        <tr>
                          <td className="p-8 align-top">
                            <span className="inline-block bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase mb-2">Dev Team</span>
                            <p className="font-bold text-slate-800 italic">Realizza l'incremento "Done".</p>
                          </td>
                          <td className="p-8 text-sm text-slate-600 font-medium align-top">Auto-organizzato e cross-funzionale. Decide COME fare il lavoro tecnico.</td>
                          <td className="p-8 text-sm text-slate-400 italic align-top">Un gruppo di meri esecutori. Sono responsabili della qualità tecnica.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Events & Artefacts Visualized */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="bg-slate-900 rounded-[48px] p-12 text-white overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#FF5A79]"></div>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-10">📅 Cerimonie (Eventi)</h3>
                      <div className="space-y-4">
                        {[
                          { time: '8h max', title: 'Sprint Planning', desc: 'Si decide COSA fare e COME farlo nello Sprint.' },
                          { time: '15 min', title: 'Daily Scrum', desc: 'Sincronizzazione quotidiana: fatto, farò, blocchi.' },
                          { time: '4h max', title: 'Sprint Review', desc: 'Demo agli stakeholder e raccolta feedback.' },
                          { time: '3h max', title: 'Retrospective', desc: 'Riflessione del team per migliorare il processo.' }
                        ].map(ev => (
                          <div key={ev.title} className="bg-white/5 p-6 rounded-3xl border border-white/10 group hover:bg-white/10 transition-all">
                             <div className="flex justify-between items-center mb-2">
                                <h5 className="font-black uppercase text-sm tracking-tight text-[#FF5A79]">{ev.title}</h5>
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">{ev.time}</span>
                             </div>
                             <p className="text-xs text-gray-400 font-medium">{ev.desc}</p>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-slate-100 rounded-[48px] p-12 border border-slate-200">
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800 mb-10">📋 Artefatti Scrum</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                           <div className="flex items-center space-x-4 mb-3">
                              <span className="text-2xl">📚</span>
                              <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Product Backlog</p>
                           </div>
                           <p className="text-xs text-slate-500 font-medium">Lista ordinata di tutto ciò che serve nel prodotto. Sempre in evoluzione.</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                           <div className="flex items-center space-x-4 mb-3">
                              <span className="text-2xl">📝</span>
                              <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Sprint Backlog</p>
                           </div>
                           <p className="text-xs text-slate-500 font-medium">Sottinsieme del Backlog scelto per lo Sprint + il piano per consegnarlo.</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                           <div className="flex items-center space-x-4 mb-3">
                              <span className="text-2xl">📦</span>
                              <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Incremento</p>
                           </div>
                           <p className="text-xs text-slate-500 font-medium">Somma degli elementi "Done" utilizzabili completati durante lo Sprint.</p>
                        </div>
                      </div>
                   </div>
                </section>

                {/* Beyond Software Section */}
                <section className="bg-slate-50 rounded-[64px] p-16 border border-slate-200">
                  <div className="max-w-4xl mb-16">
                    <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">⚠️ Il "Valore" Oltre il Software</h3>
                    <p className="text-lg text-slate-500 font-medium">Agile è nato nel software, ma è applicabile ovunque. L'obiettivo non è "rilasciare codice" ma <span className="text-slate-900 font-bold">ridurre il rischio</span> validando ipotesi frequentemente.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-lg">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-8 border border-blue-500/20">
                         <span className="text-2xl">🔧</span>
                      </div>
                      <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-slate-800">Hardware</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 italic">S1: Schema validato. S2: PCB prototipo. S3: Involucro 3D.</p>
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Focus: Prototipazione</p>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-lg">
                      <div className="w-16 h-16 bg-[#FF5A79]/10 rounded-2xl flex items-center justify-center text-[#FF5A79] mb-8 border border-[#FF5A79]/20">
                         <span className="text-2xl">🏗️</span>
                      </div>
                      <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-slate-800">Edilizia</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 italic">S1: Concept approvato. S2: Modello 3D. S3: Permessi ottenuti.</p>
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-[#FF5A79] uppercase tracking-widest">Focus: Validazione Design</p>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-lg">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-8 border border-amber-500/20">
                         <span className="text-2xl">🎪</span>
                      </div>
                      <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-slate-800">Eventi</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 italic">S1: Draft. S2: Materiali validati. S3: Pilota gruppo test.</p>
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Focus: Feedback Utente</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Adherence Checkboxes */}
                <section className="bg-slate-900 rounded-[64px] p-16 text-white shadow-2xl">
                  <div className="text-center max-w-2xl mx-auto mb-16">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-6 italic">Il Tuo Impegno Agile</h3>
                    <p className="text-gray-400 font-medium">Conferma di aver compreso e di voler applicare questi principi nel tuo workshop.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {[
                      { key: 'values', title: 'Valori e Manifesto', desc: 'Mi impegno a dare priorità a Individui e Interazioni.' },
                      { key: 'roles', title: 'Chiarezza dei Ruoli', desc: 'Riconosco l\'autonomia del team nel decidere COME lavorare.' },
                      { key: 'empirical', title: 'Empirismo Attivo', desc: 'Userò ispezione e adattamento per migliorare i risultati.' },
                      { key: 'iterative', title: 'Ciclo Iterativo', desc: 'Pianificherò per Sprint e rilascerò valore incrementale.' }
                    ].map(principle => (
                      <button 
                        key={principle.key}
                        onClick={() => setMindsetAdherence(prev => ({...prev, [principle.key]: !prev[principle.key]}))}
                        className={`flex items-start space-x-6 p-8 rounded-[32px] transition-all border text-left group ${
                          mindsetAdherence[principle.key] 
                            ? 'bg-[#FF5A79] border-[#FF5A79] shadow-xl shadow-[#FF5A79]/20' 
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl border-2 shrink-0 mt-1 flex items-center justify-center transition-colors ${
                          mindsetAdherence[principle.key] ? 'border-white bg-white text-[#FF5A79]' : 'border-white/20'
                        }`}>
                          {mindsetAdherence[principle.key] && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <div>
                          <h5 className="font-black uppercase text-sm mb-2 italic tracking-tight">{principle.title}</h5>
                          <p className={`text-xs font-medium leading-relaxed ${mindsetAdherence[principle.key] ? 'text-white/80' : 'text-gray-500'}`}>
                            {principle.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {Object.values(mindsetAdherence).every(v => v) && (
                    <div className="mt-16 text-center animate-bounce">
                      <p className="text-[#FF5A79] font-black uppercase text-sm tracking-[0.3em]">Complimenti! Il tuo mindset è pronto per la fase successiva 🚀</p>
                    </div>
                  )}
                </section>

              </div>
            ) : activeModuleId === 'f9' ? (
              <div className="space-y-12">
                {/* Sprint Navigation & Session Timers */}
                <div className="flex items-center justify-between bg-slate-900 rounded-[32px] p-8 text-white">
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setSprintStatus('planning')}
                      className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${sprintStatus === 'planning' ? 'bg-[#FF5A79]' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      1. Sprint Planning
                    </button>
                    <button 
                      onClick={() => setSprintStatus('active')}
                      className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${sprintStatus === 'active' ? 'bg-[#FF5A79]' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      2. Kanban Board
                    </button>
                    <button 
                      onClick={() => setSprintStatus('daily')}
                      className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${sprintStatus === 'daily' ? 'bg-[#FF5A79]' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      3. Daily Scrum
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {isSessionActive && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-[#FF5A79] uppercase tracking-widest">Timebox Sessione</span>
                        <span className="text-3xl font-mono font-black">{formatSessionTime(sessionTimer)}</span>
                      </div>
                    )}
                    {sprintStatus === 'planning' && (
                      <button onClick={() => setIsSessionActive(true)} className="bg-[#E67E22] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Avvia Sessione</button>
                    )}
                  </div>
                </div>

                {/* SPRINT PLANNING VIEW */}
                {sprintStatus === 'planning' && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 space-y-8">
                      <div className="bg-slate-100 rounded-[48px] p-10 border border-slate-200">
                        <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-black uppercase italic italic tracking-tighter">Decomposizione User Stories</h3>
                          <button className="text-[9px] font-black text-[#FF5A79] uppercase border-b-2 border-[#FF5A79] pb-1">Importa Backlog</button>
                        </div>
                        {/* Mock stories */}
                        <div className="space-y-6">
                          {[
                            { id: 'US1', text: 'Come utente voglio registrarmi per accedere ai servizi' },
                            { id: 'US2', text: 'Come admin voglio gestire gli utenti per la sicurezza' }
                          ].map(story => (
                            <div key={story.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
                               <p className="font-black text-slate-800">{story.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Standard Module View */}
                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border border-white/5">
                  <h3 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.4em] mb-12">Conoscenze Fondamentali</h3>
                  <div className="bg-[#111318]/40 rounded-[24px] p-8 border border-white/5">
                    <div className="flex items-start space-x-5 mb-8">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black mb-3 italic">{activeModule.title.split('. ')[1]}</h3>
                        <p className="text-gray-300 leading-relaxed font-medium">{activeModule.description}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Lab Section */}
                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border border-white/5">
                  <h3 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.4em] mb-12">Laboratorio Pratico</h3>
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-5 space-y-6">
                      {/* Logic based on Module ID */}
                      <div className="space-y-4">
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Inserisci Dati</label>
                        <textarea rows={6} className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-sm focus:border-[#FF5A79] outline-none text-gray-300 transition-all resize-none"/>
                      </div>
                      <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-3 shadow-xl disabled:opacity-50">
                        <span>{isGenerating ? 'ELABORAZIONE...' : `✨ GENERA OUTPUT CON AI`}</span>
                      </button>
                    </div>

                    <div className="col-span-7 bg-[#0D0F14] rounded-[40px] p-10 border border-white/10 flex flex-col min-h-[500px] shadow-inner">
                      <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black italic tracking-tight text-[#FF5A79]">Agile Advisor Output</h3>
                        <div className="flex space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        {generatedOutput ? (
                          <div className="vision-output prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: generatedOutput }} />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-10">
                            <div className="text-9xl mb-8">🚀</div>
                            <p className="font-black uppercase tracking-[0.5em] text-[10px] text-white">Pronto per l'elaborazione</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;