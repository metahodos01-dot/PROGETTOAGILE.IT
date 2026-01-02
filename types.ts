
export interface Module {
  id: string;
  day: number;
  type: 'COMUNE' | 'SPECIALIST';
  title: string;
  tagline: string;
  description: string;
  objectives: string[];
  quote: string;
}

export enum TabType {
  INTRO = 'INTRO',
  TEORIA = 'TEORIA',
  QUIZ = 'QUIZ',
  SIMULAZIONE = 'SIMULAZIONE'
}

export interface AppState {
  activeModuleId: string;
  activeTab: TabType;
}
