
import React, { useState } from 'react';
import { askAICoach } from '../services/gemini';

interface WorkshopCardProps {
  moduleTitle: string;
}

const WorkshopCard: React.FC<WorkshopCardProps> = ({ moduleTitle }) => {
  const [showModal, setShowModal] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAskAI = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await askAICoach(input, `Workshop pratico per il modulo: ${moduleTitle}`);
    setResponse(res);
    setLoading(false);
  };

  return (
    <>
      <div className="bg-[#4B4E54] rounded-[48px] p-10 text-white h-full relative overflow-hidden flex flex-col shadow-2xl border border-white/5 min-h-[450px]">
        <div className="mb-6">
          <div className="w-16 h-16 bg-[#5A5D63] rounded-2xl flex items-center justify-center text-3xl mb-8 border border-white/10 shadow-inner">
            <span>🧩</span>
          </div>
          
          <h2 className="text-4xl font-black leading-[0.9] mb-4 uppercase italic tracking-tighter">
            WORKSHOP<br />PRATICO
          </h2>
          
          <div className="mb-8">
            <span className="inline-block bg-[#FF5A79] text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">
              LABORATORIO
            </span>
          </div>
          
          <p className="text-lg font-medium text-gray-200 leading-snug">
            Sperimenta le tecniche agili con il supporto del nostro Coach AI dedicato.
          </p>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-white text-[#4B4E54] w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all mt-auto flex items-center justify-center space-x-3 shadow-xl active:scale-95"
        >
          <span>APRI LABORATORIO AI</span>
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#4B4E54] rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="bg-[#FF5A79] p-8 text-white flex justify-between items-center">
              <h3 className="font-black text-2xl uppercase italic">Laboratorio AI</h3>
              <button onClick={() => setShowModal(false)} className="bg-white/20 p-3 rounded-xl hover:bg-white/30 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-10 space-y-6">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Inserisci il tuo output qui..."
                className="w-full h-40 bg-[#111318]/40 border border-white/10 rounded-2xl p-4 text-white focus:border-[#FF5A79] focus:outline-none transition-all resize-none"
              />
              <button 
                onClick={handleAskAI}
                disabled={loading}
                className="w-full bg-[#FF5A79] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110"
              >
                {loading ? 'ANALISI IN CORSO...' : 'OTTIENI FEEDBACK'}
              </button>
              {response && (
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <p className="text-gray-200 italic">"{response}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkshopCard;
