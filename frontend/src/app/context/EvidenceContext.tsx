import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface Evidence {
  id: string;
  date: string;
  voucherNo: string;
  account: string;
  debit: string;
  credit: string;
  narration: string;
  scrutinyCategory: string;
  scrutinyReason: string;
}

interface EvidenceContextType {
  evidenceList: Evidence[];
  addEvidence: (tx: Evidence) => void;
  removeEvidence: (id: string) => void;
  clearEvidence: () => void;
}

const EvidenceContext = createContext<EvidenceContextType | undefined>(undefined);

export function EvidenceProvider({ 
  children, 
  workbookId 
}: { 
  children: React.ReactNode; 
  workbookId: string;
}) {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const storageKey = `workbook_evidence_${workbookId}`;

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setEvidenceList(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved evidence:', e);
      }
    }
  }, [storageKey]);

  // Persist to localStorage whenever evidenceList changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(evidenceList));
  }, [evidenceList, storageKey]);

  const addEvidence = (tx: Evidence) => {
    setEvidenceList((prev) => {
      const exists = prev.some((item) => item.id === tx.id);
      if (exists) {
        toast.info(`Transaction ${tx.voucherNo} is already in evidence`);
        return prev;
      }
      const newList = [...prev, tx];
      toast.success(`Transaction ${tx.voucherNo} added to documentation (${newList.length} total)`);
      return newList;
    });
  };

  const removeEvidence = (id: string) => {
    setEvidenceList((prev) => prev.filter((item) => item.id !== id));
    toast.success('Evidence removed');
  };

  const clearEvidence = () => {
    setEvidenceList([]);
    toast.success('Evidence cleared');
  };

  return (
    <EvidenceContext.Provider value={{ evidenceList, addEvidence, removeEvidence, clearEvidence }}>
      {children}
    </EvidenceContext.Provider>
  );
}

export function useEvidence() {
  const context = useContext(EvidenceContext);
  if (context === undefined) {
    throw new Error('useEvidence must be used within an EvidenceProvider');
  }
  return context;
}
