
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import LandingPage from './components/LandingPage';
import { MODULES } from './constants';
import { 
  getOrCreateProject, 
  updateProjectState, 
  createNewProject,
  deleteProject,
  fetchStories, 
  createStory, 
  fetchTasks, 
  createTask, 
  updateTaskStatus,
  deleteTask,
  fetchAllProjects,
  fetchProjectById,
  supabase,
  DBProjectState
} from './services/supabase';
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
  project_id?: string;
  storyId?: string;
  title: string;
  assignedTo: string;
  status: 'todo' | 'doing' | 'done';
}

interface UserStory {
  id: string;
  text: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  const [dbError, setDbError] = useState<boolean>(false);
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0].id); // Default to f0 now
  const [showFixModal, setShowFixModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Session Data
  const [sessionData, setSessionData] = useState<{
    projectName: string;
    startDate: string;
    teamMembers: TeamMember[];
  }>({
    projectName: '',
    startDate: new Date().toISOString().split('T')[0],
    teamMembers: [
      { id: '1', name: '', role: 'Product Owner', skills: '' },
      { id: '2', name: '', role: 'Scrum Master', skills: '' },
      { id: '3', name: '', role: 'Developer', skills: '' }
    ]
  });

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
  const [sprintStatus, setSprintStatus] = useState<'planning' | 'active' | 'daily' | 'review' | 'retro' | 'kpi'>('planning');
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [sprintStories, setSprintStories] = useState<UserStory[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<Record<string, number>>({});
  const [impediments, setImpediments] = useState<string[]>([]);
  const [teamMoods, setTeamMoods] = useState<Record<string, string>>({});
  
  // Multi-Sprint State
  const [sprintNumber, setSprintNumber] = useState<number>(1);
  const [sprintHistory, setSprintHistory] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState({ feedback: '', demoNotes: '' });
  const [retroData, setRetroData] = useState({ good: '', improve: '', actions: '' });

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

  // States per Inputs Modulo 1 (Vision)
  const [visionData, setVisionData] = useState({
    productName: '',
    target: '',
    problem: '',
    currentSolution: '',
    differentiation: ''
  });

  // States per Inputs Modulo 2 (Obiettivi)
  const [objectivesData, setObjectivesData] = useState({
    deadline: ''
  });

  // States per Modulo 0 (Mindset)
  const [mindsetData, setMindsetData] = useState({
    experience: 'Nessuna esperienza (primo approccio)',
    challenges: '',
    expectations: '',
    readiness: 'Sì, siamo pronti!'
  });

  const [generatedOutput, setGeneratedOutput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // NEW: Editing Output State
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeModule = MODULES.find(m => m.id === activeModuleId) || MODULES[0];
  const saveTimeoutRef = useRef<number | null>(null);

  // --- HELPER: Load Project into State ---
  const loadProjectData = async (project: DBProjectState) => {
    setProjectId(project.id!);
    
    // Load Data
    if (project.vision_data) setVisionData(project.vision_data);
    if (project.objectives_data) setObjectivesData(project.objectives_data);
    if (project.mindset_data) setMindsetData(project.mindset_data);
    if (project.current_sprint_number) setSprintNumber(project.current_sprint_number);
    if (project.sprints_history) setSprintHistory(project.sprints_history);
    
    if (project.session_data) {
       setSessionData(project.session_data);
       // Update Team Availability based on loaded team if not persisted otherwise
       if (!project.team_availability || Object.keys(project.team_availability).length === 0) {
          const availability: Record<string, number> = {};
          project.session_data.teamMembers.forEach(m => {
             if (m.name) availability[`${m.name} (${m.role})`] = 40;
          });
          setTeamAvailability(availability);
       } else {
          setTeamAvailability(project.team_availability);
       }
    } else {
      // Reset session data if not present (for clean switch)
       setSessionData({
        projectName: 'Progetto Senza Nome',
        startDate: new Date().toISOString().split('T')[0],
        teamMembers: []
      });
    }

    if (project.stored_outputs) {
      setStoredVision(project.stored_outputs.vision || '');
      setStoredObjectives(project.stored_outputs.objectives || '');
      setStoredBacklog(project.stored_outputs.backlog || '');
    } else {
      setStoredVision('');
      setStoredObjectives('');
      setStoredBacklog('');
    }
    
    if (project.impediments) setImpediments(project.impediments);
    else setImpediments([]);

    if (project.active_module_id) setActiveModuleId(project.active_module_id);
    
    // Reset Temporary States
    setGeneratedOutput('');
    setSprintStatus('planning');
    setRenderedObeya(null);
    setRoomImage(null);

    // Fetch Stories & Tasks
    const dbStories = await fetchStories(project.id!);
    setSprintStories(dbStories.map(s => ({ id: s.external_id, text: s.text })));
    
    const dbTasks = await fetchTasks(project.id!);
    setSprintTasks(dbTasks.map(t => ({ 
      id: t.id, 
      storyId: t.story_id, 
      title: t.title, 
      assignedTo: t.assigned_to, 
      status: t.status 
    })));
  };

  const refreshProjectList = async () => {
    const projects = await fetchAllProjects();
    const formattedProjects = projects.map((p: any) => ({
      id: p.id,
      name: p.session_data?.projectName || `Progetto del ${new Date(p.updated_at || Date.now()).toLocaleDateString()}`,
      updatedAt: p.updated_at
    }));
    setProjectsList(formattedProjects);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Get List of Projects
      await refreshProjectList();

      // 2. Load Active or Latest Project
      const { data: project, error: initError } = await getOrCreateProject();
      
      if (project) {
        await loadProjectData(project);
      } else {
        setDbError(true);
        // Check if error is related to missing columns
        if (initError && (initError.code === 'PGRST204' || initError.message?.includes('mindset_data') || initError.message?.includes('sprints_history') || initError.message?.includes('session_data'))) {
            setShowFixModal(true);
        }
      }
    };
    initApp();
  }, []);

  // --- REALTIME SUBSCRIPTION FOR TASKS ---
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('tasks_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new;
            setSprintTasks(prev => [...prev, { 
              id: newTask.id, 
              storyId: newTask.story_id, 
              title: newTask.title, 
              assignedTo: newTask.assigned_to, 
              status: newTask.status 
            }]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new;
            setSprintTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, status: updatedTask.status, assignedTo: updatedTask.assigned_to } : t));
          } else if (payload.eventType === 'DELETE') {
             setSprintTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // --- AUTO SAVE LOGIC ---
  useEffect(() => {
    if (!projectId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(async () => {
      const error = await updateProjectState(projectId, {
        vision_data: visionData,
        objectives_data: objectivesData,
        mindset_data: mindsetData,
        session_data: sessionData,
        current_sprint_number: sprintNumber,
        sprints_history: sprintHistory,
        active_module_id: activeModuleId,
        team_availability: teamAvailability,
        impediments: impediments,
        stored_outputs: {
          vision: storedVision,
          objectives: storedObjectives,
          backlog: storedBacklog
        }
      });
      
      // Update Project List Name if it changed
      setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, name: sessionData.projectName || p.name } : p));
      
      if (error) {
         if (
           error.code === 'PGRST204' || 
           error.message?.includes('mindset_data') || 
           error.message?.includes('sprints_history') || 
           error.message?.includes('current_sprint_number') || 
           error.message?.includes('session_data') ||
           error.message?.includes('updated_at')
         ) {
            setShowFixModal(true);
         }
      }

    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [visionData, objectivesData, mindsetData, sessionData, sprintNumber, sprintHistory, activeModuleId, teamAvailability, impediments, storedVision, storedObjectives, storedBacklog, projectId]);


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

  const handleSwitchProject = async (newProjectId: string, showModal = true) => {
    if (newProjectId === projectId) return;
    
    // Show loading state if needed (optional)
    const { data, error } = await fetchProjectById(newProjectId);
    if (data) {
      await loadProjectData(data);
      // Open register modal on switch to check team members, but suppress if coming from delete
      if (showModal) {
        setShowRegisterModal(true);
      }
    } else {
      alert("Errore nel caricamento del progetto.");
      console.error(error);
    }
  };

  // Funzione per preparare un nuovo progetto (svuota i campi e apre il modale)
  const handleOpenNewProject = () => {
    setSessionData({
      projectName: '',
      startDate: new Date().toISOString().split('T')[0],
      teamMembers: [
        { id: Date.now().toString(), name: '', role: 'Product Owner', skills: '' },
        { id: (Date.now() + 1).toString(), name: '', role: 'Scrum Master', skills: '' },
        { id: (Date.now() + 2).toString(), name: '', role: 'Developer', skills: '' }
      ]
    });
    // Non cancelliamo ID progetto attuale finché non salviamo, per non rompere l'UI background
    setShowRegisterModal(true);
  };

  const handleDeleteProject = async (idToDelete: string) => {
    if(!confirm("Sei proprio sicuro di eliminare? Perderai tutti i dati")) return;

    const error = await deleteProject(idToDelete);
    
    if (error) {
      alert("Errore durante l'eliminazione del progetto. Potrebbero esserci restrizioni di sicurezza (RLS) o dati collegati che bloccano l'operazione.\n\nDettaglio: " + JSON.stringify(error));
      return;
    }
    
    const remainingProjects = projectsList.filter(p => p.id !== idToDelete);
    setProjectsList(remainingProjects);

    if (idToDelete === projectId) {
      if (remainingProjects.length > 0) {
        // Switch to the first available project WITHOUT opening the modal
        await handleSwitchProject(remainingProjects[0].id, false);
      } else {
        // If no projects left, force reload to trigger getOrCreate logic (which creates a new one)
        window.location.reload();
      }
    } else {
      alert("Progetto eliminato con successo.");
    }
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

  const handleImportBacklog = async () => {
    if (!projectId) {
      alert("Errore di connessione al database. Impossibile salvare le storie.");
      return;
    }

    if (storedBacklog) {
      if (activeModuleId === 'f4') setTeamBacklogInput(storedBacklog);
      else if (activeModuleId === 'f8') setRoadmapBacklogInput(storedBacklog);
      else if (activeModuleId === 'f9') {
        if (sprintStories.length === 0) {
           const newStories = [
            { external_id: 'US1', text: 'Come utente voglio registrarmi per accedere ai servizi', status: 'backlog', project_id: projectId },
            { external_id: 'US2', text: 'Come admin voglio gestire gli utenti per la sicurezza', status: 'backlog', project_id: projectId },
            { external_id: 'US3', text: 'Come utente voglio visualizzare il catalogo prodotti', status: 'backlog', project_id: projectId }
          ];
          
          for (const s of newStories) {
            await createStory(s);
          }
          const stories = await fetchStories(projectId);
          setSprintStories(stories.map(s => ({ id: s.external_id, text: s.text })));
        }
      }
      else setEditableBacklogContext(storedBacklog);
    } else {
      alert("Genera prima il Backlog nella Fase 6.");
    }
  };

  const addTask = async (storyId: string) => {
    if (!projectId) {
      alert("Database non connesso.");
      return;
    }
    const title = prompt("Descrivi il task:");
    if (title) {
      // Use team availability keys if sessionData team is empty or fails
      const assignee = Object.keys(teamAvailability)[0] || "Unassigned";

      const newTask = {
        project_id: projectId,
        story_id: storyId,
        title,
        assigned_to: assignee,
        status: 'todo' as 'todo'
      };
      
      await createTask(newTask);
    }
  };

  const moveTask = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    setSprintTasks(sprintTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTaskStatus(taskId, newStatus);
  };

  const handleCloseSprint = async () => {
    if (!projectId) return;
    if (!confirm("Sei sicuro di voler chiudere lo Sprint? I task completati verranno archiviati.")) return;

    // 1. Identifica task completati
    const completedTasks = sprintTasks.filter(t => t.status === 'done');
    const activeTasks = sprintTasks.filter(t => t.status !== 'done');

    // 2. Crea oggetto storico
    const sprintLog = {
       number: sprintNumber,
       date: new Date().toISOString(),
       completed_tasks: completedTasks,
       carry_over_tasks: activeTasks.length,
       review_data: reviewData,
       retro_data: retroData,
       team_moods: teamMoods
    };

    const newHistory = [...sprintHistory, sprintLog];

    // 3. Cancella task completati dal DB
    for (const t of completedTasks) {
       await deleteTask(t.id);
    }

    // 4. Aggiorna stato progetto
    await updateProjectState(projectId, {
       sprints_history: newHistory,
       current_sprint_number: sprintNumber + 1
    });

    // 5. Aggiorna stato locale
    setSprintNumber(p => p + 1);
    setSprintHistory(newHistory);
    setSprintTasks(activeTasks); // Rimuovi visivamente i completati
    setReviewData({ feedback: '', demoNotes: '' });
    setRetroData({ good: '', improve: '', actions: '' });
    setSprintStatus('planning'); // Torna al planning del prossimo sprint
    
    alert(`Sprint ${sprintNumber} completato con successo! Inizia il Planning dello Sprint ${sprintNumber + 1}.`);
  };

  // Helper per i grafici
  const renderBurndown = (total: number, remaining: number) => {
    return (
      <svg viewBox="0 0 200 100" className="w-full h-40">
        <line x1="10" y1="10" x2="10" y2="90" stroke="#ccc" strokeWidth="1" />
        <line x1="10" y1="90" x2="190" y2="90" stroke="#ccc" strokeWidth="1" />
        <line x1="10" y1="10" x2="190" y2="90" stroke="#FF5A79" strokeWidth="2" strokeDasharray="4" opacity="0.5" />
        <line x1="10" y1="10" x2="100" y2={90 - (remaining/total * 80)} stroke="#4ADE80" strokeWidth="3" />
        <circle cx="100" cy={90 - (remaining/total * 80)} r="4" fill="#4ADE80" />
        <text x="120" y="20" fontSize="10" fill="#fff">Start: {total}</text>
        <text x="120" y="35" fontSize="10" fill="#fff">Now: {remaining}</text>
      </svg>
    );
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
        // PREPARE TEAM CONTEXT STRING
        const teamContextStr = sessionData.teamMembers
          .filter(m => m.name.trim() !== '')
          .map(m => `- ${m.name} (${m.role}): Skills in ${m.skills}`)
          .join('\n');

        result = await generateTeamStructure({ 
          strategy: teamStrategicInput || storedObjectives, 
          backlog: teamBacklogInput || storedBacklog,
          teamMembers: teamContextStr // Pass team context to AI
        });
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

  // --- SAVE AND CONTINUE ---
  const handleSaveAndContinue = async () => {
    if (!projectId) return;

    // Force save
    await updateProjectState(projectId, {
      vision_data: visionData,
      objectives_data: objectivesData,
      mindset_data: mindsetData,
      session_data: sessionData,
      current_sprint_number: sprintNumber,
      sprints_history: sprintHistory,
      active_module_id: activeModuleId, // Will be updated next
      team_availability: teamAvailability,
      impediments: impediments,
      stored_outputs: {
        vision: storedVision,
        objectives: storedObjectives,
        backlog: storedBacklog
      }
    });
    
    // Refresh project list to reflect name changes
    await refreshProjectList();

    const currentIndex = MODULES.findIndex(m => m.id === activeModuleId);
    if (currentIndex !== -1 && currentIndex < MODULES.length - 1) {
      const nextModuleId = MODULES[currentIndex + 1].id;
      setActiveModuleId(nextModuleId);
      setGeneratedOutput(''); // Clear output for next module view
      window.scrollTo(0,0);
    } else {
      alert("Hai completato l'ultimo modulo disponibile!");
    }
  };

  // --- SESSION REGISTRATION HANDLER ---
  const handleSaveSession = async () => {
     if(!projectId) return;
     
     // Update team availability based on session data members
     const newAvailability: Record<string, number> = {};
     sessionData.teamMembers.forEach(m => {
       if(m.name) newAvailability[`${m.name} (${m.role})`] = 40; // Default 40h
     });
     
     setTeamAvailability(newAvailability);
     
     // Save to DB
     await updateProjectState(projectId, {
        session_data: sessionData,
        team_availability: newAvailability
     });
     
     // Update project list immediately
     setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, name: sessionData.projectName || p.name } : p));
     
     setShowRegisterModal(false);
  };

  // --- CREATE NEW PROJECT HANDLER ---
  const handleCreateNewProject = async () => {
    // Basic validation
    if (!sessionData.projectName.trim()) {
      alert("Inserisci un nome per il nuovo progetto.");
      return;
    }

    // Prepare availability map
    const newAvailability: Record<string, number> = {};
    sessionData.teamMembers.forEach(m => {
      if(m.name) newAvailability[`${m.name} (${m.role})`] = 40;
    });

    const newProjectData: Partial<DBProjectState> = {
      session_data: sessionData,
      team_availability: newAvailability
    };

    const { data, error } = await createNewProject(newProjectData);

    if (data && data.id) {
      await loadProjectData(data);
      await refreshProjectList();
      setTeamAvailability(newAvailability);
      alert(`Nuovo progetto "${sessionData.projectName}" creato con successo!`);
      setShowRegisterModal(false);
    } else {
      console.error(error);
      alert("Errore nella creazione del nuovo progetto.");
    }
  };

  const handleUpdateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setSessionData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const handleAddTeamMember = () => {
    setSessionData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { id: Date.now().toString(), name: '', role: 'Developer', skills: '' }]
    }));
  };

  const handleRemoveTeamMember = (id: string) => {
    setSessionData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.id !== id)
    }));
  };

  // --- EDIT OUTPUT LOGIC ---
  const toggleEditOutput = () => {
    if (isEditingOutput) {
      // Save changes
      if (outputRef.current) {
        const newContent = outputRef.current.innerHTML;
        setGeneratedOutput(newContent);
        
        // Update the specific stored state based on module
        if (activeModuleId === 'f1') setStoredVision(newContent);
        else if (activeModuleId === 'f2') setStoredObjectives(newContent);
        else if (activeModuleId === 'f6') setStoredBacklog(newContent);
      }
      setIsEditingOutput(false);
    } else {
      setIsEditingOutput(true);
    }
  };

  const handleSelectModule = (id: string) => {
    setActiveModuleId(id);
    setGeneratedOutput('');
    setIsEditingOutput(false);
  };

  const toggleObeyaItem = (item: string) => {
    setSelectedObeyaItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // Conditional Rendering logic
  if (currentView === 'landing') {
    return <LandingPage onStart={() => setCurrentView('app')} />;
  }

  return (
    <div className="flex h-screen bg-[#4B4E54] overflow-hidden">
      <Sidebar 
        activeModuleId={activeModuleId} 
        onSelectModule={handleSelectModule} 
        onGoHome={() => setCurrentView('landing')}
        onOpenRegister={() => setShowRegisterModal(true)}
        onNewProject={handleOpenNewProject}
        projects={projectsList}
        currentProjectId={projectId}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProject}
      />

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
                {projectId && (
                   <span className="text-[9px] text-green-500 font-bold ml-4 animate-pulse">● DB CONNECTED</span>
                )}
                {dbError && (
                   <span className="text-[9px] text-red-500 font-bold ml-4" title="Controlla la console per dettagli">● DB CONNECTION FAILED</span>
                )}
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
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Intro Section - MINDSET AGILE */}
                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border border-white/5 relative overflow-hidden">
                   <div className="relative z-10">
                    <h2 className="text-4xl font-black italic mb-6">Il Mindset Agile</h2>
                    <p className="text-lg text-gray-300 leading-relaxed max-w-3xl mb-8">
                      Prima di costruire il tuo progetto, è fondamentale capire la differenza di mentalità tra l'approccio tradizionale e quello Agile.
                    </p>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
                      <h3 className="text-xl font-black text-[#FF5A79] uppercase mb-4 italic">Perché partire dal Mindset?</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        L'Agile non è solo un processo, è un modo di pensare. Prima di definire cosa fare (il prodotto), dobbiamo definire come lavorare insieme. In questa sezione, esplorerai i pilastri di Scrum e configurerai l'approccio del tuo team.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm font-medium text-gray-400">
                        <li>• Leggi i valori del Manifesto Agile per allineare il team.</li>
                        <li>• Studia i ruoli di Scrum: Product Owner (Tu), Scrum Master (Processo), Team (Esecuzione).</li>
                        <li>• Usa i selettori in basso per confermare la tua adesione ai principi.</li>
                      </ul>
                    </div>
                   </div>
                   <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF5A79] blur-[200px] opacity-10 rounded-full pointer-events-none"></div>
                </section>

                {/* Waterfall vs Agile Comparison */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Waterfall */}
                  <div className="bg-slate-200 rounded-[40px] p-10 border border-slate-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gray-400"></div>
                    <div className="mb-8">
                      <h3 className="text-2xl font-black text-slate-700 uppercase tracking-tight mb-2">Waterfall (Tradizionale)</h3>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Approccio sequenziale e rigido</p>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {[
                        { icon: '🔒', title: 'Pianificazione completa', desc: 'Tutto definito prima di iniziare' },
                        { icon: '🐢', title: 'Fasi sequenziali', desc: 'Analisi → Design → Sviluppo → Test' },
                        { icon: '🐢', title: 'Feedback solo alla fine', desc: 'Il cliente vede il prodotto a progetto concluso' },
                        { icon: '🧱', title: 'Resistenza al cambiamento', desc: 'Modifiche costose e difficili' },
                        { icon: '📦', title: 'Consegna unica finale', desc: 'Tutto o niente alla fine' }
                      ].map((item, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-300/50">
                          <h4 className="font-black text-slate-800 mb-1 flex items-center text-sm">
                            <span className="mr-3">{item.icon}</span>
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed ml-7">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Waterfall Flow Visual */}
                    <div className="mt-8 flex justify-between items-center opacity-40 grayscale text-[10px] font-black uppercase text-slate-500">
                       <div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center mb-1">1</div>Requisiti</div>
                       <div className="h-0.5 flex-1 bg-slate-400 mx-1"></div>
                       <div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center mb-1">2</div>Design</div>
                       <div className="h-0.5 flex-1 bg-slate-400 mx-1"></div>
                       <div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center mb-1">3</div>Sviluppo</div>
                       <div className="h-0.5 flex-1 bg-slate-400 mx-1"></div>
                       <div className="flex flex-col items-center"><div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center mb-1">4</div>Test</div>
                    </div>
                  </div>

                  {/* Agile */}
                  <div className="bg-[#1e293b] rounded-[40px] p-10 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF5A79] to-purple-500"></div>
                     <div className="mb-8 relative z-10">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Agile (Iterativo)</h3>
                      <p className="text-sm font-bold text-[#FF5A79] uppercase tracking-widest">Approccio flessibile e adattivo</p>
                    </div>

                    <div className="space-y-4 relative z-10">
                       {[
                        { icon: '📅', title: 'Pianificazione progressiva', desc: 'Si pianifica a breve termine (Sprint)' },
                        { icon: '🔄', title: 'Iterazioni continue', desc: 'Cicli di 2-4 settimane con valore tangibile' },
                        { icon: '💬', title: 'Feedback costante', desc: 'Demo frequenti e adattamento continuo' },
                        { icon: '🌊', title: 'Abbraccia il cambiamento', desc: 'Rispondere al cambiamento > seguire un piano' },
                        { icon: '🎁', title: 'Consegne incrementali', desc: 'Valore consegnato ad ogni Sprint' }
                      ].map((item, i) => (
                       <div key={i} className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                        <h4 className="font-black text-white mb-1 flex items-center text-sm">
                          <span className="text-[#FF5A79] mr-3">{item.icon}</span>
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400 leading-relaxed ml-7">{item.desc}</p>
                      </div>
                      ))}
                    </div>

                    {/* Agile Flow Visual */}
                    <div className="mt-10 flex justify-center items-center">
                      <div className="relative w-40 h-40">
                         <div className="absolute inset-0 rounded-full border-4 border-[#FF5A79] border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                           <span className="text-2xl">🔄</span>
                           <span className="text-[10px] font-black uppercase text-white tracking-widest mt-2">Sprint<br/>Continui</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Scrum Framework Detail */}
                <section className="bg-white rounded-[48px] p-12 shadow-2xl border border-slate-200">
                  <div className="text-center mb-16">
                     <span className="bg-slate-100 text-slate-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">1995 • Ken Schwaber & Jeff Sutherland</span>
                     <h3 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Il Framework Scrum</h3>
                     <p className="text-slate-500 max-w-2xl mx-auto font-medium">Scrum è il framework Agile più diffuso per gestire progetti complessi dove i requisiti cambiano frequentemente.</p>
                  </div>

                  {/* Scrum Diagram (Simplified CSS Representation) */}
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-16 opacity-80 scale-90 md:scale-100">
                     <div className="bg-slate-800 text-white p-4 rounded-xl text-center w-32"><div className="text-2xl">🔄</div><div className="text-[9px] font-black uppercase">Product Backlog</div></div>
                     <div className="text-3xl text-slate-300">→</div>
                     <div className="bg-slate-100 p-4 rounded-xl text-center w-32 border border-slate-300"><div className="text-2xl">📝</div><div className="text-[9px] font-black uppercase text-slate-700">Sprint Backlog</div></div>
                     <div className="text-3xl text-slate-300">→</div>
                     <div className="relative w-40 h-40 rounded-full border-4 border-dashed border-[#FF5A79] flex items-center justify-center bg-slate-50">
                        <div className="text-center">
                           <div className="text-xs font-black uppercase text-[#FF5A79]">Sprint</div>
                           <div className="text-[9px] font-bold text-slate-400">2-4 Settimane</div>
                        </div>
                     </div>
                     <div className="text-3xl text-slate-300">→</div>
                     <div className="bg-green-100 p-4 rounded-xl text-center w-32 border border-green-300"><div className="text-2xl">📦</div><div className="text-[9px] font-black uppercase text-green-700">Incremento</div></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                     <div>
                        <h4 className="text-xl font-black text-slate-800 uppercase italic mb-4">🤔 Perché Esiste Scrum?</h4>
                        <ul className="space-y-4">
                           <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="font-black text-sm uppercase block text-slate-700">Complessità Ingestibile</span>
                              <span className="text-xs text-slate-500">I progetti tradizionali fallivano perché non potevano prevedere tutti i requisiti all'inizio.</span>
                           </li>
                           <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="font-black text-sm uppercase block text-slate-700">Mercati Volatili</span>
                              <span className="text-xs text-slate-500">Quando un piano di 18 mesi era pronto, il mercato era già cambiato.</span>
                           </li>
                           <li className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <span className="font-black text-sm uppercase block text-slate-700">Feedback Tardivo</span>
                              <span className="text-xs text-slate-500">I clienti vedevano il prodotto solo alla fine, quando i costi di modifica erano altissimi.</span>
                           </li>
                        </ul>
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-slate-800 uppercase italic mb-4">🔬 Il Processo Empirico</h4>
                        <p className="text-sm text-slate-500 mb-4">Scrum si basa su un approccio empirico: le decisioni si prendono in base all'osservazione dei fatti.</p>
                        <div className="grid grid-cols-1 gap-3">
                           <div className="flex items-center space-x-3"><span className="text-2xl">👁️</span><span className="font-bold text-slate-700">Trasparenza:</span> <span className="text-xs text-slate-500">Tutti vedono cosa sta succedendo.</span></div>
                           <div className="flex items-center space-x-3"><span className="text-2xl">🔍</span><span className="font-bold text-slate-700">Ispezione:</span> <span className="text-xs text-slate-500">Si controlla regolarmente il progresso.</span></div>
                           <div className="flex items-center space-x-3"><span className="text-2xl">🔄</span><span className="font-bold text-slate-700">Adattamento:</span> <span className="text-xs text-slate-500">Si corregge la rotta se necessario.</span></div>
                        </div>
                     </div>
                  </div>

                  {/* Values Grid */}
                  <div className="mb-16">
                    <h4 className="text-center text-sm font-black text-[#FF5A79] uppercase tracking-[0.3em] mb-8">💎 I 5 Valori di Scrum</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { icon: '🎯', title: 'Impegno', desc: 'Raggiungere gli obiettivi' },
                        { icon: '🦁', title: 'Coraggio', desc: 'Affrontare problemi difficili' },
                        { icon: '🔭', title: 'Focus', desc: 'Concentrarsi sullo Sprint' },
                        { icon: '🤝', title: 'Apertura', desc: 'Trasparenza su sfide' },
                        { icon: '🙏', title: 'Rispetto', desc: 'Rispetto reciproco' },
                      ].map((val, i) => (
                        <div key={i} className="bg-slate-50 p-6 rounded-[24px] text-center hover:shadow-lg transition-all border border-slate-100">
                          <div className="text-4xl mb-4">{val.icon}</div>
                          <div className="font-black text-slate-800 text-sm uppercase mb-2">{val.title}</div>
                          <div className="text-[10px] font-bold text-slate-400 leading-tight">{val.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Roles & Ceremonies Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Roles */}
                    <div className="space-y-6">
                      <h4 className="text-2xl font-black text-slate-800 uppercase italic">👥 I Ruoli di Scrum</h4>
                      <div className="space-y-4">
                        {[
                          { title: 'Product Owner', icon: '👔', desc: 'Massimizza il valore. Prioritizza il Backlog. Voce del cliente.', not: 'Un Project Manager' },
                          { title: 'Scrum Master', icon: '🛡️', desc: 'Facilita il processo. Rimuove impedimenti. Servant Leader.', not: 'Un Capo' },
                          { title: 'Dev Team', icon: '💻', desc: 'Realizza l\'incremento. Auto-organizzato. Cross-funzionale.', not: 'Esecutori passivi' },
                        ].map((role, i) => (
                          <div key={i} className="flex items-start space-x-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                            <div className="text-3xl bg-slate-50 w-12 h-12 flex items-center justify-center rounded-xl">{role.icon}</div>
                            <div>
                              <h5 className="font-black text-slate-800 uppercase">{role.title}</h5>
                              <p className="text-xs text-slate-600 mt-1 mb-2 font-medium">{role.desc}</p>
                              <p className="text-[10px] text-red-400 font-bold uppercase">NON è {role.not}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Ceremonies & Artifacts */}
                    <div className="space-y-6">
                      <h4 className="text-2xl font-black text-slate-800 uppercase italic">📅 Cerimonie & Artefatti</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-[#FF5A79]/5 p-4 rounded-2xl border border-[#FF5A79]/10">
                           <div className="text-[#FF5A79] font-black text-xs uppercase mb-1">Planning</div>
                           <div className="text-xs text-slate-600 font-bold">Cosa + Come (8h max)</div>
                         </div>
                         <div className="bg-[#FF5A79]/5 p-4 rounded-2xl border border-[#FF5A79]/10">
                           <div className="text-[#FF5A79] font-black text-xs uppercase mb-1">Daily</div>
                           <div className="text-xs text-slate-600 font-bold">Sync 15 min</div>
                         </div>
                         <div className="bg-[#FF5A79]/5 p-4 rounded-2xl border border-[#FF5A79]/10">
                           <div className="text-[#FF5A79] font-black text-xs uppercase mb-1">Review</div>
                           <div className="text-xs text-slate-600 font-bold">Demo + Feedback</div>
                         </div>
                         <div className="bg-[#FF5A79]/5 p-4 rounded-2xl border border-[#FF5A79]/10">
                           <div className="text-[#FF5A79] font-black text-xs uppercase mb-1">Retro</div>
                           <div className="text-xs text-slate-600 font-bold">Miglioramento continuo</div>
                         </div>
                      </div>
                      <div className="bg-slate-900 text-white p-6 rounded-2xl mt-4">
                        <h5 className="font-black uppercase text-xs tracking-widest text-[#FF5A79] mb-4">Artefatti Scrum</h5>
                         <ul className="space-y-3 text-sm font-medium text-gray-300">
                           <li className="flex items-start"><span className="text-lg mr-2">📚</span><div><strong className="block text-white text-xs">Product Backlog</strong> Lista ordinata di tutto ciò che serve.</div></li>
                           <li className="flex items-start"><span className="text-lg mr-2">📝</span><div><strong className="block text-white text-xs">Sprint Backlog</strong> Piano per lo Sprint corrente.</div></li>
                           <li className="flex items-start"><span className="text-lg mr-2">📦</span><div><strong className="block text-white text-xs">Incremento</strong> Prodotto "Done" utilizzabile.</div></li>
                         </ul>
                      </div>
                    </div>
                  </div>

                  {/* 4 Key Changes */}
                  <div className="mt-16 pt-16 border-t border-slate-100">
                    <h4 className="text-center text-xl font-black text-slate-800 uppercase italic mb-8">4 Cambiamenti Chiave nel Modo di Lavorare</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="text-center">
                          <div className="text-3xl mb-2">🤝</div>
                          <div className="text-xs font-black uppercase text-slate-800 mb-1">Team Auto-Organizzati</div>
                          <div className="text-[10px] text-slate-500">Il team decide come lavorare</div>
                       </div>
                       <div className="text-center">
                          <div className="text-3xl mb-2">📢</div>
                          <div className="text-xs font-black uppercase text-slate-800 mb-1">Comunicazione Continua</div>
                          <div className="text-[10px] text-slate-500">Collaborazione costante</div>
                       </div>
                       <div className="text-center">
                          <div className="text-3xl mb-2">📈</div>
                          <div className="text-xs font-black uppercase text-slate-800 mb-1">Progresso Dimostrabile</div>
                          <div className="text-[10px] text-slate-500">Avanzamento tangibile</div>
                       </div>
                       <div className="text-center">
                          <div className="text-3xl mb-2">🦎</div>
                          <div className="text-xs font-black uppercase text-slate-800 mb-1">Adattabilità</div>
                          <div className="text-[10px] text-slate-500">Cambiamenti come opportunità</div>
                       </div>
                    </div>
                  </div>
                </section>

                {/* Non-Software Context Warning */}
                <section className="bg-amber-400 rounded-[32px] p-8 shadow-xl text-slate-900 relative overflow-hidden">
                   <div className="relative z-10 flex items-start space-x-6">
                      <div className="text-5xl">⚠️</div>
                      <div>
                        <h3 className="text-2xl font-black uppercase italic mb-2">Una Precisazione Importante</h3>
                        <p className="font-bold text-lg mb-4 opacity-90">Il "Valore" non è sempre Software</p>
                        <p className="text-sm font-medium leading-relaxed max-w-4xl mb-6">
                          Agile è nato nel software, ma funziona anche per Hardware, Marketing, HR e Costruzioni.
                          L'obiettivo non è "rilasciare codice" ma <strong>ridurre il rischio validando ipotesi</strong>.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-black/5">
                              <h4 className="font-black text-xs uppercase mb-2">✅ Se PUOI rilasciare incrementi</h4>
                              <p className="text-[10px] font-bold mb-1 opacity-70">Software, App, Siti</p>
                              <ul className="text-[10px] list-disc pl-4 space-y-1">
                                 <li>Rilascia funzionalità complete</li>
                                 <li>Raccogli feedback dagli utenti reali</li>
                              </ul>
                           </div>
                           <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-black/5">
                              <h4 className="font-black text-xs uppercase mb-2">⚙️ Se NON PUOI rilasciare incrementi</h4>
                              <p className="text-[10px] font-bold mb-1 opacity-70">Hardware, Eventi, Costruzioni</p>
                              <ul className="text-[10px] list-disc pl-4 space-y-1">
                                 <li>Mostra prototipi validati o mockup</li>
                                 <li>Presenta componenti testati singolarmente</li>
                                 <li>Condividi documentazione verificata</li>
                              </ul>
                           </div>
                        </div>
                      </div>
                   </div>
                   <div className="absolute -bottom-20 -right-20 text-9xl opacity-20 rotate-12">🏗️</div>
                </section>

                {/* Interactive: Punto di Partenza */}
                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border border-white/5">
                  <div className="flex items-center space-x-4 mb-10">
                     <div className="w-12 h-12 rounded-full bg-[#FF5A79] flex items-center justify-center text-2xl shadow-lg border-2 border-white">🚀</div>
                     <h3 className="text-3xl font-black uppercase italic tracking-tight">Il Tuo Punto di Partenza</h3>
                  </div>
                  <p className="text-gray-400 mb-8">Aiutaci a capire la tua situazione attuale. Useremo queste informazioni per personalizzare i suggerimenti nelle fasi successive.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Qual è l'esperienza del tuo team con metodologie Agile?</label>
                      <select 
                        value={mindsetData.experience} 
                        onChange={(e) => setMindsetData({...mindsetData, experience: e.target.value})}
                        className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-5 text-sm font-bold focus:border-[#FF5A79] outline-none appearance-none cursor-pointer"
                      >
                        <option>Nessuna esperienza (primo approccio)</option>
                        <option>Base (conosciamo i concetti)</option>
                        <option>Intermedia (abbiamo usato Scrum/Kanban)</option>
                        <option>Avanzata (usiamo Agile da anni)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Il team è pronto ad abbracciare il cambiamento?</label>
                      <select 
                        value={mindsetData.readiness} 
                        onChange={(e) => setMindsetData({...mindsetData, readiness: e.target.value})}
                        className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-5 text-sm font-bold focus:border-[#FF5A79] outline-none appearance-none cursor-pointer"
                      >
                         <option>Sì, siamo pronti!</option>
                         <option>Parzialmente</option>
                         <option>Abbiamo forti resistenze interne</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quali sono le sfide principali che affrontate oggi?</label>
                       <textarea 
                        rows={3}
                        value={mindsetData.challenges}
                        onChange={(e) => setMindsetData({...mindsetData, challenges: e.target.value})}
                        placeholder="Es. Troppe riunioni, requisiti poco chiari, consegne in ritardo..."
                        className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-5 text-sm font-medium focus:border-[#FF5A79] outline-none resize-none"
                       />
                    </div>

                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Cosa vi aspettate da questo percorso?</label>
                       <textarea 
                        rows={3}
                        value={mindsetData.expectations}
                        onChange={(e) => setMindsetData({...mindsetData, expectations: e.target.value})}
                        placeholder="Es. Migliorare la velocità, ridurre i bug, migliorare il morale..."
                        className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-5 text-sm font-medium focus:border-[#FF5A79] outline-none resize-none"
                       />
                    </div>
                  </div>
                  
                  {/* Save and Continue Button for Modulo 0 */}
                  <div className="mt-8 flex justify-end">
                     <button onClick={handleSaveAndContinue} className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center space-x-2">
                        <span>SALVA E PROSEGUI</span>
                        <span>→</span>
                     </button>
                  </div>
                </section>
              </div>
            ) : activeModuleId === 'f9' ? (
              <div className="space-y-12">
                {/* Sprint Navigation & Session Timers */}
                <div className="flex items-center justify-between bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-8xl text-white select-none pointer-events-none">#{sprintNumber}</div>
                  <div className="flex space-x-2 relative z-10 flex-wrap gap-y-2">
                    {[
                      { id: 'planning', label: '1. Planning' },
                      { id: 'active', label: '2. Kanban' },
                      { id: 'daily', label: '3. Daily' },
                      { id: 'review', label: '4. Review' },
                      { id: 'retro', label: '5. Retro' },
                      { id: 'kpi', label: '6. Sprint KPI' }
                    ].map((step) => (
                      <button 
                        key={step.id}
                        onClick={() => setSprintStatus(step.id as any)}
                        className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${sprintStatus === step.id ? 'bg-[#FF5A79] text-white' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-6 relative z-10">
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
                    {sprintStatus === 'review' && (
                      <button onClick={() => startSession(60)} className="bg-[#E67E22] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Avvia Review (1h)</button>
                    )}
                    {sprintStatus === 'retro' && (
                      <button onClick={() => startSession(45)} className="bg-[#E67E22] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Avvia Retro (45m)</button>
                    )}
                  </div>
                </div>

                {/* SPRINT PLANNING VIEW */}
                {sprintStatus === 'planning' && (
                  <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
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
                                        onChange={(e) => {
                                          /* Ottimizzazione UI: aggiornamento locale immediato gestito dal componente padre o non critico qui */
                                        }}
                                        className="text-[10px] font-black uppercase bg-transparent border-none outline-none text-[#FF5A79] cursor-pointer"
                                      >
                                        {/* Use names from teamAvailability or fallback */}
                                        {Object.keys(teamAvailability).length > 0 ? (
                                           Object.keys(teamAvailability).map(name => <option key={name} value={name}>{name}</option>)
                                        ) : (
                                           <option>Unassigned</option>
                                        )}
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
                          {Object.keys(teamAvailability).length > 0 ? Object.entries(teamAvailability).map(([name, hours]) => (
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
                          )) : <p className="text-sm text-slate-400 italic">Registra la sessione per aggiungere membri al team.</p>}
                        </div>
                      </div>
                      
                      <button onClick={() => {setSprintStatus('active'); startSession(0);}} className="w-full bg-[#FF5A79] text-white py-8 rounded-[32px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                        AVVIA SPRINT 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* KANBAN & DAILY VIEW */}
                {(sprintStatus === 'active' || sprintStatus === 'daily') && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
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

                {/* REVIEW VIEW */}
                {sprintStatus === 'review' && (
                  <div className="grid grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="col-span-8 space-y-8">
                        <div className="bg-white rounded-[48px] p-10 border border-slate-200 shadow-sm">
                           <h3 className="text-2xl font-black uppercase italic mb-8">Sprint Review Report</h3>
                           <div className="grid grid-cols-2 gap-6 mb-8">
                              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Completati</p>
                                 <p className="text-4xl font-black text-slate-900">{sprintTasks.filter(t => t.status === 'done').length}</p>
                              </div>
                              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Totali</p>
                                 <p className="text-4xl font-black text-slate-900">{sprintTasks.length}</p>
                              </div>
                           </div>
                           
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Feedback degli Stakeholders</label>
                           <textarea 
                              rows={6}
                              value={reviewData.feedback}
                              onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                              placeholder="Cosa hanno detto gli stakeholder durante la demo? Feedback, richieste di modifiche..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:border-[#FF5A79] outline-none resize-none"
                           />
                        </div>
                     </div>
                     <div className="col-span-4">
                        <div className="bg-[#4B4E54] rounded-[48px] p-10 text-white h-full border border-white/5">
                           <h3 className="text-xl font-black uppercase italic mb-6">Demo Checklist</h3>
                           <ul className="space-y-4 text-sm font-medium text-gray-300">
                              <li className="flex items-center space-x-3"><span className="text-[#FF5A79]">✔</span><span>Presentare l'obiettivo dello Sprint</span></li>
                              <li className="flex items-center space-x-3"><span className="text-[#FF5A79]">✔</span><span>Mostrare solo le storie "Done"</span></li>
                              <li className="flex items-center space-x-3"><span className="text-[#FF5A79]">✔</span><span>Raccogliere feedback, non difendersi</span></li>
                              <li className="flex items-center space-x-3"><span className="text-[#FF5A79]">✔</span><span>Aggiornare il backlog se necessario</span></li>
                           </ul>
                        </div>
                     </div>
                  </div>
                )}

                {/* RETROSPECTIVE VIEW */}
                {sprintStatus === 'retro' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="grid grid-cols-3 gap-8">
                        <div className="bg-green-50 rounded-[40px] p-8 border border-green-100">
                           <div className="flex items-center space-x-3 mb-6">
                              <span className="text-2xl">😄</span>
                              <h3 className="text-lg font-black text-green-800 uppercase italic">Cosa ha funzionato?</h3>
                           </div>
                           <textarea 
                              rows={8}
                              value={retroData.good}
                              onChange={(e) => setRetroData({...retroData, good: e.target.value})}
                              className="w-full bg-white border border-green-200 rounded-2xl p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-green-200"
                              placeholder="Aspetti positivi..."
                           />
                        </div>
                        <div className="bg-red-50 rounded-[40px] p-8 border border-red-100">
                           <div className="flex items-center space-x-3 mb-6">
                              <span className="text-2xl">😤</span>
                              <h3 className="text-lg font-black text-red-800 uppercase italic">Cosa migliorare?</h3>
                           </div>
                           <textarea 
                              rows={8}
                              value={retroData.improve}
                              onChange={(e) => setRetroData({...retroData, improve: e.target.value})}
                              className="w-full bg-white border border-red-200 rounded-2xl p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-red-200"
                              placeholder="Problemi e blocchi..."
                           />
                        </div>
                        <div className="bg-blue-50 rounded-[40px] p-8 border border-blue-100">
                           <div className="flex items-center space-x-3 mb-6">
                              <span className="text-2xl">🚀</span>
                              <h3 className="text-lg font-black text-blue-800 uppercase italic">Action Items</h3>
                           </div>
                           <textarea 
                              rows={8}
                              value={retroData.actions}
                              onChange={(e) => setRetroData({...retroData, actions: e.target.value})}
                              className="w-full bg-white border border-blue-200 rounded-2xl p-4 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Azioni concrete per il prossimo sprint..."
                           />
                        </div>
                     </div>

                     <div className="bg-[#1e293b] rounded-[48px] p-12 text-center border border-white/10 shadow-2xl">
                        <h3 className="text-2xl font-black text-white uppercase italic mb-4">Sprint {sprintNumber} Completato?</h3>
                        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                           Chiudendo lo sprint, i task completati verranno archiviati nello storico. I task non completati rimarranno disponibili per il prossimo Sprint Planning.
                        </p>
                        <button 
                           onClick={handleCloseSprint}
                           className="bg-[#FF5A79] hover:bg-[#ff4065] text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
                        >
                           🏁 CHIUDI SPRINT & INIZIA SPRINT {sprintNumber + 1}
                        </button>
                     </div>
                  </div>
                )}
                
                {/* SPRINT KPI VIEW */}
                {sprintStatus === 'kpi' && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-2 gap-8">
                       {/* Burndown Chart */}
                       <div className="bg-[#1e293b] p-8 rounded-[40px] border border-white/10 shadow-xl">
                          <h3 className="text-xl font-black text-white uppercase italic mb-6">📉 Burndown Sprint {sprintNumber}</h3>
                          {renderBurndown(sprintTasks.length, sprintTasks.filter(t => t.status !== 'done').length)}
                          <p className="text-center text-xs text-gray-400 mt-4">Stato attuale vs Ideal Line. Basato sul numero di Task.</p>
                       </div>

                       {/* Performance Stats */}
                       <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                             <h3 className="text-xl font-black text-slate-800 uppercase italic mb-6">⚡ Performance Sprint</h3>
                          </div>
                          
                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                             <div className="text-4xl font-black text-[#FF5A79] mb-2">{sprintTasks.length > 0 ? Math.round((sprintTasks.filter(t => t.status === 'done').length / sprintTasks.length) * 100) : 0}%</div>
                             <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rendimento (Closed/Total)</div>
                          </div>

                          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                             <div className="text-4xl font-black text-blue-500 mb-2">{Object.values(teamAvailability).reduce((a, b) => a + b, 0)}h</div>
                             <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Capacità Totale Team</div>
                          </div>
                          
                          <div className="col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Mood Giornalieri</h4>
                             <div className="flex justify-around">
                                {Object.entries(teamMoods).length > 0 ? Object.entries(teamMoods).map(([name, mood]) => (
                                   <div key={name} className="text-center">
                                      <div className="text-2xl mb-1">{mood}</div>
                                      <div className="text-[8px] font-bold uppercase text-slate-500">{name.split(' ')[0]}</div>
                                   </div>
                                )) : <p className="text-xs text-slate-400 italic">Nessun mood registrato</p>}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeModuleId === 'f10' ? (
               /* --- MODULE 10: STATISTICS & DATA DRIVEN --- */
               <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <header className="bg-slate-900 rounded-[48px] p-12 shadow-2xl text-white border border-white/10 flex justify-between items-center relative overflow-hidden">
                     <div className="relative z-10">
                        <h2 className="text-5xl font-black italic mb-4">Dashboard Data Driven</h2>
                        <p className="text-gray-400 max-w-xl font-medium">Analisi aggregata delle performance del progetto. Monitora i trend per migliorare l'efficacia del team.</p>
                     </div>
                     <div className="text-9xl relative z-10">📊</div>
                     <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-blue-900/50 to-transparent pointer-events-none"></div>
                  </header>

                  <div className="grid grid-cols-3 gap-8">
                     {/* YTD Stats */}
                     <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-xl col-span-3 md:col-span-1">
                        <h3 className="text-lg font-black text-slate-800 uppercase italic mb-8">Year To Date (YTD)</h3>
                        <div className="space-y-6">
                           <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-500 uppercase">Sprint Completati</span>
                              <span className="text-2xl font-black text-slate-900">{sprintHistory.length}</span>
                           </div>
                           <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-500 uppercase">Task Chiusi Totali</span>
                              <span className="text-2xl font-black text-green-500">
                                 {sprintHistory.reduce((acc, sprint) => acc + (sprint.completed_tasks?.length || 0), 0)}
                              </span>
                           </div>
                           <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                              <span className="text-xs font-bold text-slate-500 uppercase">Velocity Media</span>
                              <span className="text-2xl font-black text-blue-500">
                                 {sprintHistory.length > 0 
                                    ? Math.round(sprintHistory.reduce((acc, sprint) => acc + (sprint.completed_tasks?.length || 0), 0) / sprintHistory.length) 
                                    : 0}
                                 <span className="text-xs text-slate-400 font-bold ml-1">task/sprint</span>
                              </span>
                           </div>
                        </div>
                     </div>

                     {/* Burnup Chart */}
                     <div className="bg-[#1e293b] p-8 rounded-[40px] border border-white/10 shadow-xl col-span-3 md:col-span-2">
                        <h3 className="text-lg font-black text-white uppercase italic mb-6">📈 Project Burnup Chart</h3>
                        <div className="h-64 w-full flex items-end space-x-2 relative pl-10 pb-10">
                           {/* Simplified Burnup Visualization */}
                           {/* Assi */}
                           <div className="absolute left-0 top-0 bottom-10 w-px bg-white/20"></div>
                           <div className="absolute left-10 bottom-0 right-0 h-px bg-white/20"></div>
                           
                           {sprintHistory.length === 0 ? (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 italic">
                                 Completa almeno uno sprint per vedere i dati.
                              </div>
                           ) : (
                              sprintHistory.map((sprint, index) => {
                                 const cumulativeDone = sprintHistory.slice(0, index + 1).reduce((acc: number, s: any) => acc + (s.completed_tasks?.length || 0), 0);
                                 // Simple scaling for demo purposes (assuming max 50 tasks for height)
                                 const height = Math.min((cumulativeDone / 50) * 100, 100); 
                                 
                                 return (
                                    <div key={index} className="flex-1 flex flex-col justify-end items-center group relative">
                                       <div 
                                          style={{ height: `${height}%` }} 
                                          className="w-full max-w-[40px] bg-green-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all"
                                       ></div>
                                       <span className="text-[10px] font-bold text-gray-400 mt-2 absolute -bottom-6">S{sprint.number}</span>
                                       
                                       {/* Tooltip */}
                                       <div className="absolute bottom-full mb-2 bg-black text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                          Tot: {cumulativeDone}
                                       </div>
                                    </div>
                                 );
                              })
                           )}
                           {/* Ideal Scope Line (Static for demo) */}
                           <div className="absolute left-10 bottom-10 right-0 top-10 border-t-2 border-dashed border-[#FF5A79]/50 pointer-events-none">
                              <span className="text-[9px] text-[#FF5A79] absolute right-0 -top-4">Target Scope</span>
                           </div>
                        </div>
                     </div>
                  </div>
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
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                             <div className="flex justify-between items-center mb-2">
                                <span className="text-[9px] font-black text-[#FF5A79] uppercase tracking-widest">Team Registrato</span>
                                <button onClick={() => setShowRegisterModal(true)} className="text-[8px] text-gray-400 hover:text-white underline">Modifica</button>
                             </div>
                             {sessionData.teamMembers.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                 {sessionData.teamMembers.map(m => (
                                   <span key={m.id} className="bg-white/10 px-2 py-1 rounded text-[10px] text-gray-200 font-bold">{m.name} ({m.role})</span>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-[10px] text-gray-500 italic">Nessun membro registrato. Aggiungili nel Registro Sessione per personalizzare l'output AI.</p>
                             )}
                          </div>

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

                      {/* Save and Continue Button */}
                      <button onClick={handleSaveAndContinue} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-3 shadow-xl active:scale-95 mt-4 border border-white/10">
                        <span>💾 SALVA E PROSEGUI →</span>
                      </button>
                    </div>

                    <div className="col-span-7 bg-[#0D0F14] rounded-[40px] p-10 border border-white/10 flex flex-col min-h-[650px] shadow-[inset_0_2px_15px_rgba(0,0,0,0.6)]">
                      <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xl font-black italic tracking-tight text-[#FF5A79]">Agile Advisor Output</h3>
                        <div className="flex items-center space-x-4">
                           {generatedOutput && (
                             <button onClick={toggleEditOutput} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isEditingOutput ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                               {isEditingOutput ? '💾 Salva Modifiche' : '✏️ Modifica Manualmente'}
                             </button>
                           )}
                           <div className="flex space-x-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        {generatedOutput ? (
                          <div 
                            ref={outputRef}
                            className={`vision-output outline-none ${isEditingOutput ? 'border-2 border-dashed border-[#FF5A79]/50 p-4 rounded-xl bg-white/5' : ''}`} 
                            contentEditable={isEditingOutput}
                            dangerouslySetInnerHTML={{ __html: generatedOutput }} 
                          />
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

        {/* REGISTER SESSION MODAL */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
             <div className="bg-[#1e293b] w-full max-w-4xl rounded-[40px] overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[90vh]">
               <div className="bg-[#FF5A79] p-8 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-white font-black text-2xl uppercase italic">Registro Progetti Agile</h3>
                    <p className="text-white/80 text-xs font-bold mt-1">Imposta i dati del progetto e del team</p>
                 </div>
                 <button onClick={() => setShowRegisterModal(false)} className="bg-white/20 p-3 rounded-xl hover:bg-white/30 transition-all text-white">✕</button>
               </div>
               
               <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Nome del Progetto</label>
                        <input 
                           type="text" 
                           value={sessionData.projectName}
                           onChange={(e) => setSessionData({...sessionData, projectName: e.target.value})}
                           placeholder="Es. App e-commerce..."
                           className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#FF5A79] outline-none transition-all"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Data di Inizio</label>
                        <input 
                           type="date" 
                           value={sessionData.startDate}
                           onChange={(e) => setSessionData({...sessionData, startDate: e.target.value})}
                           className="w-full bg-[#111318]/40 border border-white/10 rounded-xl p-4 text-white focus:border-[#FF5A79] outline-none transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <div className="flex justify-between items-center mb-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Membri del Team & Skills</label>
                        <button onClick={handleAddTeamMember} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all">+ Aggiungi Membro</button>
                     </div>
                     
                     <div className="space-y-4">
                        {sessionData.teamMembers.map((member, idx) => (
                           <div key={member.id} className="grid grid-cols-12 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5">
                              <div className="col-span-1 flex justify-center text-gray-500 font-mono text-xs">#{idx+1}</div>
                              <div className="col-span-3">
                                 <input 
                                    type="text" 
                                    placeholder="Nome"
                                    value={member.name}
                                    onChange={(e) => handleUpdateTeamMember(member.id, 'name', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:border-[#FF5A79] outline-none"
                                 />
                              </div>
                              <div className="col-span-3">
                                  <select
                                    value={member.role}
                                    onChange={(e) => handleUpdateTeamMember(member.id, 'role', e.target.value)}
                                    className="w-full bg-[#111318]/40 border border-white/10 rounded-lg p-2 text-xs text-white outline-none"
                                  >
                                    <option>Product Owner</option>
                                    <option>Scrum Master</option>
                                    <option>Developer</option>
                                    <option>Stakeholder</option>
                                  </select>
                              </div>
                              <div className="col-span-4">
                                 <input 
                                    type="text" 
                                    placeholder="Skill principali (es. Java, Design...)"
                                    value={member.skills}
                                    onChange={(e) => handleUpdateTeamMember(member.id, 'skills', e.target.value)}
                                    className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:border-[#FF5A79] outline-none"
                                 />
                              </div>
                              <div className="col-span-1 flex justify-end">
                                 <button onClick={() => handleRemoveTeamMember(member.id)} className="text-red-400 hover:text-red-300">✕</button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="p-8 border-t border-white/10 bg-[#16181d] flex justify-between items-center">
                  <button 
                     onClick={handleCreateNewProject}
                     className="bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                     + Salva come Nuovo Progetto
                  </button>
                  <button 
                     onClick={handleSaveSession}
                     className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
                  >
                     Salva Configurazione
                  </button>
               </div>
             </div>
          </div>
        )}

        {/* Fix DB Modal */}
        {showFixModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-[#1e293b] w-full max-w-2xl rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
              <div className="bg-amber-500 p-6 flex justify-between items-center">
                <h3 className="text-slate-900 font-black text-xl uppercase italic">Aggiornamento Database Richiesto</h3>
                <button onClick={() => setShowFixModal(false)} className="text-slate-900/80 hover:text-slate-900 font-bold">✕</button>
              </div>
              <div className="p-8">
                <p className="text-gray-300 mb-6 font-medium">
                  Abbiamo introdotto nuove funzionalità (Mindset, Review, Retrospettiva, Multi-Sprint). 
                  Il database necessita di un aggiornamento completo per supportarle.
                </p>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 mb-6">
                  <code className="text-green-400 font-mono text-xs block mb-2">-- Esegui questo in Supabase SQL Editor:</code>
                  <code className="text-white font-mono text-sm block select-all">
                    alter table project_states 
                    add column if not exists mindset_data jsonb,
                    add column if not exists session_data jsonb,
                    add column if not exists current_sprint_number integer default 1,
                    add column if not exists sprints_history jsonb default '[]'::jsonb,
                    add column if not exists updated_at timestamptz default now();
                  </code>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(`alter table project_states 
add column if not exists mindset_data jsonb,
add column if not exists session_data jsonb,
add column if not exists current_sprint_number integer default 1,
add column if not exists sprints_history jsonb default '[]'::jsonb,
add column if not exists updated_at timestamptz default now();`)}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all mb-4"
                >
                  Copia SQL
                </button>
                <button 
                  onClick={() => { setShowFixModal(false); window.location.reload(); }}
                  className="w-full bg-[#FF5A79] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110"
                >
                  Ho Eseguito lo Script, Ricarica
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
