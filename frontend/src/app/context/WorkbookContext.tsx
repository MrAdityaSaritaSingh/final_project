import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface WorkbookData {
  csvData: any[];
  columnMappings: Record<string, string>;
  workbookId: string;
}

interface WorkbookContextType {
  workbookData: WorkbookData | null;
  setWorkbookData: (data: WorkbookData | null | ((prev: WorkbookData | null) => WorkbookData | null)) => void;
}

const WorkbookContext = createContext<WorkbookContextType | undefined>(undefined);

export const useWorkbook = () => {
  const context = useContext(WorkbookContext);
  if (!context) {
    throw new Error('useWorkbook must be used within a WorkbookProvider');
  }
  return context;
};

interface WorkbookProviderProps {
  children: ReactNode;
}

export const WorkbookProvider: React.FC<WorkbookProviderProps> = ({ children }) => {
  const [workbookData, setWorkbookDataState] = useState<WorkbookData | null>(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem('workbookData');
    return stored ? JSON.parse(stored) : null;
  });

  const setWorkbookData = (data: WorkbookData | null | ((prev: WorkbookData | null) => WorkbookData | null)) => {
    setWorkbookDataState(prev => {
      const newData = typeof data === 'function' ? data(prev) : data;
      if (newData) {
        localStorage.setItem('workbookData', JSON.stringify(newData));
      } else {
        localStorage.removeItem('workbookData');
      }
      return newData;
    });
  };

  return (
    <WorkbookContext.Provider value={{ workbookData, setWorkbookData }}>
      {children}
    </WorkbookContext.Provider>
  );
};