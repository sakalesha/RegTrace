import { motion } from "framer-motion";
import { UploadCloud, FileCog, FileCode2, BookOpenCheck, ListTodo } from "lucide-react";
import { cn } from "../../lib/utils";

const STEPS = [
  { id: "upload", label: "Upload", icon: UploadCloud },
  { id: "parse", label: "Parse", icon: FileCog },
  { id: "segment", label: "Segment", icon: FileCode2 },
  { id: "extract", label: "Extract Obligations", icon: BookOpenCheck },
  { id: "review", label: "Review", icon: BookOpenCheck },
  { id: "tasks", label: "Generate Tasks", icon: ListTodo },
];

export function ProcessingFlow() {
  return (
    <div className="w-full py-4 overflow-x-auto custom-scrollbar">
      <div className="min-w-[600px]">
        <div className="flex items-center justify-between relative">
          {/* Connecting Line */}
          <div className="absolute left-6 right-6 top-5 h-0.5 bg-muted z-0" />

          {/* Steps */}
          {STEPS.map((step, index) => {
            const isFirst = index === 0;
            const Icon = step.icon;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 w-24">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background",
                    isFirst ? "border-primary text-primary shadow-sm" : "border-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span
                  className={cn(
                    "text-[10px] font-medium text-center uppercase tracking-wider",
                    isFirst ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
