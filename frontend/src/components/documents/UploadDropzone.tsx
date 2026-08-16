import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileUp, XCircle, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMB?: number;
}

export function UploadDropzone({ onFileSelected, maxSizeMB = 25 }: UploadDropzoneProps) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
      if (fileRejections.length > 0) {
        const error = fileRejections[0].errors[0];
        console.error("File rejected:", error.message);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: maxSizeBytes,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
  });

  return (
    <div className="w-full">
      <motion.div
        {...(getRootProps() as any)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        animate={{
          borderColor: isDragReject ? "#ef4444" : isDragActive ? "#3b82f6" : "#e5e7eb",
          backgroundColor: isDragReject ? "#fef2f2" : isDragActive ? "#eff6ff" : "#ffffff",
        }}
        className={`relative flex flex-col items-center justify-center w-full h-64 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isDragReject ? (
            <motion.div
              key="reject"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-destructive"
            >
              <XCircle className="w-12 h-12 mb-4 text-destructive" />
              <p className="text-lg font-medium">File type not supported</p>
            </motion.div>
          ) : isDragActive ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-primary"
            >
              <FileUp className="w-12 h-12 mb-4 text-primary animate-bounce" />
              <p className="text-lg font-medium">Drop your document here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-muted-foreground"
            >
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-sm text-foreground">
                <span className="font-semibold text-primary">Click to browse</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, PNG, JPG (Max {maxSizeMB}MB)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Error Feedback */}
      <AnimatePresence>
        {fileRejections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {fileRejections[0].errors[0].code === 'file-too-large' 
                  ? `File is larger than ${maxSizeMB}MB` 
                  : fileRejections[0].errors[0].message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
