
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import LandingPage from './components/LandingPage';
import ProjectSetupModal from './components/ProjectSetupModal';
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
  generateRoadmapMVP,
  generateSprintTasks
} from './services/gemini';

interface Task {
  id: string;
  project_id?: string;
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
  const [activeModuleId, setActiveModuleId] = useState(MODULES[0].id);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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

  // Store per il contesto a cascata - EXTENDED
  const [storedVision, setStoredVision] = useState<string>('');
  const [storedObjectives, setStoredObjectives] = useState<string>('');
  const [storedKpi, setStoredKpi] = useState<string>('');
  const [storedTeam, setStoredTeam] = useState<string>('');
  const [storedObeya, setStoredObeya] = useState<string>('');
  const [storedBacklog, setStoredBacklog] = useState<string>('');
  const [storedEstimates, setStoredEstimates] = useState<string>('');
  const [storedRoadmap, setStoredRoadmap] = useState<string>('');
  
  // Editable Contexts
  const [editableVision, setEditableVision] = useState<string>('');
  const [editableStrategicContext, setEditableStrategicContext] = useState<string>('');
  const [editableBacklogContext, setEditableBacklogContext] = useState<string>('');
  
  const [teamStrategicInput, setTeamStrategicInput] = useState<string>('');
  const [teamBacklogInput, setTeamBacklogInput] = useState<string>('');
  const [kpiStrategicInput, setKpiStrategicInput] = useState<string>('');
  const [roadmapStrategicInput, setRoadmapStrategicInput] = useState<string>('');
  const [roadmapBacklogInput, setRoadmapBacklogInput] = useState<string>('');

  // SPRINT State
  const [sprintStatus, setSprintStatus] = useState<'planning' | 'daily' | 'review' | 'retro' | 'kpi'>('planning');
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [sprintStories, setSprintStories] = useState<UserStory[]>([]);
  const [teamAvailability, setTeamAvailability] = useState<Record<string, number>>({});
  const [impediments, setImpediments] = useState<string[]>([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  
  // Multi-Sprint State
  const [sprintNumber, setSprintNumber] = useState<number>(1);
  const [sprintHistory, setSprintHistory] = useState<any[]>([]);

  // Obeya Section State
  const [obeyaChecklist, setObeyaChecklist] = useState<string[]>([
    "Product Vision Board", "Strategic Objectives (OKRs)", "KPI Dashboard", 
    "Team Structure & Roles", "Product Backlog", "Kanban / Sprint Board",
    "Impediment List", "Team Agreement", "Sprint Burndown Chart"
  ]);
  const [selectedObeyaItems, setSelectedObeyaItems] = useState<string[]>([]);
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
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const activeModule = MODULES.find(m => m.id === activeModuleId) || MODULES[0];
  const saveTimeoutRef = useRef<number | null>(null);

  // --- LOGIC ---
  const loadProjectData = async (project: DBProjectState) => {
    setProjectId(project.id!);
    
    if (project.vision_data) setVisionData(project.vision_data);
    else setVisionData({ productName: '', target: '', problem: '', currentSolution: '', differentiation: '' });

    if (project.objectives_data) setObjectivesData(project.objectives_data);
    else setObjectivesData({ deadline: '' });

    if (project.mindset_data) setMindsetData(project.mindset_data);
    else setMindsetData({ experience: 'Base', challenges: '', expectations: '', readiness: 'Sì' });

    if (project.current_sprint_number) setSprintNumber(project.current_sprint_number);
    if (project.sprints_history) setSprintHistory(project.sprints_history);
    
    if (project.session_data) {
       setSessionData(project.session_data);
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
       setSessionData({
        projectName: 'Progetto Senza Nome',
        startDate: new Date().toISOString().split('T')[0],
        teamMembers: []
      });
    }

    // Load Stored Outputs
    setStoredVision(project.stored_outputs?.vision || '');
    setStoredObjectives(project.stored_outputs?.objectives || '');
    setStoredKpi(project.stored_outputs?.kpi || '');
    setStoredTeam(project.stored_outputs?.team || '');
    setStoredObeya(project.stored_outputs?.obeya || '');
    setStoredBacklog(project.stored_outputs?.backlog || '');
    setStoredEstimates(project.stored_outputs?.estimates || '');
    setStoredRoadmap(project.stored_outputs?.roadmap || '');
    
    if (project.impediments) setImpediments(project.impediments);
    if (project.active_module_id) setActiveModuleId(project.active_module_id);
    
    setSprintStatus('planning');
    setRenderedObeya(null);

    const dbStories = await fetchStories(project.id!);
    setSprintStories(dbStories.map(s => ({ id: s.external_id, text: s.text })));
    
    const dbTasks = await fetchTasks(project.id!);
    setSprintTasks(dbTasks.map(t => ({ 
      id: t.id, 
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

  useEffect(() => {
    const initApp = async () => {
      await refreshProjectList();
      const { data: project, error: initError } = await getOrCreateProject();
      if (project) {
        await loadProjectData(project);
      } else {
        setDbError(true);
      }
    };
    initApp();
  }, []);

  // Sync stored outputs to display when switching modules
  useEffect(() => {
    // Carica il contenuto salvato se esiste
    if (activeModuleId === 'f1') setGeneratedOutput(storedVision);
    else if (activeModuleId === 'f2') setGeneratedOutput(storedObjectives);
    else if (activeModuleId === 'f3') setGeneratedOutput(storedKpi);
    else if (activeModuleId === 'f4') setGeneratedOutput(storedTeam);
    else if (activeModuleId === 'f5') setGeneratedOutput(storedObeya);
    else if (activeModuleId === 'f6') setGeneratedOutput(storedBacklog);
    else if (activeModuleId === 'f7') setGeneratedOutput(storedEstimates);
    else if (activeModuleId === 'f8') setGeneratedOutput(storedRoadmap);
    else setGeneratedOutput(''); // Clean for others or let them handle it
  }, [activeModuleId, storedVision, storedObjectives, storedKpi, storedTeam, storedObeya, storedBacklog, storedEstimates, storedRoadmap]);

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
            setSprintTasks(prev => [...prev, { id: newTask.id, title: newTask.title, assignedTo: newTask.assigned_to, status: newTask.status }]);
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

  // Autosave logic - Debounced
  useEffect(() => {
    if (!projectId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSavingStatus('saving');
    saveTimeoutRef.current = window.setTimeout(async () => {
      await updateProjectState(projectId, {
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
          kpi: storedKpi,
          team: storedTeam,
          obeya: storedObeya,
          backlog: storedBacklog,
          estimates: storedEstimates,
          roadmap: storedRoadmap
        }
      });
      setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, name: sessionData.projectName || p.name } : p));
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [visionData, objectivesData, mindsetData, sessionData, sprintNumber, sprintHistory, activeModuleId, teamAvailability, impediments, storedVision, storedObjectives, storedKpi, storedTeam, storedObeya, storedBacklog, storedEstimates, storedRoadmap, projectId]);


  useEffect(() => {
    if (activeModuleId === 'f2' && storedVision) setEditableVision(storedVision);
  }, [activeModuleId, storedVision]);

  const handleSwitchProject = async (newProjectId: string, showModal = true) => {
    if (newProjectId === projectId) return;
    const { data } = await fetchProjectById(newProjectId);
    if (data) {
      await loadProjectData(data);
      if (showModal) setShowRegisterModal(true);
    }
  };

  const handleStartNewProject = () => {
    // 1. Clear active project ID
    setProjectId(null);
    
    // 2. Reset Session Data Form
    setSessionData({
      projectName: '',
      startDate: new Date().toISOString().split('T')[0],
      teamMembers: [
        { id: '1', name: '', role: 'Product Owner', skills: '' },
        { id: '2', name: '', role: 'Scrum Master', skills: '' },
        { id: '3', name: '', role: 'Developer', skills: '' }
      ]
    });

    // 3. Reset all functional data inputs
    setVisionData({ productName: '', target: '', problem: '', currentSolution: '', differentiation: '' });
    setObjectivesData({ deadline: '' });
    setMindsetData({ experience: 'Base', challenges: '', expectations: '', readiness: 'Sì' });

    // 4. Reset all stored AI outputs
    setStoredVision('');
    setStoredObjectives('');
    setStoredKpi('');
    setStoredTeam('');
    setStoredObeya('');
    setStoredBacklog('');
    setStoredEstimates('');
    setStoredRoadmap('');
    setGeneratedOutput('');

    // 5. Reset Sprint Data
    setSprintStories([]);
    setSprintTasks([]);
    setSprintNumber(1);

    // 6. Open Modal to start input
    setShowRegisterModal(true);
  };

  const handleDeleteProject = async (idToDelete: string) => {
    if(!confirm("Sei proprio sicuro di eliminare?")) return;
    const error = await deleteProject(idToDelete);
    if (!error) {
      const remainingProjects = projectsList.filter(p => p.id !== idToDelete);
      setProjectsList(remainingProjects);
      if (idToDelete === projectId) {
        if (remainingProjects.length > 0) await handleSwitchProject(remainingProjects[0].id, false);
        else window.location.reload();
      }
    }
  };

  const handleExportProject = () => {
    if (!sessionData) return;
    const exportData = {
      project_meta: {
        id: projectId,
        name: sessionData.projectName,
        exported_at: new Date().toISOString(),
        version: "1.0"
      },
      state: {
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
          kpi: storedKpi,
          team: storedTeam,
          obeya: storedObeya,
          backlog: storedBacklog,
          estimates: storedEstimates,
          roadmap: storedRoadmap
        }
      },
      resources: {
        stories: sprintStories,
        tasks: sprintTasks
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${(sessionData.projectName || "project").replace(/[^a-z0-9]/gi, '_').toLowerCase()}_backup.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportProject = async (file: File) => {
    if (!confirm("Vuoi importare questo progetto? Verrà creato come una nuova copia.")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        try {
            const data = JSON.parse(text);
            if (data.state) {
                const newState = {
                    ...data.state,
                    session_data: {
                        ...data.state.session_data,
                        projectName: `${data.state.session_data.projectName} (Import)`
                    }
                };
                const { data: created } = await createNewProject(newState);
                if (created) {
                    await refreshProjectList();
                    handleSwitchProject(created.id!);
                    alert("Progetto importato correttamente!");
                }
            }
        } catch (err) {
            alert("Errore nella lettura del file di backup.");
        }
    };
    reader.readAsText(file);
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
    if (!projectId) return;
    if (storedBacklog) {
      if (activeModuleId === 'f4') setTeamBacklogInput(storedBacklog);
      else if (activeModuleId === 'f8') setRoadmapBacklogInput(storedBacklog);
      else if (activeModuleId === 'f9') {
        if (sprintStories.length === 0) {
           const newStories = [
            { external_id: 'US1', text: 'Come utente voglio registrarmi...', status: 'backlog', project_id: projectId }
          ];
          for (const s of newStories) await createStory(s);
          const stories = await fetchStories(projectId);
          setSprintStories(stories.map(s => ({ id: s.external_id, text: s.text })));
        }
      }
      else setEditableBacklogContext(storedBacklog);
    }
  };

  // --- SPRINT LOGIC ---
  const handleAddTask = async () => {
    if (!projectId) return;
    const title = prompt("Descrizione Task:");
    if (!title) return;
    const assigned = prompt("Assegnato a (Nome):", "Team");
    const newTask = {
      project_id: projectId,
      title,
      assigned_to: assigned || 'Team',
      status: 'todo' as 'todo'
    };
    await createTask(newTask);
  };

  const handleAutoGenerateTasks = async () => {
    if (sprintStories.length === 0) return alert("Nessuna storia nel backlog. Importale prima.");
    if (!projectId) return;
    setIsGeneratingTasks(true);
    const storiesText = sprintStories.map(s => `- ${s.text}`).join('\n');
    const tasks = await generateSprintTasks(storiesText);
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      for (const t of tasks) {
         await createTask({
           project_id: projectId,
           title: t.title,
           assigned_to: t.assignedTo,
           status: 'todo'
         });
      }
      const dbTasks = await fetchTasks(projectId);
      setSprintTasks(dbTasks.map(t => ({ id: t.id, title: t.title, assignedTo: t.assigned_to, status: t.status })));
      alert(`${tasks.length} task generati con successo!`);
    } else {
      alert("Non è stato possibile generare task.");
    }
    setIsGeneratingTasks(false);
  };

  const moveTask = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    setSprintTasks(sprintTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await updateTaskStatus(taskId, newStatus);
  };

  const toggleObeyaItem = (item: string) => {
    if (selectedObeyaItems.includes(item)) {
      setSelectedObeyaItems(selectedObeyaItems.filter(i => i !== item));
    } else {
      setSelectedObeyaItems([...selectedObeyaItems, item]);
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
        setStoredKpi(result);
      } else if (activeModuleId === 'f4') {
        const teamContextStr = sessionData.teamMembers.map(m => `- ${m.name} (${m.role}): ${m.skills}`).join('\n');
        result = await generateTeamStructure({ strategy: teamStrategicInput || storedObjectives, backlog: teamBacklogInput || storedBacklog, teamMembers: teamContextStr });
        setStoredTeam(result);
      } else if (activeModuleId === 'f5') {
        const rendered = await generateObeyaRendering(null, selectedObeyaItems); 
        if (rendered) {
            result = `
              <div class="bg-gray-800 p-6 rounded-[32px] text-center border border-white/10">
                 <h3 class="text-white text-2xl font-black mb-6 uppercase italic">Rendering Obeya Room</h3>
                 <div class="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <img src="${rendered}" alt="Obeya Room Generated" class="w-full h-auto object-cover" />
                 </div>
                 <p class="text-gray-400 text-xs mt-6 font-medium">Generazione basata su: ${selectedObeyaItems.join(', ')}</p>
              </div>
            `;
            setStoredObeya(result);
        } else {
             result = `<div class="bg-red-900/20 p-8 rounded-2xl text-center text-red-300">Errore Generazione Immagine</div>`;
        }
      } else if (activeModuleId === 'f6') {
        result = await generateBacklog(editableStrategicContext || storedObjectives);
        setStoredBacklog(result);
      } else if (activeModuleId === 'f7') {
        result = await generateEstimates(editableBacklogContext || storedBacklog);
        setStoredEstimates(result);
      } else if (activeModuleId === 'f8') {
        result = await generateRoadmapMVP({ objectives: roadmapStrategicInput || storedObjectives, backlog: roadmapBacklogInput || storedBacklog });
        setStoredRoadmap(result);
      }
    } catch (e) { result = "Errore AI."; }

    setGeneratedOutput(result);
    setIsGenerating(false);
  };

  // Sync edits from DOM to State immediately when user finishes editing
  const handleSyncOutput = () => {
    if (!outputRef.current) return;
    const content = outputRef.current.innerHTML;
    
    // Update local state AND component state to avoid revert on re-render
    setGeneratedOutput(content);

    if (activeModuleId === 'f1') setStoredVision(content);
    else if (activeModuleId === 'f2') setStoredObjectives(content);
    else if (activeModuleId === 'f3') setStoredKpi(content);
    else if (activeModuleId === 'f4') setStoredTeam(content);
    else if (activeModuleId === 'f5') setStoredObeya(content);
    else if (activeModuleId === 'f6') setStoredBacklog(content);
    else if (activeModuleId === 'f7') setStoredEstimates(content);
    else if (activeModuleId === 'f8') setStoredRoadmap(content);
  };

  const handleSaveAndContinue = async () => {
    if (!projectId) return;

    // Force sync before saving
    handleSyncOutput();
    
    // Explicit capture for safety
    let currentContent = generatedOutput;
    if (outputRef.current) currentContent = outputRef.current.innerHTML;

    let nextStoredVision = storedVision;
    let nextStoredObjectives = storedObjectives;
    let nextStoredKpi = storedKpi;
    let nextStoredTeam = storedTeam;
    let nextStoredObeya = storedObeya;
    let nextStoredBacklog = storedBacklog;
    let nextStoredEstimates = storedEstimates;
    let nextStoredRoadmap = storedRoadmap;

    if (activeModuleId === 'f1') { nextStoredVision = currentContent; setStoredVision(currentContent); }
    else if (activeModuleId === 'f2') { nextStoredObjectives = currentContent; setStoredObjectives(currentContent); }
    else if (activeModuleId === 'f3') { nextStoredKpi = currentContent; setStoredKpi(currentContent); }
    else if (activeModuleId === 'f4') { nextStoredTeam = currentContent; setStoredTeam(currentContent); }
    else if (activeModuleId === 'f5') { nextStoredObeya = currentContent; setStoredObeya(currentContent); }
    else if (activeModuleId === 'f6') { nextStoredBacklog = currentContent; setStoredBacklog(currentContent); }
    else if (activeModuleId === 'f7') { nextStoredEstimates = currentContent; setStoredEstimates(currentContent); }
    else if (activeModuleId === 'f8') { nextStoredRoadmap = currentContent; setStoredRoadmap(currentContent); }

    await updateProjectState(projectId, {
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
          vision: nextStoredVision, 
          objectives: nextStoredObjectives,
          kpi: nextStoredKpi,
          team: nextStoredTeam,
          obeya: nextStoredObeya,
          backlog: nextStoredBacklog,
          estimates: nextStoredEstimates,
          roadmap: nextStoredRoadmap
      }
    });
    
    await refreshProjectList();
    const currentIndex = MODULES.findIndex(m => m.id === activeModuleId);
    if (currentIndex !== -1 && currentIndex < MODULES.length - 1) {
      setActiveModuleId(MODULES[currentIndex + 1].id);
      window.scrollTo(0,0);
    }
  };

  const handleSaveSetup = async (newData: any) => {
    setSessionData(newData);
    
    if (projectId) {
       // UPDATE EXISTING PROJECT
       await updateProjectState(projectId, { session_data: newData });
       setProjectsList(prev => prev.map(p => p.id === projectId ? { ...p, name: newData.projectName } : p));
    } else {
       // CREATE NEW PROJECT
       const { data } = await createNewProject({ session_data: newData });
       if (data && data.id) {
          setProjectId(data.id);
          await refreshProjectList();
          await loadProjectData(data);
       }
    }
  };

  if (currentView === 'landing') return <LandingPage onStart={() => setCurrentView('app')} />;

  if (dbError) {
      return (
          <div className="flex h-screen items-center justify-center bg-[#4B4E54] text-white">
              <div className="text-center">
                  <h1 className="text-3xl font-black text-[#FF5A79] mb-4">Errore Database</h1>
                  <p>Impossibile connettersi al progetto. Riprova più tardi.</p>
                  <button onClick={() => window.location.reload()} className="mt-6 bg-white/10 px-6 py-3 rounded-xl hover:bg-white/20">Ricarica</button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-[#4B4E54] overflow-hidden">
      <Sidebar 
        activeModuleId={activeModuleId} 
        onSelectModule={(id) => { 
          // Sync current output before switching!
          handleSyncOutput();
          setActiveModuleId(id); 
        }} 
        onGoHome={() => setCurrentView('landing')}
        onOpenRegister={() => setShowRegisterModal(true)}
        onNewProject={handleStartNewProject}
        projects={projectsList}
        currentProjectId={projectId}
        onSwitchProject={handleSwitchProject}
        onDeleteProject={handleDeleteProject}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      <main className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#FDFDFD]">
        <div className="max-w-7xl mx-auto p-12 pb-32">
          
          <header className="flex justify-between items-start mb-16 gap-12">
            <div className="flex-1">
               <h1 className="text-7xl font-black text-slate-900 leading-[0.85] uppercase tracking-tighter mb-8 italic">{activeModule.title.split('. ')[1]}</h1>
               <p className="text-xl text-slate-500 font-semibold">{activeModule.tagline}</p>
            </div>
            <div className="shrink-0 pt-2 flex flex-col items-end gap-2">
              <Timer />
              {savingStatus !== 'idle' && (
                <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${savingStatus === 'saving' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                   {savingStatus === 'saving' ? 'Salvataggio...' : 'Salvato ✓'}
                </div>
              )}
            </div>
          </header>

          <div className="space-y-20">
            {activeModuleId === 'f0' ? (
              /* MINDSET MODULE */
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8">
                {/* ... (Existing Educational Content preserved) ... */}
                <section className="bg-[#4B4E54] rounded-[48px] p-12 shadow-2xl text-white border-t border-white/10">
                  <h2 className="text-4xl font-black italic mb-6">La Vostra Adesione</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <div>
                           <label className="block text-[10px] font-black text-[#FF5A79] uppercase tracking-widest mb-3">Livello Esperienza Team</label>
                           <select 
                             value={mindsetData.experience}
                             onChange={(e) => setMindsetData({...mindsetData, experience: e.target.value})}
                             className="w-full bg-[#5A5D63] border-none rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-[#FF5A79]"
                           >
                             <option>Nessuna esperienza (primo approccio)</option>
                             <option>Qualche esperimento (ma confusione)</option>
                             <option>Team esperto (vogliamo migliorare)</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sfide Principali</label>
                           <textarea 
                             rows={3}
                             value={mindsetData.challenges}
                             onChange={(e) => setMindsetData({...mindsetData, challenges: e.target.value})}
                             className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-[#FF5A79] focus:outline-none"
                             placeholder="Es. Mancanza di comunicazione, scadenze mancate..."
                           />
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Aspettative</label>
                           <textarea 
                             rows={3}
                             value={mindsetData.expectations}
                             onChange={(e) => setMindsetData({...mindsetData, expectations: e.target.value})}
                             className="w-full bg-[#111318]/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:border-[#FF5A79] focus:outline-none"
                             placeholder="Cosa volete ottenere oggi?"
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black text-[#FF5A79] uppercase tracking-widest mb-3">Pronti al cambiamento?</label>
                           <select 
                             value={mindsetData.readiness}
                             onChange={(e) => setMindsetData({...mindsetData, readiness: e.target.value})}
                             className="w-full bg-[#5A5D63] border-none rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-[#FF5A79]"
                           >
                             <option>Sì, siamo pronti!</option>
                             <option>Sì, ma con riserva</option>
                             <option>Siamo scettici</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                     <button onClick={handleSaveAndContinue} className="bg-green-600 px-8 py-4 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-green-500 transition-colors">SALVA E PROSEGUI →</button>
                  </div>
                </section>
              </div>
            ) : activeModuleId === 'f9' ? (
              /* SPRINT MODULE */
              <div className="space-y-12">
                <div className="bg-slate-900 rounded-[32px] p-8 text-white flex justify-between items-center">
                   <div className="flex space-x-2">
                     {['planning', 'daily', 'review', 'retro'].map(id => (
                       <button key={id} onClick={() => setSprintStatus(id as any)} className={`px-4 py-2 rounded-xl text-[10px] uppercase font-black ${sprintStatus === id ? 'bg-[#FF5A79]' : 'bg-white/10'}`}>{id}</button>
                     ))}
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] uppercase text-gray-400">Sprint Corrente</div>
                     <div className="text-2xl font-black">#{sprintNumber}</div>
                   </div>
                </div>

                {sprintStatus === 'planning' && (
                  <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8 bg-slate-100 rounded-[48px] p-10 border border-slate-200">
                       <div className="flex justify-between items-center mb-8">
                         <h3 className="text-2xl font-black uppercase italic">Sprint Backlog</h3>
                         <div className="flex space-x-4">
                            <button onClick={handleAutoGenerateTasks} disabled={isGeneratingTasks} className="text-[9px] bg-indigo-600 text-white px-3 py-2 rounded-lg font-black uppercase shadow-lg hover:bg-indigo-500 disabled:opacity-50">Genera Task con AI</button>
                            <button onClick={handleImportBacklog} className="text-[9px] text-[#FF5A79] font-black uppercase underline">Importa Backlog</button>
                         </div>
                       </div>
                       <div className="space-y-6">
                         {sprintStories.length > 0 ? sprintStories.map(story => (
                           <div key={story.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 relative overflow-hidden group">
                             <span className="absolute top-4 right-6 text-[10px] font-black text-slate-300">#{story.id}</span>
                             <p className="font-bold text-slate-800 pr-8">{story.text}</p>
                           </div>
                         )) : <p className="text-slate-400 italic">Nessuna storia nel backlog. Importale dal modulo 6.</p>}
                       </div>
                    </div>
                    <div className="col-span-4 space-y-8">
                       <div className="bg-white p-8 rounded-[32px] shadow-xl border border-slate-200">
                          <h3 className="font-black uppercase italic mb-4">Capacità Team</h3>
                          {sessionData.teamMembers.map((m) => {
                             const key = `${m.name} (${m.role})`;
                             return (
                               <div key={m.id} className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase truncate w-24">{m.name}</span>
                                  <input type="number" value={teamAvailability[key] || 40} onChange={(e) => setTeamAvailability({...teamAvailability, [key]: +e.target.value})} className="w-16 bg-slate-100 rounded p-1 text-right text-xs font-black" />
                               </div>
                             );
                          })}
                       </div>
                       <button onClick={() => setSprintStatus('daily')} className="w-full bg-[#FF5A79] text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-xl">AVVIA SPRINT 🚀</button>
                    </div>
                  </div>
                )}

                {sprintStatus === 'daily' && (
                  <div className="grid grid-cols-3 gap-6">
                     {['todo', 'doing', 'done'].map(status => (
                       <div key={status} className="bg-slate-100 p-6 rounded-[32px] min-h-[500px]">
                          <div className="flex justify-between mb-4">
                             <h4 className="font-black uppercase text-slate-800">{status}</h4>
                             {status === 'todo' && <button onClick={handleAddTask} className="bg-slate-200 w-6 h-6 rounded flex items-center justify-center font-bold">+</button>}
                          </div>
                          {sprintTasks.filter(t => t.status === status).map(task => (
                             <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm mb-3 border border-slate-200">
                                <p className="text-xs font-bold mb-2">{task.title}</p>
                                <div className="flex justify-between items-center">
                                   <span className="text-[8px] uppercase bg-slate-100 px-2 py-1 rounded">{task.assignedTo}</span>
                                   {status !== 'done' && <button onClick={() => moveTask(task.id, 'done')} className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-lg">Done</button>}
                                </div>
                             </div>
                          ))}
                       </div>
                     ))}
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD MODULES */
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-5 space-y-6">
                   <div className="bg-[#4B4E54] p-8 rounded-[32px] shadow-2xl border border-white/5 text-white">
                      {/* FORM INPUTS */}
                      {activeModuleId === 'f1' && (
                        <>
                         <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Nome Prodotto</label>
                           <input value={visionData.productName} onChange={e => setVisionData({...visionData, productName: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Target</label>
                           <input value={visionData.target} onChange={e => setVisionData({...visionData, target: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Problema</label>
                           <textarea rows={3} value={visionData.problem} onChange={e => setVisionData({...visionData, problem: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Soluzione Attuale</label>
                           <input value={visionData.currentSolution} onChange={e => setVisionData({...visionData, currentSolution: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Differenziazione</label>
                           <textarea rows={2} value={visionData.differentiation} onChange={e => setVisionData({...visionData, differentiation: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                         </div>
                        </>
                      )}
                      
                      {activeModuleId === 'f2' && (
                        <>
                           <div className="bg-[#111318]/40 p-6 rounded-2xl mb-6 border border-white/5">
                              <h4 className="text-[10px] font-black text-[#FF5A79] uppercase mb-2">Contesto Vision (Output Modulo 1)</h4>
                              {editableVision ? (
                                <textarea rows={4} value={editableVision} onChange={(e) => setEditableVision(e.target.value)} className="w-full bg-transparent text-xs text-gray-300 border-none resize-none focus:outline-none" />
                              ) : <p className="text-xs text-gray-500 italic">Nessuna vision generata.</p>}
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Scadenza Temporale</label>
                             <input value={objectivesData.deadline} onChange={e => setObjectivesData({...objectivesData, deadline: e.target.value})} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" placeholder="Es. Q4 2025" />
                           </div>
                        </>
                      )}

                      {/* Generic Context Inputs for other modules */}
                      {activeModuleId === 'f3' && (
                        <div>
                           <div className="flex justify-between items-center mb-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contesto Strategico</label>
                              <button onClick={handleImportStrategy} className="text-[9px] text-[#FF5A79] font-black uppercase underline">Importa da Modulo 2</button>
                           </div>
                           <textarea rows={6} value={kpiStrategicInput} onChange={e => setKpiStrategicInput(e.target.value)} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" placeholder="Incolla qui gli obiettivi..." />
                        </div>
                      )}

                      {activeModuleId === 'f4' && (
                         <div>
                            <div className="flex justify-between items-center mb-3">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contesto Strategico</label>
                               <button onClick={handleImportStrategy} className="text-[9px] text-[#FF5A79] font-black uppercase underline">Importa da Modulo 2</button>
                            </div>
                            <textarea rows={4} value={teamStrategicInput} onChange={e => setTeamStrategicInput(e.target.value)} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm mb-4" placeholder="Incolla qui gli obiettivi..." />
                            
                            <div className="flex justify-between items-center mb-3">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Backlog Tecnico (Opzionale)</label>
                               <button onClick={handleImportBacklog} className="text-[9px] text-[#FF5A79] font-black uppercase underline">Importa da Modulo 6</button>
                            </div>
                            <textarea rows={4} value={teamBacklogInput} onChange={e => setTeamBacklogInput(e.target.value)} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" placeholder="Incolla qui le user stories..." />
                         </div>
                      )}

                      {activeModuleId === 'f5' && (
                        <div>
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Elementi da Visualizzare</label>
                           <div className="space-y-2 mb-6">
                              {obeyaChecklist.map(item => (
                                <label key={item} className="flex items-center space-x-3 cursor-pointer group">
                                  <div className={`w-5 h-5 rounded border border-white/20 flex items-center justify-center transition-colors ${selectedObeyaItems.includes(item) ? 'bg-[#FF5A79] border-[#FF5A79]' : 'bg-transparent group-hover:border-white'}`}>
                                    {selectedObeyaItems.includes(item) && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={selectedObeyaItems.includes(item)} onChange={() => toggleObeyaItem(item)} />
                                  <span className="text-sm text-gray-300 font-medium">{item}</span>
                                </label>
                              ))}
                           </div>
                        </div>
                      )}

                      {activeModuleId === 'f6' && (
                        <div>
                           <div className="flex justify-between items-center mb-3">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contesto Strategico</label>
                              <button onClick={handleImportStrategy} className="text-[9px] text-[#FF5A79] font-black uppercase underline">Importa da Modulo 2</button>
                           </div>
                           {editableStrategicContext ? (
                             <textarea rows={8} value={editableStrategicContext} onChange={(e) => setEditableStrategicContext(e.target.value)} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm" />
                           ) : <textarea rows={8} className="w-full bg-[#111318]/40 rounded-xl p-4 text-white text-sm opacity-50" placeholder="Incolla obiettivi o importa..." onChange={(e) => setEditableStrategicContext(e.target.value)} />}
                        </div>
                      )}

                      {/* GENERATE BUTTONS */}
                      <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-[#E67E22] hover:bg-[#D35400] text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl mt-6 disabled:opacity-50">
                        {isGenerating ? 'ELABORAZIONE...' : '✨ GENERA CON AI'}
                      </button>

                      <button onClick={handleSaveAndContinue} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl mt-4">
                        💾 SALVA E PROSEGUI
                      </button>
                   </div>
                </div>

                <div className="col-span-7 bg-[#0D0F14] rounded-[40px] p-10 border border-white/10 shadow-2xl flex flex-col min-h-[700px]">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[#FF5A79] font-black uppercase tracking-widest">AI Output</h3>
                      <button onClick={() => setIsEditingOutput(!isEditingOutput)} className="text-xs text-gray-500 hover:text-white">✏️ Edit</button>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {generatedOutput ? (
                         <div 
                           ref={outputRef} 
                           contentEditable={isEditingOutput} 
                           onBlur={handleSyncOutput}
                           dangerouslySetInnerHTML={{ __html: generatedOutput }} 
                           className={`outline-none ${isEditingOutput ? 'border border-dashed border-white/20 p-2' : ''}`} 
                         />
                      ) : (
                         <div className="h-full flex items-center justify-center opacity-10 text-6xl">🚀</div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <ProjectSetupModal 
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          initialData={sessionData}
          onSave={handleSaveSetup}
        />
      </main>
    </div>
  );
};

export default App;
