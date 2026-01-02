
import { GoogleGenAI } from "@google/genai";
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
  const [activeModuleId, setActiveModuleId] = useState(MODULES[1].id); 

  // Store per il contesto a cascata
  const [storedVision, setStoredVision] = useState<string>('');
  const [storedObjectives, setStoredObjectives] = useState<string>('');
  const [storedBacklog, setStoredBacklog] = useState<string>('');
  
  // State per editing utente nei vari step
  const [editableVision, setEditableVision] = useState<string>('');
  const [editableStrategicContext, setEditableStrategicContext] = useState<string>('');
  const [editableBacklogContext, setEditableBacklogContext] = useState<string>('');
  
  // State specifico per la sezione Team, KPI, Obeya, Roadmap
  const [teamStrategicInput, setTeamStrategicInput] = useState<string>('');
  const [teamBacklogInput, setTeamBacklogInput] = useState<string>('');
  const [kpiStrategicInput, setKpiStrategicInput] = useState<string>('');
  const [roadmapStrategicInput, setRoadmapStrategicInput] = useState<string>('');
  const [roadmapBacklogInput, setRoadmapBacklogInput] = useState<string>('');

  // SPRINT State
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
  const [renderedObeya, setRenderedObeya] = useState<string | null>(null);

  // Interactive Mindset State
  const [adherence, setAdherence] = useState<Record<string, boolean>>({});

  // States per Inputs Modulo 1 (Vision)
  const [visionData, setVisionData] = useState({
    productName: 'AGILE.IT',
    target: 'Manager aziendali',
    problem: 'Aiutare i team a lavorare agile nell\'era del AI',
    currentSolution: 'Oggi usa solo chatGPT',
    differentiation: 'Nessuno ha una interfaccia semplice e intuitiva per lavorare agile concretamente registrando tutti gli sprint'
  });

  // States per Inputs Modulo 2 (Obiettivi)
  const [objectivesData, setObjectivesData] = useState({
    deadline: 'Dicembre 2025'
  });

  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeModule = MODULES.find(m => m.id === activeModuleId) || MODULES[0];

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

  const startSession = (minutes: number) => {
    setSessionTimer(minutes * 60);
    setIsSessionActive(true);
  };

  const formatSessionTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleImportStrategy = () => {
    if (storedObjectives) {
      if (activeModuleId === 'f4') setTeamStrategicInput(storedObjectives);
      else if (activeModuleId === 'f3') setKpiStrategicInput(storedObjectives);
      else if (activeModuleId === 'f8') setRoadmapStrategicInput(storedObjectives);
      else setEditableStrategicContext(storedObjectives);
    } else {
      alert("Genera prima gli Obiettivi nella Fase 2.");
    }
  };

  const handleImportBacklog = () => {
    if (storedBacklog) {
      if (activeModuleId === 'f4') setTeamBacklogInput(storedBacklog);
      else if (activeModuleId === 'f8') setRoadmapBacklogInput(storedBacklog);
      else if (activeModuleId === 'f9') {
        // Mock parsing stories from backlog HTML
        setSprintStories([
          { id: 'US1', text: 'Come utente voglio registrarmi per accedere ai servizi' },
          { id: 'US2', text: 'Come admin voglio gestire gli utenti per la sicurezza' },
          { id: 'US3', text: 'Come utente voglio visualizzare il catalogo prodotti' }
        ]);
      }
      else setEditableBacklogContext(storedBacklog);
    } else {
      alert("Genera prima il Backlog nella Fase 6.");
    }
  };

  const addTask = (storyId: string) => {
    const title = prompt("Descrivi il task:");
    if (title) {
      setSprintTasks([...sprintTasks, {
        id: Math.random().toString(36).substr(2, 9),
        storyId,
        title,
        assignedTo: Object.keys(teamAvailability)[0],
        status: 'todo'
      }]);
    }
  };

  const moveTask = (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    setSprintTasks(sprintTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRoomImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    let result = '';
    
    try {
      if (activeModuleId === 'f1') {
        result = await generateProductVision(visionData);
        setStoredVision(result);
      } else if (activeModuleId === 'f2') {
        result = await generateObjectives({ deadline: objectivesData.deadline }, editableVision || storedVision);
        setStoredObjectives(result);
      } else if (activeModuleId === 'f3') {
        result = await generateKPIDecomposition(kpiStrategicInput || storedObjectives);
      } else if (activeModuleId === 'f4') {
        result = await generateTeamStructure({ strategy: teamStrategicInput || storedObjectives, backlog: teamBacklogInput || storedBacklog });
      } else if (activeModuleId === 'f5') {
        if (!roomImage) {
          alert("Carica una foto della stanza per generare il rendering dell'Obeya!");
          setIsGenerating(false);
          return;
        }
        const rendered = await generateObeyaRendering(roomImage, selectedObeyaItems);
        if (rendered) {
          setRenderedObeya(rendered);
          result = `<div class="space-y-6">
            <h3 class="text-xl font-black text-[#FF5A79] uppercase tracking-widest italic">Rendering Obeya AI</h3>
            <img src="${rendered}" alt="Obeya Rendering" class="w-full rounded-[32px] shadow-2xl border border-white/10" />
            <div class="bg-white/5 p-6 rounded-2xl border border-white/5">
              <p class="text-sm text-gray-300">Ecco come potrebbe apparire la tua Obeya basata sulla checklist selezionata.</p>
            </div>
          </div>`;
        }
      } else if (activeModuleId === 'f6') {
        result = await generateBacklog(editableStrategicContext || storedObjectives);
        setStoredBacklog(result);
      } else if (activeModuleId === 'f7') {
        result = await generateEstimates(editableBacklogContext || storedBacklog);
      } else if (activeModuleId === 'f8') {
        result = await generateRoadmapMVP({
          objectives: roadmapStrategicInput || storedObjectives,
          backlog: roadmapBacklogInput || storedBacklog
        });
      } else {
        result = "<p class='text-white p-8 opacity-50 uppercase font-black text-center'>Modulo in fase di sviluppo</p>";
      }
    } catch (e) {
      result = "<p class='text-red-500 uppercase font-black p-8'>Errore durante la connessione all'AI.</p>";
    }

    setGeneratedOutput(result);
    setIsGenerating(false);
  };

  const handleSelectModule = (id: string) => {
    setActiveModuleId(id);
    setGeneratedOutput('');
  };

  const toggleObeyaItem = (item: string) => {
    setSelectedObeyaItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
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
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Workshop Lab</span>
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
            {activeModuleId === 'f9' ? (
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
                      <button onClick={() => startSession(60)} className="bg-[#E67E22] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Avvia Planning (1h)</button>
                    )}
                    {sprintStatus === 'daily' && (
                      <button onClick={() => startSession(15)} className="bg-[#E67E22] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Avvia Daily (15m)</button>
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
                          <button onClick={handleImportBacklog} className="text-[9px] font-black text-[#FF5A79] uppercase border-b-2 border-[#FF5A79] pb-1">Importa Backlog</button>
                        </div>
                        
                        {sprintStories.length === 0 ? (
                          <div className="text-center py-20 border-2 border-dashed border-slate-300 rounded-[32px] opacity-50">
                            <p className="font-black text-xs uppercase text-slate-400">Nessuna storia caricata. Importa il backlog.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {sprintStories.map(story => (
                              <div key={story.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{story.id}</span>
                                  <button onClick={() => addTask(story.id)} className="bg-slate-900 text-white p-2 rounded-xl text-xs hover:bg-[#FF5A79] transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                                  </button>
                                </div>
                                <p className="text-lg font-bold text-slate-800 mb-4">{story.text}</p>
                                <div className="space-y-2">
                                  {sprintTasks.filter(t => t.storyId === story.id).map(task => (
                                    <div key={task.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
                                      <span className="text-sm font-semibold text-slate-600">{task.title}</span>
                                      <select 
                                        value={task.assignedTo} 
                                        onChange={(e) => setSprintTasks(sprintTasks.map(t => t.id === task.id ? {...t, assignedTo: e.target.value} : t))}
                                        className="text-[10px] font-black uppercase bg-transparent border-none outline-none text-[#FF5A79] cursor-pointer"
                                      >
                                        {Object.keys(teamAvailability).map(name => <option key={name} value={name}>{name}</option>)}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-4 space-y-8">
                      <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-200">
                        <h3 className="text-xl font-black uppercase mb-8 italic tracking-tighter">Capacità Team (Ore)</h3>
                        <div className="space-y-6">
                          {Object.entries(teamAvailability).map(([name, hours]) => (
                            <div key={name} className="flex flex-col">
                              <label className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{name}</label>
                              <div className="flex items-center space-x-4">
                                <input 
                                  type="range" min="0" max="80" value={hours} 
                                  onChange={(e) => setTeamAvailability({...teamAvailability, [name]: parseInt(e.target.value)})}
                                  className="flex-1 accent-[#FF5A79]"
                                />
                                <span className="text-lg font-black text-slate-800 w-8">{hours}h</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <button onClick={() => {setSprintStatus('active'); startSession(0);}} className="w-full bg-[#FF5A79] text-white py-8 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                        AVVIA SPRINT 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* KANBAN BOARD VIEW */}
                {(sprintStatus === 'active' || sprintStatus === 'daily') && (
                  <div className="space-y-12">
                    {sprintStatus === 'daily' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4">
                        <div className="bg-[#FF5A79] rounded-[48px] p-10 text-white shadow-2xl">
                          <h3 className="text-2xl font-black uppercase mb-6 italic">Mood del Team</h3>
                          <div className="grid grid-cols-3 gap-4">
                            {Object.keys(teamAvailability).map(name => (
                              <div key={name} className="bg-white/10 p-4 rounded-3xl border border-white/20 text-center">
                                <p className="text-[9px] font-black uppercase mb-3 opacity-70">{name}</p>
                                <div className="flex justify-center space-x-2">
                                  {['😊', '😐', '😤'].map(mood => (
                                    <button 
                                      key={mood} 
                                      onClick={() => setTeamMoods({...teamMoods, [name]: mood})}
                                      className={`text-2xl p-1 rounded-lg transition-all ${teamMoods[name] === mood ? 'bg-white/20 scale-125' : 'opacity-40 hover:opacity-100'}`}
                                    >
                                      {mood}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl">
                          <h3 className="text-2xl font-black uppercase mb-6 italic text-[#E67E22]">Impedimenti / Blocchi</h3>
                          <div className="space-y-3 mb-6">
                            {impediments.map((imp, i) => (
                              <div key={i} className="flex items-center space-x-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <span className="text-red-500 font-bold">●</span>
                                <span className="text-sm font-semibold">{imp}</span>
                                <button onClick={() => setImpediments(impediments.filter((_, idx) => idx !== i))} className="ml-auto opacity-40 hover:opacity-100">✕</button>
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <input 
                              type="text" 
                              placeholder="Nuovo impedimento..." 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                  setImpediments([...impediments, e.currentTarget.value]);
                                  e.currentTarget.value = '';
                                }
                              }}
                              className="flex-1 bg-white/10 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-[#E67E22]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-8">
                      {['todo', 'doing', 'done'].map((status) => (
                        <div key={status} className="bg-slate-100 rounded-[48px] p-8 min-h-[600px] border border-slate-200">
                          <div className="flex items-center justify-between mb-8 px-4">
                            <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-800">
                              {status === 'todo' ? 'To Do' : status === 'doing' ? 'In Progress' : 'Done'}
                            </h4>
                            <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black border border-slate-200">
                              {sprintTasks.filter(t => t.status === status).length}
                            </span>
                          </div>
                          <div className="space-y-4">
                            {sprintTasks.filter(t => t.status === status).map(task => (
                              <div key={task.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                                <span className="text-[8px] font-black text-[#FF5A79] uppercase mb-2 block tracking-widest">{task.storyId}</span>
                                <p className="text-sm font-bold text-slate-700 mb-4 leading-tight">{task.title}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{task.assignedTo}</span>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {status !== 'todo' && <button onClick={() => moveTask(task.id, status === 'done' ? 'doing' : 'todo')} className="p-1.5 hover:bg-slate-100 rounded-lg">←</button>}
                                    {status !== 'done' && <button onClick={() => moveTask(task.id, status === 'todo' ? 'doing' : 'done')} className="p-1.5 hover:bg-slate-100 rounded-lg">→</button>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Visualizzazione Standard per gli altri moduli */}
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

                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border border-white/5">
                  <h3 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.4em] mb-12">Laboratorio Pratico</h3>
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-5 space-y-6">
                      
                      {activeModuleId === 'f1' && (
                        <>
                          {[
                            { label: 'Nome Prodotto', key: 'productName', type: 'input' },
                            { label: 'Target', key: 'target', type: 'input' },
                            { label: 'Problema', key: 'problem', type: 'textarea' },
                            { label: 'Soluzione Attuale', key: 'currentSolution', type: 'textarea' },
                            { label: 'Differenziazione', key: 'differentiation', type: 'textarea' },
                          ].map((field) => (
                            <div key={field.key}>
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{field.label}</label>
                              {field.type === 'input' ? (
                                <input type="text" value={(visionData as any)[field.key]} onChange={(e) => setVisionData({...visionData, [field.key]: e.target.value})} className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-sm focus:border-[#FF5A79] outline-none transition-all"/>
                              ) : (
                                <textarea rows={2} value={(visionData as any)[field.key]} onChange={(e) => setVisionData({...visionData, [field.key]: e.target.value})} className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-sm focus:border-[#FF5A79] outline-none transition-all resize-none"/>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {activeModuleId === 'f2' && (
                        <>
                          <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Review Vision</label>
                            <textarea rows={12} value={editableVision || storedVision} onChange={(e) => setEditableVision(e.target.value)} className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-[11px] font-mono focus:border-[#FF5A79] outline-none transition-all resize-none text-gray-300"/>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Deadline</label>
                            <input type="text" value={objectivesData.deadline} onChange={(e) => setObjectivesData({...objectivesData, deadline: e.target.value})} className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-sm focus:border-[#FF5A79] outline-none transition-all"/>
                          </div>
                        </>
                      )}

                      {activeModuleId === 'f3' && (
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Strategia & Key Results</label>
                              <button onClick={handleImportStrategy} className="text-[8px] font-black text-[#FF5A79] uppercase border border-[#FF5A79]/30 rounded-lg px-2 py-1">Importa Obiettivi</button>
                            </div>
                            <p className="text-xs font-bold text-gray-200 mb-4 px-1 leading-tight">
                              Vuoi scomporre ulteriormente l'obiettivo strategico in sotto-obiettivi e relativi KPI?
                            </p>
                            <textarea rows={12} value={kpiStrategicInput || storedObjectives} onChange={(e) => setKpiStrategicInput(e.target.value)} placeholder="Importa gli obiettivi per generare KPI dettagliati..." className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-6 text-[11px] font-mono focus:border-[#FF5A79] outline-none transition-all resize-none text-gray-300"/>
                          </div>
                        </div>
                      )}

                      {activeModuleId === 'f4' && (
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Obiettivo Strategico</label>
                              <button onClick={handleImportStrategy} className="text-[8px] font-black text-[#FF5A79] uppercase border border-[#FF5A79]/30 rounded-lg px-2 py-1">Importa Obiettivi</button>
                            </div>
                            <textarea rows={6} value={teamStrategicInput || storedObjectives} onChange={(e) => setTeamStrategicInput(e.target.value)} placeholder="Importa o scrivi la strategia qui..." className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:border-[#FF5A79] outline-none text-gray-300"/>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Product Backlog</label>
                              <button onClick={handleImportBacklog} className="text-[8px] font-black text-[#FF5A79] uppercase border border-[#FF5A79]/30 rounded-lg px-2 py-1">Importa Backlog</button>
                            </div>
                            <textarea rows={6} value={teamBacklogInput || storedBacklog} onChange={(e) => setTeamBacklogInput(e.target.value)} placeholder="Importa o scrivi il backlog qui..." className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:border-[#FF5A79] outline-none text-gray-300"/>
                          </div>
                        </div>
                      )}

                      {activeModuleId === 'f5' && (
                        <div className="space-y-8">
                          <div>
                            <h4 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-widest mb-4">Obeya Checklist</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {obeyaChecklist.map(item => (
                                <button key={item} onClick={() => toggleObeyaItem(item)} className={`flex items-center space-x-3 p-3 rounded-xl transition-all border ${selectedObeyaItems.includes(item) ? 'bg-[#FF5A79] border-[#FF5A79] text-white shadow-lg' : 'bg-[#111318]/40 border-white/10 text-gray-400 hover:border-white/20'}`}>
                                  <div className={`w-4 h-4 rounded-full border-2 ${selectedObeyaItems.includes(item) ? 'border-white bg-white' : 'border-white/20'}`}></div>
                                  <span className="text-[10px] font-black uppercase tracking-tight">{item}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeModuleId === 'f6' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Strategia Completa</label>
                            <button onClick={handleImportStrategy} className="text-[9px] font-black text-[#FF5A79] hover:text-white uppercase tracking-widest border border-[#FF5A79]/30 rounded-lg px-3 py-1.5 transition-all bg-[#FF5A79]/5">📥 Importa</button>
                          </div>
                          <textarea rows={18} value={editableStrategicContext || storedObjectives} onChange={(e) => setEditableStrategicContext(e.target.value)} className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-6 text-[11px] font-mono focus:border-[#FF5A79] outline-none transition-all resize-none text-gray-300"/>
                        </div>
                      )}

                      {activeModuleId === 'f7' && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center px-1">
                            <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Backlog User Stories</label>
                            <button onClick={handleImportBacklog} className="text-[9px] font-black text-[#FF5A79] hover:text-white uppercase tracking-widest border border-[#FF5A79]/30 rounded-lg px-3 py-1.5 transition-all bg-[#FF5A79]/5">📥 Importa Backlog</button>
                          </div>
                          <textarea rows={18} value={editableBacklogContext || storedBacklog} onChange={(e) => setEditableBacklogContext(e.target.value)} placeholder="Carica qui le user story per stimarle..." className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-6 text-[11px] font-mono focus:border-[#FF5A79] outline-none transition-all resize-none text-gray-300"/>
                        </div>
                      )}

                      {activeModuleId === 'f8' && (
                        <div className="space-y-6">
                           <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Obiettivi Strategici</label>
                              <button onClick={handleImportStrategy} className="text-[8px] font-black text-[#FF5A79] uppercase border border-[#FF5A79]/30 rounded-lg px-2 py-1">Importa Obiettivi</button>
                            </div>
                            <textarea rows={6} value={roadmapStrategicInput || storedObjectives} onChange={(e) => setRoadmapStrategicInput(e.target.value)} placeholder="Importa gli obiettivi..." className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:border-[#FF5A79] outline-none text-gray-300"/>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Product Backlog</label>
                              <button onClick={handleImportBacklog} className="text-[8px] font-black text-[#FF5A79] uppercase border border-[#FF5A79]/30 rounded-lg px-2 py-1">Importa Backlog</button>
                            </div>
                            <textarea rows={6} value={roadmapBacklogInput || storedBacklog} onChange={(e) => setRoadmapBacklogInput(e.target.value)} placeholder="Importa il backlog..." className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-[10px] font-mono focus:border-[#FF5A79] outline-none text-gray-300"/>
                          </div>
                        </div>
                      )}

                      <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-3 shadow-xl active:scale-95 disabled:opacity-50">
                        <span>{isGenerating ? 'ANALISI IN CORSO...' : `✨ GENERA ${activeModule.title.split('. ')[1]} CON AI`}</span>
                      </button>
                    </div>

                    <div className="col-span-7 bg-[#0D0F14] rounded-[40px] p-10 border border-white/10 flex flex-col min-h-[650px] shadow-[inset_0_2px_15px_rgba(0,0,0,0.6)]">
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
                          <div className="vision-output" dangerouslySetInnerHTML={{ __html: generatedOutput }} />
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
