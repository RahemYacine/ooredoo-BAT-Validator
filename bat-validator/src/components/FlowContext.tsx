import { createContext, useContext, useState, ReactNode } from "react";
import type { AnalysisResult } from "@workspace/api-client-react";

interface FlowState {
  imageData: string | null;
  setImageData: (data: string | null) => void;
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  resetFlow: () => void;
}

const FlowContext = createContext<FlowState | null>(null);

export const FlowProvider = ({ children }: { children: ReactNode }) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const resetFlow = () => {
    setImageData(null);
    setAnalysisResult(null);
  };

  return (
    <FlowContext.Provider value={{ imageData, setImageData, analysisResult, setAnalysisResult, resetFlow }}>
      {children}
    </FlowContext.Provider>
  );
};

export const useFlow = () => {
  const context = useContext(FlowContext);
  if (!context) throw new Error("useFlow must be used within FlowProvider");
  return context;
};
