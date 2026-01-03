
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* Navbar / Logo Area */}
      <header className="py-12 flex flex-col items-center justify-center">
        <div className="flex space-x-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-[#FF5A79]"></div>
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <h1 className="text-3xl font-black tracking-[0.2em] text-slate-900 mb-2">METÀ</h1>
        <h1 className="text-3xl font-black tracking-[0.2em] text-slate-900">HODÒS</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-4">
          PERSONE • AGILITÀ • RISULTATI
        </p>
      </header>

      {/* Hero Section */}
      <section className="text-center px-6 pb-24">
        <h2 className="text-7xl md:text-9xl font-black tracking-tighter text-slate-900 mb-8">
          Progetto Agile.AI
        </h2>
        <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed mb-12">
          L'evoluzione del mindset Agile potenziata dall'AI.<br />
          Il metodo scientifico applicato alle persone.
        </p>
        <button 
          onClick={onStart}
          className="bg-[#FFA057] hover:bg-[#ff8f36] text-white px-14 py-7 rounded-full font-black text-xl uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
        >
          INIZIA ORA
        </button>
        <div className="mt-10">
          <span className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] cursor-pointer hover:text-[#FFA057] transition-colors border-b-2 border-transparent hover:border-[#FFA057] pb-1">
            SCOPRI IL METODO ↓
          </span>
        </div>
      </section>

      {/* Dark Vision Section */}
      <section className="bg-[#333333] text-white py-24 px-6 md:px-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Text */}
          <div className="space-y-8">
            <h3 className="text-[#FFA057] text-xs font-black uppercase tracking-[0.3em] mb-4">
              LA NOSTRA VISIONE
            </h3>
            <h2 className="text-5xl md:text-6xl font-black leading-tight tracking-tight">
              Rendere l'eccellenza strategica <span className="text-[#FFA057]">semplice</span>, umana e immediata.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed border-l-4 border-[#FFA057] pl-6 py-2">
              Trasformiamo la complessità in risultati pratici stando 
              <span className="text-white font-bold"> "nel fango"</span> con i leader, parlando un linguaggio diretto e usando un approccio empatico.
            </p>
          </div>

          {/* Right Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-4">🤝</div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">Empatia Operativa</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                Sentiamo le sfide del team sulla nostra pelle.
              </p>
            </div>
             {/* Card 2 */}
             <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-4">⚡</div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">Semplicità Radicale</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                Tagliamo il superfluo per arrivare al valore.
              </p>
            </div>
             {/* Card 3 */}
             <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-4">🛠️</div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">Toolbox Infinita</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                Non solo martelli, ma un intero arsenale agile.
              </p>
            </div>
             {/* Card 4 */}
             <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:bg-white/10 transition-colors">
              <div className="text-3xl mb-4 text-[#FF5A79]">⭕</div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-2">Zero Ego</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">
                Il risultato del progetto viene prima di noi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Light Course Section */}
      <section className="bg-white py-24 px-6 md:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-4">
              IL PERCORSO FORMATIVO
            </h3>
            <div className="w-24 h-1 bg-[#FF5A79]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 01 */}
            <div className="bg-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
              <div className="absolute top-0 right-0 text-[180px] font-black text-slate-50 opacity-[0.05] leading-none -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700">01</div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="text-[#FF5A79] text-6xl font-black mb-6">01</div>
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-6">
                  STRATEGIA<br/>& VISIONE
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-12 flex-1">
                  Definisci il 'Perché'. Dalla Product Vision agli OKR, costruisci una Roadmap solida per allineare team e stakeholder agli obiettivi di business.
                </p>
                <div className="text-[#FF5A79] text-[10px] font-black uppercase tracking-[0.2em]">
                  PRODUCT MANAGEMENT
                </div>
              </div>
            </div>

            {/* Card 02 */}
            <div className="bg-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
              <div className="absolute top-0 right-0 text-[180px] font-black text-slate-50 opacity-[0.05] leading-none -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700">02</div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="text-slate-100 text-6xl font-black mb-6">02</div>
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-6">
                  ESECUZIONE<br/>& TEAM
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-12 flex-1">
                  Dal Backlog allo Sprint. Crea team autonomi, gestisci il flusso visuale (Obeya) e trasforma le idee in valore rilasciato costantemente.
                </p>
                <div className="text-green-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  AGILE DELIVERY
                </div>
              </div>
            </div>

            {/* Card 03 */}
            <div className="bg-white rounded-[40px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden group hover:-translate-y-2 transition-transform duration-500">
              <div className="absolute top-0 right-0 text-[180px] font-black text-slate-50 opacity-[0.05] leading-none -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700">03</div>
              <div className="relative z-10 h-full flex flex-col">
                <div className="text-slate-100 text-6xl font-black mb-6">03</div>
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-6">
                  DATA DRIVEN<br/>& KPI
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-12 flex-1">
                  Misura ciò che conta. Analisi della Velocity, Burndown chart, metriche di valore e cicli di feedback per il miglioramento continuo.
                </p>
                <div className="text-[#FFA057] text-[10px] font-black uppercase tracking-[0.2em]">
                  ANALYTICS & IMPROVEMENT
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-24 pb-12 text-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex space-x-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#FF5A79]"></div>
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <h2 className="text-2xl font-black tracking-[0.2em] text-slate-900 mb-1">METÀ</h2>
          <h2 className="text-2xl font-black tracking-[0.2em] text-slate-900">HODÒS</h2>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">
            PERSONE • AGILITÀ • RISULTATI
          </p>
        </div>
        
        <div className="text-slate-500 text-xs font-bold space-y-2">
          <p>Francesco De Sario – Via Albini 27, 40137 Bologna (BO)</p>
          <p>P.Iva: 03819481205 – C.F.: DSRFNC69B10M082I – CID: KRRH6B9</p>
          <p>Tel. +39 328 268 2183 – effeone@pec.it</p>
          <p className="mt-4 text-[#FF5A79] opacity-50">v1.6</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
