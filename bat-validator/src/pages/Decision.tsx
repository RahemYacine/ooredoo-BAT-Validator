import { useEffect } from "react";
import { useLocation } from "wouter";
import { useFlow } from "@/components/FlowContext";
import { useSaveReport } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  userDecision: z.enum(["validated", "rejected"], {
    required_error: "Veuillez sélectionner une décision.",
  }),
  materialName: z.string().min(2, "Le nom du support est requis (min 2 caractères)."),
  agencyName: z.string().optional(),
  userComment: z.string().min(5, "Un commentaire justifiant la décision est requis."),
});

type FormValues = z.infer<typeof formSchema>;

export default function Decision() {
  const [, setLocation] = useLocation();
  const { imageData, analysisResult } = useFlow();
  const saveMutation = useSaveReport();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userDecision: analysisResult?.verdict === "conforme" ? "validated" : undefined,
    }
  });

  const selectedDecision = watch("userDecision");

  useEffect(() => {
    if (!imageData || !analysisResult) {
      setLocation("/home");
    }
  }, [imageData, analysisResult, setLocation]);

  const onSubmit = async (data: FormValues) => {
    if (!imageData || !analysisResult) return;

    try {
      const report = await saveMutation.mutateAsync({
        data: {
          imageData,
          analysisResult,
          ...data,
        }
      });
      setLocation(`/reports/${report.id}`);
    } catch (error) {
      console.error("Failed to save report", error);
    }
  };

  if (!imageData || !analysisResult) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="bg-card px-4 py-4 flex items-center shadow-sm relative z-10">
        <button 
          onClick={() => window.history.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary active:scale-95"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-center flex-1 pr-10">Décision Finale</h1>
      </header>

      <main className="flex-1 p-6 pb-32 overflow-y-auto no-scrollbar">
        {/* Context Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
            ΔE
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Score de l'analyse: <span className="font-bold">{analysisResult.deltaE.toFixed(1)}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Recommandation système: {analysisResult.verdictLabel}</p>
          </div>
        </div>

        <form id="decision-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Decision Buttons */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">Votre Décision <span className="text-primary">*</span></label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue("userDecision", "validated", { shouldValidate: true })}
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                  selectedDecision === "validated" 
                    ? "border-success bg-success/10 text-success" 
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedDecision === "validated" ? "bg-success text-white" : "bg-muted")}>
                  <Check className="w-6 h-6" />
                </div>
                <span className="font-bold">VALIDER LE BAT</span>
              </button>
              
              <button
                type="button"
                onClick={() => setValue("userDecision", "rejected", { shouldValidate: true })}
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95",
                  selectedDecision === "rejected" 
                    ? "border-destructive bg-destructive/10 text-destructive" 
                    : "border-border bg-card text-muted-foreground hover:bg-secondary"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedDecision === "rejected" ? "bg-destructive text-white" : "bg-muted")}>
                  <X className="w-6 h-6" />
                </div>
                <span className="font-bold">REFUSER LE BAT</span>
              </button>
            </div>
            {errors.userDecision && <p className="text-xs text-destructive mt-1">{errors.userDecision.message}</p>}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Nom du support <span className="text-primary">*</span></label>
              <input 
                {...register("materialName")}
                placeholder="Ex: Affiche 4x3 Campagne Été"
                className="w-full px-4 py-3 rounded-xl bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
              />
              {errors.materialName && <p className="text-xs text-destructive mt-1">{errors.materialName.message}</p>}
            </div>

            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Agence / Imprimeur <span className="text-muted-foreground font-normal">(Optionnel)</span></label>
              <input 
                {...register("agencyName")}
                placeholder="Ex: PrintPro Media"
                className="w-full px-4 py-3 rounded-xl bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-foreground mb-1 block">Commentaire / Justification <span className="text-primary">*</span></label>
              <textarea 
                {...register("userComment")}
                placeholder="Indiquez pourquoi vous validez ou refusez ce BAT..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-card border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 font-medium resize-none"
              />
              {errors.userComment && <p className="text-xs text-destructive mt-1">{errors.userComment.message}</p>}
            </div>
          </div>
        </form>
      </main>

      {/* Action Footer */}
      <div className="fixed bottom-0 w-full max-w-md bg-card border-t border-border p-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button
          type="submit"
          form="decision-form"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            "Enregistrer le rapport"
          )}
        </button>
      </div>
    </div>
  );
}
