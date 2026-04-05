import { Link, useLocation } from "wouter";
import { useListReports, useDeleteReport } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, ChevronRight, ScanLine, FileWarning, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { useFlow } from "@/components/FlowContext";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { data: reports, isLoading } = useListReports();
  const [, setLocation] = useLocation();
  const { resetFlow } = useFlow();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteReport();

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    resetFlow();
  }, []);

  const handleDeleteConfirm = () => {
    if (confirmDeleteId === null) return;
    deleteMutation.mutate(
      { id: confirmDeleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
          setConfirmDeleteId(null);
        },
        onError: () => {
          setConfirmDeleteId(null);
        },
      }
    );
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "conforme": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "acceptable": return <FileWarning className="w-5 h-5 text-warning" />;
      default: return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const reportToDelete = reports?.find(r => r.id === confirmDeleteId);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <header className="bg-card px-6 py-5 sticky top-0 z-10 shadow-sm shadow-black/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <img 
            src={`${import.meta.env.BASE_URL}ooredoo-logo.png`} 
            alt="Ooredoo" 
            className="h-7 w-auto"
          />
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide">
            PRO
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-4">Analyses BAT</h1>
        <p className="text-sm text-muted-foreground mt-1">Historique de vos validations colorimétriques</p>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : reports?.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center px-4"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <ScanLine className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Aucune analyse</h3>
            <p className="text-muted-foreground text-sm mt-2">
              Vous n'avez pas encore effectué d'analyse de couleur. Commencez dès maintenant.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {reports?.map((report, index) => (
                <motion.div
                  key={report.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}
                  transition={{ delay: index * 0.07 }}
                  className="bg-card rounded-2xl shadow-sm shadow-black/5 border border-border/50 flex items-center gap-4 overflow-hidden"
                >
                  {/* Clickable area */}
                  <div
                    className="flex items-center gap-4 flex-1 min-w-0 p-4 cursor-pointer active:scale-[0.98] transition-all"
                    onClick={() => setLocation(`/reports/${report.id}`)}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
                      <img src={report.imageData} alt="Thumbnail" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground truncate">{report.materialName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getVerdictIcon(report.analysisResult.verdict)}
                        <span className="text-sm font-medium text-muted-foreground">
                          ΔE {report.analysisResult.deltaE.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {format(new Date(report.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  </div>

                  {/* Delete button — separate from the navigation click */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(report.id);
                    }}
                    className="flex-shrink-0 flex items-center justify-center w-12 h-full self-stretch border-l border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/5 active:bg-destructive/10 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 w-full max-w-md bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-6 z-20">
        <button
          onClick={() => setLocation('/capture')}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-6 h-6" />
          Nouvelle Analyse
        </button>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette analyse ?</AlertDialogTitle>
            <AlertDialogDescription>
              {reportToDelete && (
                <>
                  <span className="font-semibold text-foreground">{reportToDelete.materialName}</span>
                  {" "}sera définitivement supprimée de l'historique. Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
