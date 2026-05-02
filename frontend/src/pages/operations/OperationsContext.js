import { createContext, useContext } from "react";

export const OperationsContext = createContext(null);

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("Operations pages must render inside EmployeeDashboard.");
  }
  return context;
}
