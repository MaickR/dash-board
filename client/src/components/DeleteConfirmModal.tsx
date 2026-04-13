import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  recordName?: string;
  description?: string;
  isLoading?: boolean;
  warningMessage?: string;
}

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Eliminar registro",
  recordName,
  description,
  isLoading = false,
  warningMessage,
}: DeleteConfirmModalProps) {
  const handleOpenChange = (v: boolean) => {
    if (!v) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-foreground">
            {recordName
              ? `¿Estás seguro que deseas eliminar "${recordName}"?`
              : "¿Estás seguro que deseas eliminar este registro?"}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {warningMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{warningMessage}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground font-medium">
            Esta acción no se puede deshacer.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-h-[44px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </span>
            ) : (
              "Eliminar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
