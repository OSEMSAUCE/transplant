import { writable } from 'svelte/store';
import type { CsvValidationState, TransformSuggestion, ColumnAnalysis } from '../validation/types';

const createTransformStore = () => {
  const { subscribe, set, update } = writable<CsvValidationState>({
    fileName: '',
    totalRows: 0,
    columns: [],
    suggestions: [],
    status: 'ready'
  });

  return {
    subscribe,
    reset: () => {
      set({
        fileName: '',
        totalRows: 0,
        columns: [],
        suggestions: [],
        status: 'ready'
      });
    },
    setFile: (fileName: string) => {
      update(state => ({ ...state, fileName, status: 'analyzing' }));
    },
    updateAnalysis: (columns: ColumnAnalysis[]) => {
      update(state => ({ ...state, columns, status: 'ready' }));
    },
    addSuggestion: (suggestion: TransformSuggestion) => {
      update(state => ({
        ...state,
        suggestions: [...state.suggestions, suggestion]
      }));
    },
    clearSuggestions: () => {
      update(state => ({ ...state, suggestions: [] }));
    },
    setError: (error: string) => {
      update(state => ({ ...state, status: 'error', error }));
    }
  };
};

export const transformStore = createTransformStore();
