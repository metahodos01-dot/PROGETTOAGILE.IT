
import React, { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string;
}

interface ProjectSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    projectName: string;
    startDate: string;
    teamMembers: TeamMember[];
  };
  onSave: (data: {
    projectName: string;
    startDate: string;
    teamMembers: TeamMember[];
  }) => void;
}

const ProjectSetupModal: React.FC<ProjectSetupModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
  const [formData, setFormData] = useState(initialData);

  // Sync state when initialData changes (e.g. switching projects)
  useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleMemberChange = (id: string, field: keyof TeamMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const addMember = () => {
    const newId = (Math.max(...formData.teamMembers.map(m => parseInt(m.id) || 0), 0) + 1).toString();
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { id: newId, name: '', role: 'Developer', skills: '' }]
    }));
  };

  const removeMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id)
    }));
  };

  const handleSave = () => {
    if (formData.projectName.trim()) {
      onSave(formData);
      onClose();
    }
  };

  const isValid = formData.projectName.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1e293b] w-full max-w-4xl rounded-[32px] p-8 shadow-2xl border border-white/10 relative my-8 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-white font-black text-3xl italic tracking-tight">CONFIGURAZIONE PROGETTO</h2>
            <p className="text-[#FF5A79] text-xs font-bold uppercase tracking-widest mt-1">Registro Team & Dati Sessione</p>
          </div>
          <button onClick={onClose} className="bg-white/5 hover:bg-white/10 p-3 rounded-full transition-colors text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="space-y-8">
          {/* General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome Progetto *</label>
              <input 
                value={formData.projectName} 
                onChange={e => setFormData({...formData, projectName: e.target.value})} 
                placeholder="Es. App Mobile v2.0" 
                className="w-full bg-[#0f1115] border border-white/10 p-4 rounded-xl text-white font-bold focus:border-[#FF5A79] focus:outline-none focus:ring-1 focus:ring-[#FF5A79] transition-all"
                autoFocus 
              />
              {!isValid && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-wide">⚠ Nome obbligatorio per salvare</p>}
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data Inizio Workshop</label>
              <input 
                type="date"
                value={formData.startDate} 
                onChange={e => setFormData({...formData, startDate: e.target.value})} 
                className="w-full bg-[#0f1115] border border-white/10 p-4 rounded-xl text-white font-bold focus:border-[#FF5A79] focus:outline-none focus:ring-1 focus:ring-[#FF5A79]" 
              />
            </div>
          </div>

          {/* Team Section */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Membri del Team Agile</label>
              <button onClick={addMember} className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg font-black uppercase transition-colors flex items-center gap-2">
                <span>+ Aggiungi Membro</span>
              </button>
            </div>
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {formData.teamMembers.map((member, index) => (
                <div key={member.id} className="grid grid-cols-12 gap-3 bg-[#0f1115] p-4 rounded-xl border border-white/5 items-center group hover:border-white/20 transition-colors">
                  <div className="col-span-1 text-center text-gray-600 font-black text-sm">#{index + 1}</div>
                  <div className="col-span-3">
                    <input 
                      value={member.name} 
                      onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                      placeholder="Nome Cognome"
                      className="w-full bg-transparent border-b border-white/10 text-white text-sm py-1 focus:border-[#FF5A79] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                     <select 
                        value={member.role}
                        onChange={(e) => handleMemberChange(member.id, 'role', e.target.value)}
                        className="w-full bg-[#1e293b] text-white text-xs p-2 rounded-lg border border-white/10 focus:outline-none"
                     >
                        <option>Product Owner</option>
                        <option>Scrum Master</option>
                        <option>Developer</option>
                        <option>Designer</option>
                        <option>Stakeholder</option>
                        <option>Analyst</option>
                     </select>
                  </div>
                  <div className="col-span-4">
                    <input 
                      value={member.skills} 
                      onChange={(e) => handleMemberChange(member.id, 'skills', e.target.value)}
                      placeholder="Skills (es. Java, UX, Marketing...)"
                      className="w-full bg-transparent border-b border-white/10 text-gray-400 text-xs py-1 focus:border-[#FF5A79] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeMember(member.id)} className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-white font-bold text-xs uppercase hover:bg-white/5 transition-colors">Annulla</button>
          
          <button 
            onClick={handleSave} 
            disabled={!isValid}
            className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 ${
              isValid 
                ? 'bg-[#FF5A79] hover:bg-[#ff4065] text-white hover:shadow-xl hover:-translate-y-1' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isValid ? 'Salva Configurazione' : 'Inserisci Nome per Salvare'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSetupModal;
