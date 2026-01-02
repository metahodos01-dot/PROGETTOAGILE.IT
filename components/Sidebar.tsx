
import React from 'react';
import { MODULES } from '../constants';

interface SidebarProps {
  activeModuleId: string;
  onSelectModule: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModuleId, onSelectModule }) => {
  return (
    <aside className="w-[340px] bg-[#4B4E54] h-screen text-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-8">
        
        {/* Materiali Extra */}
        <section>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Materiali Extra</h2>
          <button className="w-full bg-[#5A5D63] hover:bg-[#66696F] p-4 rounded-2xl flex items-center space-x-3 transition-all border border-white/5">
            <span className="text-lg">🥜</span>
            <span className="text-sm font-bold text-gray-200">Agile in a Nutshell</span>
          </button>
        </section>

        {/* Percorso Formativo */}
        <section>
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Percorso Formativo</h2>
          
          <div className="space-y-4">
            {/* Trainer View Dropdown */}
            <div className="relative">
              <select className="w-full bg-[#5A5D63] appearance-none p-4 rounded-2xl text-sm font-bold border border-white/5 focus:outline-none cursor-pointer pr-10">
                <option>Vista Trainer (Tutti)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {/* Registro Sessione */}
            <button className="w-full bg-[#5A5D63] hover:bg-[#66696F] p-4 rounded-2xl flex items-center space-x-3 transition-all border border-white/5">
              <span className="text-lg">📝</span>
              <span className="text-sm font-bold text-gray-200">Registro Sessione</span>
            </button>

            {/* Modules List */}
            <div className="space-y-3 pt-4">
              {MODULES.map((mod, index) => {
                const isActive = activeModuleId === mod.id;
                const moduleNumber = index + 1;
                
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
                    {/* Background Ghost Number */}
                    <span className={`absolute -right-2 -bottom-4 text-8xl font-black italic select-none pointer-events-none opacity-[0.07] ${isActive ? 'text-black' : 'text-white'}`}>
                      {moduleNumber}
                    </span>

                    <div className="flex items-center space-x-2 mb-3 relative z-10">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                        isActive ? 'bg-[#FF5A79] text-white' : 'bg-[#6E7177] text-gray-300'
                      }`}>
                        Giorno {mod.day}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                        isActive ? 'bg-[#F1F3F5] text-slate-500' : 'bg-[#6E7177] text-gray-300'
                      }`}>
                        {mod.type}
                      </span>
                    </div>

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
        </section>
      </div>
    </aside>
  );
};

export default Sidebar;
