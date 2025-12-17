import { create } from 'zustand';
import type { Project, ProjectFile, CreateProjectForm } from '@/types';
import { apiClient } from '@/api/client';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  projectFiles: ProjectFile[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (projectData: CreateProjectForm) => Promise<string | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  fetchProjectFiles: (projectId: string) => Promise<void>;
  uploadFile: (projectId: string, file: File) => Promise<void>;
  clearError: () => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  currentProject: null,
  projectFiles: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getProjects();
      
      if (response.success && response.data) {
        set({
          projects: response.data,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to fetch projects',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getProject(id);
      
      if (response.success && response.data) {
        set({
          currentProject: response.data,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to fetch project',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  createProject: async (projectData: CreateProjectForm) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.createProject(projectData);
      
      if (response.success && response.data) {
        const newProject = response.data;
        set({
          projects: [...get().projects, newProject],
          isLoading: false,
        });
        return newProject.id;
      } else {
        set({
          error: response.error?.message || 'Failed to create project',
          isLoading: false,
        });
        return null;
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
      return null;
    }
  },

  updateProject: async (id: string, updates: Partial<Project>) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.updateProject(id, updates);
      
      if (response.success && response.data) {
        const updatedProject = response.data;
        set({
          projects: get().projects.map(p => p.id === id ? updatedProject : p),
          currentProject: get().currentProject?.id === id ? updatedProject : get().currentProject,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to update project',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.deleteProject(id);
      
      if (response.success) {
        set({
          projects: get().projects.filter(p => p.id !== id),
          currentProject: get().currentProject?.id === id ? null : get().currentProject,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to delete project',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  fetchProjectFiles: async (projectId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getProjectFiles(projectId);
      
      if (response.success && response.data) {
        set({
          projectFiles: response.data,
          isLoading: false,
        });
      } else {
        set({
          error: response.error?.message || 'Failed to fetch project files',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  uploadFile: async (projectId: string, file: File) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.uploadFile(projectId, file);
      
      if (response.success && response.data) {
        // Refresh project files after upload
        await get().fetchProjectFiles(projectId);
        set({ isLoading: false });
      } else {
        set({
          error: response.error?.message || 'Failed to upload file',
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || 'An unexpected error occurred',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));