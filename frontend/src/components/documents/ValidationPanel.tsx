import { motion } from "framer-motion";
import { CheckCircle, Info, FileText, FileSearch, ShieldCheck } from "lucide-react";

interface ValidationPanelProps {
  file: File | null;
  isMetadataValid: boolean;
  completedFieldsCount: number;
  totalFieldsCount: number;
}

export function ValidationPanel({
  file,
  isMetadataValid,
  completedFieldsCount,
  totalFieldsCount,
}: ValidationPanelProps) {
  if (!file) return null;

  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Validation & Processing Notes
      </h3>

      <div className="space-y-4">
        {/* File Validation */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <div className="mt-0.5 text-primary">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">File Validation</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPdf ? "PDF detected. Text extraction available." : "Document selected."}
            </p>
          </div>
        </motion.div>

        {/* OCR Note */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <div className="mt-0.5 text-amber-500">
            <FileSearch className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">OCR Processing</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              OCR will be applied automatically for any scanned pages or images.
            </p>
          </div>
        </motion.div>

        {/* Metadata Completion */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <div className="mt-0.5 text-emerald-500">
            {isMetadataValid ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4 text-accent" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Metadata Status</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedFieldsCount} of {totalFieldsCount} required fields completed
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
