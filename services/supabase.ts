
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jggzoyahfrzaeaxwupud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZ3pveWFoZnJ6YWVheHd1cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTIwMjgsImV4cCI6MjA4MjkyODAyOH0.VHl_jTxN-q49YQZwT3-E44CerZhqU5TPniUd6j2s44s';

export const supabase = createClient(supabaseUrl, supabaseKey);

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

export const fetchProjectById = async (id: string): Promise<{ data: DBProjectState | null, error: any }> => {
  const { data, error } = await supabase
    .from('project_states')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
};

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
      experience: 'Base',
      challenges: '',
      expectations: '',
      readiness: 'Sì'
    },
    current_sprint_number: 1,
    sprints_history: [],
    stored_outputs: {},
    active_module_id: 'f0',
    team_availability: {},
    impediments: [],
    ...initialData
  };

  const { data, error } = await supabase.from('project_states').insert(defaultState).select().single();
  return { data, error };
};

export const getOrCreateProject = async (): Promise<{ data: DBProjectState | null, error: any }> => {
  const { data: existing, error: fetchError } = await supabase
    .from('project_states').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (existing) return { data: existing, error: null };

  return createNewProject({
    session_data: {
      projectName: 'Nuovo Progetto Agile',
      startDate: new Date().toISOString().split('T')[0],
      teamMembers: [
        { id: '1', name: 'Marco', role: 'Product Owner', skills: 'Vision' },
        { id: '2', name: 'Sara', role: 'Scrum Master', skills: 'Coaching' },
        { id: '3', name: 'Luca', role: 'Developer', skills: 'Coding' }
      ]
    },
    team_availability: { "Marco (PO)": 40, "Sara (SM)": 40, "Luca (Dev)": 40 }
  });
};

export const updateProjectState = async (id: string, updates: Partial<DBProjectState>) => {
  const { error } = await supabase
    .from('project_states')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error;
};

export const deleteProject = async (id: string) => {
  await supabase.from('tasks').delete().eq('project_id', id);
  await supabase.from('user_stories').delete().eq('project_id', id);
  const { error } = await supabase.from('project_states').delete().eq('id', id);
  return error;
};

// --- USER STORIES ---

export const fetchStories = async (projectId: string) => {
  const { data, error } = await supabase.from('user_stories').select('*').eq('project_id', projectId);
  if (error) return [];
  return data as DBUserStory[];
};

export const createStory = async (story: Partial<DBUserStory>) => {
  const { data, error } = await supabase.from('user_stories').insert(story).select().single();
  if (error) return null;
  return data;
};

// --- TASKS ---

export const fetchTasks = async (projectId: string) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
  if (error) return [];
  return data as DBTask[];
};

export const createTask = async (task: Partial<DBTask>) => {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) return null;
  return data;
};

export const updateTaskStatus = async (taskId: string, status: 'todo' | 'doing' | 'done') => {
  await supabase.from('tasks').update({ status }).eq('id', taskId);
};

export const deleteTask = async (taskId: string) => {
  await supabase.from('tasks').delete().eq('id', taskId);
};
