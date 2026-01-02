
import React from 'react';
import { MODULES } from '../constants';

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
  onGoHome: () => void;
  onOpenRegister: () => void; // Apre il registro con i dati attuali (Edit)
  onNewProject: () => void;   // Apre il registro vuoto (New)
  projects: ProjectSummary[];
  currentProjectId: string | null;
  onSwitchProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onExportProject: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeModuleId, 
  onSelectModule, 
  onGoHome, 
  onOpenRegister,
  onNewProject,
  projects,
  currentProjectId,
  onSwitchProject,
  onDeleteProject,
  onExportProject
}) => {
  return (
    <aside className="w-[340px] bg-[#4B4E54] h-screen text-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      {/* App Header */}
      <div 
        onClick={onGoHome}
        className="px-6 pt-8 pb-4 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-4"
      >
        {/* LOGO QUI: Sostituisci src con il tuo URL o import locale */}
        <img 
          src="https://ui-avatars.com/api/?name=MH&background=FF5A79&color=fff&size=128" 
          alt="Metàhodos Logo" 
          className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10"
        />
        <div>
          <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">
            PROGETTOAGILE.AI
          </h1>
          <p className="text-[10px] font-bold text-[#FF5A79] uppercase tracking-[0.2em] mt-1">
            By MetàHodòs
          </p>
        </div>
      </div>

      <div className="p-6 space-y-8">

        {/* Project Selector & Actions */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">I Tuoi Progetti</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
               <select 
                 value={currentProjectId || ''}
                 onChange={(e) => onSwitchProject(e.target.value)}
                 className="w-full bg-[#5A5D63] appearance-none p-4 rounded-2xl text-sm font-bold border border-white/5 focus:outline-none cursor-pointer pr-10 hover:bg-[#66696F] transition-colors shadow-sm text-white truncate"
               >
                 {projects.length === 0 && <option value="" disabled>Caricamento...</option>}
                 {projects.map((p) => (
                   <option key={p.id} value={p.id} className="text-black">
                     {p.name}
                   </option>
                 ))}
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
               </div>
            </div>
            {currentProjectId && (
              <>
                <button 
                  type="button"
                  onClick={onExportProject}
                  className="bg-[#5A5D63] p-4 rounded-2xl hover:bg-green-500/20 hover:text-green-500 transition-colors border border-white/5 group"
                  title="Scarica Backup JSON"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
                <button 
                  type="button"
                  onClick={() => onDeleteProject(currentProjectId)}
                  className="bg-[#5A5D63] p-4 rounded-2xl hover:bg-red-500/20 hover:text-red-500 transition-colors border border-white/5 group"
                  title="Elimina Progetto Corrente"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              </>
            )}
          </div>

          {/* New Project Button */}
          <button 
            type="button"
            onClick={onNewProject}
            className="w-full bg-white/5 hover:bg-white/10 p-3 rounded-2xl flex items-center justify-center space-x-2 transition-all border border-white/5 border-dashed group"
          >
            <span className="text-lg text-green-400 group-hover:scale-110 transition-transform">+</span>
            <span className="text-xs font-black text-gray-300 uppercase tracking-widest group-hover:text-white">Crea Nuovo Progetto</span>
          </button>
        </section>
        
        {/* Registro Progetti Agile Button (Edit Mode) */}
        <button 
          onClick={onOpenRegister}
          className="w-full bg-[#FF5A79] hover:bg-[#ff4065] p-4 rounded-2xl flex items-center justify-between transition-all shadow-lg group"
        >
          <div className="flex items-center space-x-3">
            <span className="text-lg bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">📝</span>
            <div className="text-left">
              <span className="block text-[10px] font-black text-white/80 uppercase tracking-wider">Configurazione</span>
              <span className="block text-sm font-bold text-white">Registro Team & Dati</span>
            </div>
          </div>
          <span className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all">→</span>
        </button>

        {/* Modules List */}
        <div className="space-y-3 pb-20">
          {MODULES.map((mod, index) => {
            const isActive = activeModuleId === mod.id;
            const moduleNumber = index; // Keep 0-based for Mindset as 0
            
            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className={`w-full text-left rounded-[20px] p-5 relative overflow-hidden transition-all group ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-xl' 
                    : 'bg-[#5A5D63] border border-white/5 hover:bg-[#66696F]'
                }`}
              >
                {/* Background Ghost Number - VISIBILITY INCREASED AND MOVED LEFT */}
                <span className={`absolute right-4 -bottom-4 text-8xl font-black italic select-none pointer-events-none opacity-20 ${isActive ? 'text-black' : 'text-white'}`}>
                  {moduleNumber}
                </span>

                <h3 className={`text-[13px] font-black uppercase leading-tight tracking-tight relative z-10 pr-6 ${
                  isActive ? 'text-slate-800' : 'text-white'
                }`}>
                  {mod.title.split('. ')[1]}
                </h3>

                {/* Active Accent Line */}
                {isActive && (
                  <div className="absolute bottom-4 left-5 w-8 h-1 bg-[#FF5A79] rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
