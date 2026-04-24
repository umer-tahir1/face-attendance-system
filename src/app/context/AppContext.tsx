import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/database';
import { faceRecognitionService } from '../services/faceRecognition';

interface AppContextType {
  dbInitialized: boolean;
  modelsLoaded: boolean;
  loadingModels: boolean;
  initializeApp: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const initializeApp = async () => {
    try {
      // Initialize database
      if (!dbInitialized) {
        await db.init();
        setDbInitialized(true);
      }

      // Load face recognition models
      if (!modelsLoaded && !loadingModels) {
        setLoadingModels(true);
        await faceRecognitionService.loadModels();
        setModelsLoaded(true);
        setLoadingModels(false);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <AppContext.Provider
      value={{
        dbInitialized,
        modelsLoaded,
        loadingModels,
        initializeApp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}