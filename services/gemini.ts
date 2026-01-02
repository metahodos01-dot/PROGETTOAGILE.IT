import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askAICoach = async (prompt: string, context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Contesto del modulo formativo: ${context}\n\nInput dell'utente: ${prompt}`,
      config: {
        systemInstruction: "Sei un Agile Coach esperto. Il tuo compito è analizzare gli output dei workshop dei partecipanti e fornire feedback brevi, sfidanti e pratici. Non dare soluzioni dirette, ma guida i team verso la mentalità agile corretta. Parla in modo professionale ma incoraggiante.",
        temperature: 0.8,
        thinkingConfig: { thinkingBudget: 1000 }
      }
    });
    return response.text || "Non sono riuscito a elaborare un feedback in questo momento.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Si è verificato un errore nella connessione con il Coach AI.";
  }
};

export const generateProductVision = async (data: {
  productName: string;
  target: string;
  problem: string;
  currentSolution: string;
  differentiation: string;
}) => {
  try {
    const prompt = `
      Genera una Product Vision Statement professionale in italiano seguendo lo standard Agile.
      Dati del progetto:
      - Nome Prodotto: ${data.productName}
      - Target: ${data.target}
      - Problema: ${data.problem}
      - Soluzione attuale del cliente: ${data.currentSolution}
      - Differenziazione: ${data.differentiation}

      REQUISITO DI FORMATTAZIONE: 
      - Usa tag <br/> per separare logicamente le frasi.
      - Usa <strong> per enfatizzare le parole chiave.
      - Restituisci l'output ESCLUSIVAMENTE in formato HTML.
      
      Struttura richiesta:
      1. Un tag <p class="mb-8 text-3xl font-bold leading-tight text-white italic border-l-4 border-[#FF5A79] pl-6"> per il Vision Statement.
      2. Un tag <h3 class="text-xl font-black text-[#FF5A79] uppercase tracking-widest mb-6 mt-10"> per il titolo "Analisi della Value Proposition".
      3. Un tag <div class="grid grid-cols-1 gap-4"> contenente card per i punti chiave.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un esperto di Product Management. Restituisci solo codice HTML pulito.",
        temperature: 0.7,
      }
    });
    return response.text || "Errore nella generazione della vision.";
  } catch (error) {
    console.error("Vision AI Error:", error);
    return "Errore tecnico durante la generazione della Vision.";
  }
};

export const generateObjectives = async (data: {
  deadline: string;
}, visionContext?: string) => {
  try {
    const prompt = `
      Genera obiettivi SMART e OKR basati sul contesto strategico fornito.
      ${visionContext || ''}
      Scadenza: ${data.deadline}

      REQUISITO DI FORMATTAZIONE:
      - Includi la Vision riformattata con grassetti e <br/>.
      - Restituisci l'output ESCLUSIVAMENTE in formato HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un esperto di Strategy e OKR Coaching. Restituisci solo codice HTML pulito.",
        temperature: 0.7,
      }
    });
    return response.text || "Errore nella generazione degli obiettivi.";
  } catch (error) {
    console.error("Objectives AI Error:", error);
    return "Errore tecnico durante la generazione degli obiettivi.";
  }
};

export const generateKPIDecomposition = async (strategicContext: string) => {
  try {
    const prompt = `
      Analizza il seguente obiettivo strategico e i relativi Key Results:
      ${strategicContext}

      REQUISITO: Scomponi l'obiettivo strategico in 3-4 sotto-obiettivi tattici e assegna ad ognuno dei KPI (Key Performance Indicators) chiari e misurabili.
      
      FORMATTAZIONE HTML RICHIESTA:
      1. <h2 class="text-2xl font-black text-white mb-8 uppercase italic tracking-tighter">Scomposizione KPI e Target</h2>
      2. Card per ogni sotto-obiettivo:
         <div class="bg-[#1a1d24] p-6 rounded-[32px] border border-white/5 mb-6 shadow-xl">
           <div class="flex items-center justify-between mb-4">
             <span class="text-[9px] font-black text-[#FF5A79] uppercase tracking-widest">Sotto-Obiettivo Tattico</span>
             <div class="h-1.5 w-1.5 bg-[#FF5A79] rounded-full"></div>
           </div>
           <h4 class="text-xl font-black text-white mb-4 italic">...Titolo Sotto-Obiettivo...</h4>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="bg-white/5 p-4 rounded-2xl">
               <p class="text-[8px] font-black text-gray-500 uppercase mb-2">KPI Suggerito</p>
               <p class="text-xs font-bold text-gray-200">...Descrizione Metrica...</p>
             </div>
             <div class="bg-white/5 p-4 rounded-2xl">
               <p class="text-[8px] font-black text-gray-500 uppercase mb-2">Target Target</p>
               <p class="text-xs font-bold text-[#FF5A79]">...Valore Atteso...</p>
             </div>
           </div>
         </div>
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un esperto di Performance Management e Business Analyst. Restituisci solo codice HTML pulito.",
        temperature: 0.7,
      }
    });
    return response.text || "Errore nella scomposizione dei KPI.";
  } catch (error) {
    console.error("KPI Error:", error);
    return "Errore tecnico durante la scomposizione dei KPI.";
  }
};

export const generateBacklog = async (strategicContext: string) => {
  try {
    const prompt = `
      Scomponi il seguente contesto strategico in un Product Backlog Agile (User Stories).
      ${strategicContext}

      REQUISITO DI FORMATTAZIONE:
      - Restituisci l'output ESCLUSIVAMENTE in formato HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un Product Owner senior. Trasforma la strategia in item di backlog chiari. Restituisci solo codice HTML.",
        temperature: 0.8,
      }
    });
    return response.text || "Errore nella generazione del backlog.";
  } catch (error) {
    console.error("Backlog AI Error:", error);
    return "Errore tecnico durante la generazione del Backlog.";
  }
};

export const generateEstimates = async (backlogContext: string) => {
  try {
    const prompt = `
      Analizza le User Stories nel backlog seguente e proponi una stima per ciascuna.
      ${backlogContext}

      REQUISITO DI FORMATTAZIONE:
      - Restituisci l'output ESCLUSIVAMENTE in formato HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un Agile Coach esperto in tecniche di stima. Restituisci solo codice HTML.",
        temperature: 0.7,
      }
    });
    return response.text || "Errore nella generazione delle stime.";
  } catch (error) {
    console.error("Estimates AI Error:", error);
    return "Errore tecnico durante la generazione delle stime.";
  }
};

export const generateTeamStructure = async (context: {
  strategy: string;
  backlog: string;
}) => {
  try {
    const prompt = `
      Definisci la struttura di un Agile Scrum Team basato sui seguenti dati:
      
      OBIETTIVI STRATEGICI:
      ${context.strategy}
      
      BACKLOG TECNICO:
      ${context.backlog}

      REQUISITI DI OUTPUT:
      - Restituisci l'output ESCLUSIVAMENTE in formato HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un esperto di HR Agile e Resource Management. Proponi un team bilanciato e cross-funzionale. Restituisci solo HTML.",
        temperature: 0.8,
      }
    });
    return response.text || "Errore nella generazione del team.";
  } catch (error) {
    console.error("Team AI Error:", error);
    return "Errore tecnico durante la generazione del Team.";
  }
};

export const generateObeyaRendering = async (imageBase64: string, checklist: string[]) => {
  try {
    const prompt = `
      Edita questa immagine di una stanza per trasformarla in una Obeya Room Agile professionale.
      Aggiungi sulle pareti e negli spazi i seguenti elementi della checklist:
      ${checklist.join(", ")}

      REQUISITI VISUALI:
      - Stile moderno, professionale, alta luminosità.
      - Lavagne bianche (whiteboards) con post-it colorati (Kanban board).
      - Grafici di KPI stampati o visualizzati su schermi.
      - Product Vision board in evidenza.
      - Spazi per il team.
      
      Restituisci l'immagine modificata.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.split(',')[1],
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Obeya AI Error:", error);
    return null;
  }
};

export const generateRoadmapMVP = async (context: {
  objectives: string;
  backlog: string;
}) => {
  try {
    const prompt = `
      Analizza i seguenti dati di progetto per definire un MVP (Minimum Viable Product) e una Roadmap di rilascio.
      
      OBIETTIVI STRATEGICI:
      ${context.objectives}
      
      PRODUCT BACKLOG (USER STORIES):
      ${context.backlog}

      REQUISITI DI OUTPUT (HTML):
      1. <h2 class="text-3xl font-black text-white mb-8 uppercase italic tracking-tighter">Strategia MVP & Roadmap</h2>
      
      2. Sezione MVP Definition:
         <div class="bg-[#1a1d24] p-8 rounded-[40px] border-l-8 border-[#FF5A79] mb-10 shadow-2xl">
           <h3 class="text-xl font-black text-[#FF5A79] uppercase mb-4 italic">Minimum Viable Product (MVP)</h3>
           <p class="text-sm text-gray-300 mb-6">Basato sugli obiettivi e sulla complessità del backlog, l'MVP si concentrerà su:</p>
           <ul class="space-y-3">
             <li class="flex items-center space-x-3">
               <span class="text-[#FF5A79]">✔</span>
               <span class="text-sm font-bold">...Feature Chiave 1...</span>
             </li>
             <!-- Altri punti -->
           </ul>
         </div>

      3. Sezione Timeline e Rilascio:
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
           <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
             <p class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Data di Rilascio Stimata</p>
             <p class="text-3xl font-black text-white italic">...Mese Anno...</p>
           </div>
           <div class="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
             <p class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Numero di Sprint Stimati</p>
             <p class="text-3xl font-black text-white italic">...N Sprints...</p>
           </div>
         </div>

      4. Visual Roadmap (Milestones):
         <div class="space-y-4">
            <div class="relative pl-8 border-l-2 border-white/10 pb-8">
               <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#FF5A79]"></div>
               <h4 class="text-lg font-black text-white italic">Milestone 1: Fondamenta</h4>
               <p class="text-xs text-gray-400">...Descrizione...</p>
            </div>
            <!-- Altre milestones -->
         </div>

      Sii concreto e realistico considerando un team standard (1 PO, 1 SM, 3-5 Devs).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un Product Strategist senior esperto in Lean Startup e Agile Roadmap. Restituisci solo codice HTML.",
        temperature: 0.8,
      }
    });
    return response.text || "Errore nella generazione della Roadmap.";
  } catch (error) {
    console.error("Roadmap AI Error:", error);
    return "Errore tecnico durante la generazione della Roadmap.";
  }
};