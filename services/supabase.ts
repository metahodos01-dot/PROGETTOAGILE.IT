import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jggzoyahfrzaeaxwupud.supabase.co';
// Utilizziamo SOLO la Anon Key nel frontend. La Service Role Key deve rimanere segreta.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZ3pveWFoZnJ6YWVheHd1cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTIwMjgsImV4cCI6MjA4MjkyODAyOH0.VHl_jTxN-q49YQZwT3-E44CerZhqU5TPniUd6j2s44s';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Definizioni dei tipi Database
export interface DBProjectState {
  id?: string;
  vision_data: any;
  objectives_data: any;
  mindset_data: any;
  session_data: {
    projectName: string;
    startDate: string;
    teamMembers: Array<{ id: string; name: string; role: string; skills: string }>;
  };
  current_sprint_number: number;
  sprints_history: any[];
  stored_outputs: {
    vision?: string;
    objectives?: string;
    backlog?: string;
  };
  active_module_id: string;
  team_availability: Record<string, number>;
  impediments: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DBUserStory {
  id: string;
  project_id: string;
  external_id: string;
  text: string;
  status: string;
}

export interface DBTask {
  id: string;
  project_id: string; 
  story_id?: string;
  title: string;
  assigned_to: string;
  status: 'todo' | 'doing' | 'done';
}

// --- PROJECT MANAGEMENT ---

// Recupera la lista di tutti i progetti (solo metadati essenziali)
export const fetchAllProjects = async () => {
  const { data, error } = await supabase
    .from('project_states')
    .select('id, session_data, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching projects list:", JSON.stringify(error, null, 2));
    return [];
  }
  return data;
};

// Recupera un progetto specifico per ID
export const fetchProjectById = async (id: string): Promise<{ data: DBProjectState | null, error: any }> => {
  const { data, error } = await supabase
    .from('project_states')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching project ${id}:`, error);
    return { data: null, error };
  }
  return { data, error: null };
};

// Crea un nuovo progetto forzato (non getOrCreate)
export const createNewProject = async (initialData: Partial<DBProjectState>): Promise<{ data: DBProjectState | null, error: any }> => {
  const defaultState = {
    vision_data: {
      productName: 'AGILE.IT',
      target: 'Manager aziendali',
      problem: 'Aiutare i team a lavorare agile nell\'era del AI',
      currentSolution: 'Oggi usa solo chatGPT',
      differentiation: 'Nessuno ha una interfaccia semplice e intuitiva'
    },
    objectives_data: { deadline: 'Dicembre 2025' },
    mindset_data: {
      experience: 'Base (conosciamo i concetti)',
      challenges: '',
      expectations: '',
      readiness: 'Sì, siamo pronti!'
    },
    current_sprint_number: 1,
    sprints_history: [],
    stored_outputs: {},
    active_module_id: 'f0',
    team_availability: {},
    impediments: [],
    ...initialData // Override defaults with provided data (e.g. session_data)
  };

  const { data, error } = await supabase
    .from('project_states')
    .insert(defaultState)
    .select()
    .single();

  if (error) {
    console.error("Error creating new project:", JSON.stringify(error, null, 2));
    return { data: null, error };
  }
  return { data, error: null };
};

// Recupera l'ultimo progetto o ne crea uno se non esiste
export const getOrCreateProject = async (): Promise<{ data: DBProjectState | null, error: any }> => {
  const { data: existing, error: fetchError } = await supabase
    .from('project_states')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching project (Check if table exists):", JSON.stringify(fetchError, null, 2));
    return { data: null, error: fetchError };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  // Se non esiste, crea un default usando la funzione createNewProject
  return createNewProject({
    session_data: {
      projectName: 'Nuovo Progetto Agile',
      startDate: new Date().toISOString().split('T')[0],
      teamMembers: [
        { id: '1', name: 'Marco', role: 'Product Owner', skills: 'Vision, Business' },
        { id: '2', name: 'Sara', role: 'Scrum Master', skills: 'Facilitazione, Coaching' },
        { id: '3', name: 'Luca', role: 'Developer', skills: 'Frontend, Design' }
      ]
    },
    team_availability: {
      "Marco (PO)": 40, "Sara (SM)": 40, "Luca (Dev)": 40
    }
  });
};

// Aggiorna lo stato del progetto
export const updateProjectState = async (id: string, updates: Partial<DBProjectState>) => {
  const { error } = await supabase
    .from('project_states')
    .update({ ...updates, updated_at: new Date().toISOString() }) // Aggiorna timestamp
    .eq('id', id);
  
  if (error) {
    console.error('Error updating project:', JSON.stringify(error, null, 2));
    return error;
  }
  return null;
};

// Elimina un progetto
export const deleteProject = async (id: string) => {
  try {
    // 1. Elimina prima i tasks associati
    await supabase.from('tasks').delete().eq('project_id', id);

    // 2. Elimina le user stories associate
    await supabase.from('user_stories').delete().eq('project_id', id);

    // 3. Elimina il progetto
    const { error } = await supabase
      .from('project_states')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting project:', error);
      return error;
    }
    return null;
  } catch (e) {
    console.error("Exception during delete:", e);
    return e;
  }
};

// --- USER STORIES ---

export const fetchStories = async (projectId: string) => {
  const { data, error } = await supabase
    .from('user_stories')
    .select('*')
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error fetching stories:', JSON.stringify(error, null, 2));
    return [];
  }
  return data as DBUserStory[];
};

export const createStory = async (story: Partial<DBUserStory>) => {
  const { data, error } = await supabase
    .from('user_stories')
    .insert(story)
    .select()
    .single();
    
  if (error) {
     console.error('Error creating story:', JSON.stringify(error, null, 2));
     return null;
  }
  return data;
};

// --- TASKS ---

export const fetchTasks = async (projectId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId);
    
  if (error) {
    console.error('Error fetching tasks:', JSON.stringify(error, null, 2));
    return [];
  }
  return data as DBTask[];
};

export const createTask = async (task: Partial<DBTask>) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating task:', JSON.stringify(error, null, 2));
    return null;
  }
  return data;
};

export const updateTaskStatus = async (taskId: string, status: 'todo' | 'doing' | 'done') => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);
  if (error) console.error("Error updating task:", JSON.stringify(error, null, 2));
};

export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) console.error("Error deleting task:", JSON.stringify(error, null, 2));
};
