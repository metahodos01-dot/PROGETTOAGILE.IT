
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import WorkshopCard from './components/WorkshopCard';
import { MODULES } from './constants';
import { TabType } from './types';
import { 
  generateProductVision, 
  generateObjectives, 
  generateBacklog, 
  generateEstimates, 
  generateKPIDecomposition
} from './services/gemini';
import { saveModuleData, subscribeToModule } from './services/firebase';

const App: React.FC = () => {
  // Gestione Progetto Cloud
  const [projectId, setProjectId] = useState<string>(localStorage.getItem('currentProjectId') || '');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(!localStorage.getItem('currentProjectId'));

  // Stato UI
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0].id);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.INTRO);

  // States per i dati del Workshop (Persistenti su Cloud)
  const [visionData, setVisionData] = useState({
    productName: '', target: '', problem: '', currentSolution: '', differentiation: ''
  });
  const [objectivesData, setObjectivesData] = useState({ deadline: '' });
  const [labInput, setLabInput] = useState<string>('');
  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);

  const activeModule = MODULES.find(m => m.id === activeModuleId) || MODULES[0];

  // Effetto per sincronizzare i dati da Firebase al cambio modulo o progetto
  useEffect(() => {
    if (!projectId) return;

    // Reset stati locali prima del caricamento per evitare "flash" di dati vecchi
    setVisionData({ productName: '', target: '', problem: '', currentSolution: '', differentiation: '' });
    setObjectivesData({ deadline: '' });
    setLabInput('');
    setGeneratedOutput('');

    const unsub = subscribeToModule(projectId, activeModuleId, (data) => {
      if (!data) return;
      if (data.visionData) setVisionData(data.visionData);
      if (data.objectivesData) setObjectivesData(data.objectivesData);
      if (data.labInput) setLabInput(data.labInput);
      if (data.generatedOutput) setGeneratedOutput(data.generatedOutput);
    });

    return () => unsub();
  }, [projectId, activeModuleId]);

  const handleAutoSave = (fields: any) => {
    saveModuleData(projectId, activeModuleId, fields);
  };

  const handleSelectProject = (id: string) => {
    const cleanId = id.trim().toLowerCase().replace(/\s+/g, '-');
    if (cleanId) {
      setProjectId(cleanId);
      localStorage.setItem('currentProjectId', cleanId);
      setIsProjectModalOpen(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    let result = '';
    try {
      if (activeModuleId === 'f1') result = await generateProductVision(visionData);
      else if (activeModuleId === 'f2') result = await generateObjectives({ deadline: objectivesData.deadline });
      else if (activeModuleId === 'f6') result = await generateBacklog(labInput);
      else if (activeModuleId === 'f7') result = await generateEstimates(labInput);
      else if (activeModuleId === 'f3') result = await generateKPIDecomposition(labInput);
      
      setGeneratedOutput(result);
      // Salvataggio immediato del risultato generato
      handleAutoSave({ generatedOutput: result });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#4B4E54] overflow-hidden">
      <Sidebar 
        activeModuleId={activeModuleId} 
        onSelectModule={(id) => { setActiveModuleId(id); setActiveTab(TabType.INTRO); }} 
      />

      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#FDFDFD]">
        {/* Badge Progetto in alto a destra */}
        <div className="absolute top-8 right-12 z-10 flex items-center space-x-3">
          <div className="bg-slate-900/5 px-4 py-2 rounded-full border border-slate-200 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase mr-2 tracking-widest">Progetto:</span>
            <span className="text-[10px] font-black text-[#FF5A79] uppercase">{projectId}</span>
          </div>
          <button 
            onClick={() => setIsProjectModalOpen(true)} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            title="Cambia Progetto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"></path>
            </svg>
          </button>
        </div>

        <div className="max-w-7xl mx-auto p-12 pb-32">
          <header className="flex justify-between items-start mb-16 gap-12">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-6">
                <span className="bg-[#FF5A79] text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider">Fase {activeModule.id.replace('f', '')}</span>
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Agile Academy Lab</span>
              </div>
              <h1 className="text-7xl font-black text-slate-900 leading-[0.85] uppercase tracking-tighter mb-8 italic">{activeModule.title.split('. ')[1]}</h1>
              <p className="text-xl text-slate-500 font-semibold leading-tight max-w-2xl">{activeModule.tagline}</p>
            </div>
            <Timer />
          </header>

          <nav className="flex space-x-12 border-b border-gray-100 mb-16 overflow-x-auto custom-scrollbar whitespace-nowrap">
            {Object.values(TabType).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-6 text-sm font-black uppercase tracking-[0.2em] transition-all relative ${
                  activeTab === tab ? 'text-slate-900' : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FF5A79] rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          <div className="space-y-12">
            {activeTab === TabType.INTRO && (
              <div className="grid grid-cols-12 gap-12 items-center">
                <div className="col-span-7 space-y-10">
                  <div className="space-y-6">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter">L'Obiettivo del Modulo</h2>
                    <p className="text-xl text-slate-600 leading-relaxed font-medium">{activeModule.description}</p>
                    
                    {activeModuleId === 'f0' && (
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        {[
                          "Individui e interazioni più che processi e strumenti",
                          "Software funzionante più che documentazione esaustiva",
                          "Collaborazione col cliente più che negoziazione contrattuale",
                          "Rispondere al cambiamento più che seguire un piano"
                        ].map((v, i) => (
                          <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic font-bold text-sm text-slate-700">
                            <span className="text-[#FF5A79] mr-2">{i+1}.</span> {v}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {activeModule.objectives.map((obj, i) => (
                      <span key={i} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm border border-slate-200">{obj}</span>
                    ))}
                  </div>
                </div>
                <div className="col-span-5">
                   <div className="bg-slate-900 rounded-[50px] p-12 text-white shadow-2xl relative overflow-hidden group min-h-[300px] flex flex-col justify-center">
                     <div className="absolute -right-10 -top-10 text-[120px] font-black italic opacity-10 group-hover:scale-110 transition-transform">“</div>
                     <p className="text-2xl font-black leading-tight mb-8 italic relative z-10">"{activeModule.quote}"</p>
                     <div className="h-1 w-12 bg-[#FF5A79] rounded-full"></div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === TabType.TEORIA && (
              <div className="prose prose-slate max-w-4xl">
                <h2 className="text-4xl font-black uppercase italic mb-8">Contenuti Teorici</h2>
                <div className="bg-white p-12 rounded-[48px] shadow-xl border border-gray-100 space-y-8">
                  <p className="text-lg font-medium text-slate-700">Approfondimento dei concetti chiave di <strong>{activeModule.title}</strong>.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeModule.objectives.map((obj, i) => (
                      <div key={i} className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                        <span className="text-[10px] font-black text-[#FF5A79] uppercase mb-2 block">Punto {i+1}</span>
                        <h4 className="text-xl font-black uppercase italic text-slate-800">{obj}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === TabType.QUIZ && (
              <div className="max-w-3xl">
                <div className="bg-slate-100 p-12 rounded-[48px] text-center border border-slate-200">
                  <span className="text-4xl mb-6 block text-slate-400">📝</span>
                  <h3 className="text-2xl font-black uppercase italic mb-4 text-slate-900">Quiz di Verifica</h3>
                  <p className="text-slate-500 font-medium mb-8">Consolida le tue competenze su {activeModule.title.split('. ')[1]}.</p>
                  <button className="bg-slate-900 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl transition-transform active:scale-95">Inizia Test</button>
                </div>
              </div>
            )}

            {activeTab === TabType.SIMULAZIONE && (
              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-5 space-y-8">
                  <section className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl border border-white/5">
                    <h3 className="text-[10px] font-black text-[#FF5A79] uppercase tracking-[0.4em] mb-10 italic">Workshop Cloud Hub</h3>
                    
                    <div className="space-y-6">
                      {activeModuleId === 'f1' ? (
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            placeholder="Nome Prodotto" 
                            value={visionData.productName} 
                            onChange={e => setVisionData({...visionData, productName: e.target.value})} 
                            onBlur={() => handleAutoSave({visionData})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-[#FF5A79]" 
                          />
                          <textarea 
                            placeholder="Il Problema da risolvere" 
                            value={visionData.problem} 
                            onChange={e => setVisionData({...visionData, problem: e.target.value})} 
                            onBlur={() => handleAutoSave({visionData})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-[#FF5A79]" 
                            rows={3} 
                          />
                          <textarea 
                            placeholder="Perché siamo diversi?" 
                            value={visionData.differentiation} 
                            onChange={e => setVisionData({...visionData, differentiation: e.target.value})} 
                            onBlur={() => handleAutoSave({visionData})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-[#FF5A79]" 
                            rows={3} 
                          />
                        </div>
                      ) : activeModuleId === 'f2' ? (
                        <div className="space-y-4">
                          <input 
                            type="text" 
                            placeholder="Scadenza Obiettivi (es. Dicembre 2025)" 
                            value={objectivesData.deadline} 
                            onChange={e => setObjectivesData({...objectivesData, deadline: e.target.value})} 
                            onBlur={() => handleAutoSave({objectivesData})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-[#FF5A79]" 
                          />
                        </div>
                      ) : (
                        <textarea 
                          placeholder="Inserisci qui i dati richiesti per il workshop..." 
                          value={labInput} 
                          onChange={e => setLabInput(e.target.value)} 
                          onBlur={() => handleAutoSave({labInput})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm outline-none focus:border-[#FF5A79] min-h-[300px]" 
                        />
                      )}

                      <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !projectId} 
                        className="w-full bg-[#E67E22] py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isGenerating ? 'ANALISI AI IN CORSO...' : `GENERA RISULTATO AI`}
                      </button>
                    </div>
                  </section>
                  <WorkshopCard moduleTitle={activeModule.title} />
                </div>

                <div className="col-span-7 bg-slate-900 rounded-[48px] p-12 shadow-inner min-h-[600px] border border-white/5 flex flex-col text-white">
                  <h3 className="text-xl font-black italic text-[#FF5A79] mb-8 uppercase tracking-tighter">Advisor Result</h3>
                  <div 
                    className="flex-1 overflow-y-auto custom-scrollbar vision-output" 
                    dangerouslySetInnerHTML={{ __html: generatedOutput || '<div class="opacity-10 text-center mt-20 font-black uppercase tracking-[0.5em] text-xs">Completa il workshop per vedere l\'analisi</div>' }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal di Selezione Progetto (All'avvio) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[60px] w-full max-w-lg p-20 text-center shadow-2xl">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-6 leading-none text-slate-900">Agile Academy<br/><span className="text-[#FF5A79]">Cloud Hub</span></h2>
            <p className="text-slate-500 mb-12 font-semibold italic">Inserisci il nome del tuo progetto per collaborare in tempo reale via Firebase.</p>
            <input 
              type="text" 
              placeholder="Nome del Progetto (es: Team-Alpha)" 
              className="w-full bg-slate-100 border-none rounded-3xl p-8 mb-8 text-xl font-bold text-center outline-none focus:ring-4 ring-[#FF5A79]/20" 
              onKeyDown={e => e.key === 'Enter' && handleSelectProject(e.currentTarget.value)} 
              autoFocus
            />
            <button 
              onClick={e => { const v = (e.currentTarget.previousSibling as HTMLInputElement).value; if(v) handleSelectProject(v); }} 
              className="w-full bg-slate-900 text-white py-8 rounded-[32px] font-black uppercase tracking-widest hover:bg-[#FF5A79] transition-all"
            >
              ACCEDI AL WORKSHOP
            </button>
            <p className="mt-8 text-[9px] text-slate-400 uppercase font-black tracking-widest">Powered by Firebase & Google Gemini</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
