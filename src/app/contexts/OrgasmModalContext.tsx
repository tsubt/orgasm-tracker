"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface OrgasmModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const OrgasmModalContext = createContext<OrgasmModalContextType | undefined>(
  undefined
);

export function OrgasmModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <OrgasmModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </OrgasmModalContext.Provider>
  );
}

export function useOrgasmModal() {
  const context = useContext(OrgasmModalContext);
  if (context === undefined) {
    throw new Error("useOrgasmModal must be used within OrgasmModalProvider");
  }
  return context;
}
