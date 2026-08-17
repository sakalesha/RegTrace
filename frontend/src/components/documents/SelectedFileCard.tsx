import { motion } from "framer-motion";
import { File, X, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";

interface SelectedFileCardProps {
  file: File;
  onRemove: () => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function SelectedFileCard({ file, onRemove }: SelectedFileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm"
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
          <File className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatBytes(file.size)}</span>
            <span>&bull;</span>
            <span className="uppercase">{file.name.split('.').pop()}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full ml-4"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
