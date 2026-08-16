import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, type KeyboardEvent, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

// Schema matching the specified form interface
const documentSchema = z.object({
  title: z.string().min(1, "Document Title is required"),
  source: z.enum(["SEBI", "RBI", "NSE", "BSE", "IRDAI", "Other"], {
    message: "Regulatory Source is required",
  }),
  documentType: z.enum([
    "Master Circular",
    "Circular",
    "Notification",
    "Guideline",
    "Amendment",
    "Framework",
    "Advisory",
  ], {
    message: "Document Type is required",
  }),
  intermediaryCategories: z.array(z.string()).min(1, "At least one category is required"),
  publicationDate: z.string().min(1, "Publication Date is required"),
  effectiveDate: z.string().min(1, "Effective Date is required"),
  language: z.enum(["English", "Hindi", "Other"], {
    message: "Language is required",
  }),
  referenceNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type DocumentUploadFormValues = z.infer<typeof documentSchema>;

interface MetadataFormProps {
  initialValues?: Partial<DocumentUploadFormValues>;
  onValidityChange: (isValid: boolean, completedFields: number, totalFields: number) => void;
  onSubmit: (data: DocumentUploadFormValues) => void;
  id?: string;
}

const CATEGORY_OPTIONS = [
  "Stock Broker",
  "Depository Participant",
  "Asset Management Company",
  "Registrar & Transfer Agent",
  "Investment Adviser",
  "Market Infrastructure Institution",
];

export function MetadataForm({ initialValues, onValidityChange, onSubmit, id = "metadata-form" }: MetadataFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: initialValues?.title || "",
      source: "SEBI",
      documentType: "Master Circular",
      intermediaryCategories: ["Stock Broker"],
      publicationDate: new Date().toISOString().slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
      language: "English",
      referenceNumber: "",
      tags: [],
    },
    mode: "onChange",
  });

  const formValues = watch();

  // Track completion
  useEffect(() => {
    const requiredFields = [
      "title",
      "source",
      "documentType",
      "intermediaryCategories",
      "publicationDate",
      "effectiveDate",
      "language",
    ];
    let completed = 0;
    
    if (formValues.title) completed++;
    if (formValues.source) completed++;
    if (formValues.documentType) completed++;
    if (formValues.intermediaryCategories && formValues.intermediaryCategories.length > 0) completed++;
    if (formValues.publicationDate) completed++;
    if (formValues.effectiveDate) completed++;
    if (formValues.language) completed++;

    onValidityChange(isValid, completed, requiredFields.length);
  }, [formValues, isValid, onValidityChange]);

  const [tagInput, setTagInput] = useState("");
  const tags = watch("tags") || [];

  const handleAddTag = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setValue("tags", [...tags, newTag], { shouldValidate: true });
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue("tags", tags.filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Document Title */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Document Title <span className="text-destructive">*</span>
          </label>
          <input
            {...register("title")}
            type="text"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors.title && "border-destructive focus-visible:ring-destructive"
            )}
            placeholder="e.g. Master Circular for Stock Brokers"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        {/* Regulatory Source */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Regulatory Source <span className="text-destructive">*</span>
          </label>
          <select
            {...register("source")}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors.source && "border-destructive focus:ring-destructive"
            )}
          >
            <option value="">Select Source</option>
            <option value="SEBI">SEBI</option>
            <option value="RBI">RBI</option>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
            <option value="IRDAI">IRDAI</option>
            <option value="Other">Other</option>
          </select>
          {errors.source && <p className="text-sm text-destructive">{errors.source.message}</p>}
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Document Type <span className="text-destructive">*</span>
          </label>
          <select
            {...register("documentType")}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              errors.documentType && "border-destructive focus:ring-destructive"
            )}
          >
            <option value="">Select Type</option>
            <option value="Master Circular">Master Circular</option>
            <option value="Circular">Circular</option>
            <option value="Notification">Notification</option>
            <option value="Guideline">Guideline</option>
            <option value="Amendment">Amendment</option>
            <option value="Framework">Framework</option>
            <option value="Advisory">Advisory</option>
          </select>
          {errors.documentType && <p className="text-sm text-destructive">{errors.documentType.message}</p>}
        </div>

        {/* Intermediary Category (Multi-select) */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Intermediary Category <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORY_OPTIONS.map((cat) => (
              <label key={cat} className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer group">
                <input
                  type="checkbox"
                  value={cat}
                  {...register("intermediaryCategories")}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <span className="group-hover:text-foreground transition-colors">{cat}</span>
              </label>
            ))}
          </div>
          {errors.intermediaryCategories && <p className="text-sm text-destructive">{errors.intermediaryCategories.message}</p>}
        </div>

        {/* Publication Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Publication Date <span className="text-destructive">*</span>
          </label>
          <input
            {...register("publicationDate")}
            type="date"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              errors.publicationDate && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {errors.publicationDate && <p className="text-sm text-destructive">{errors.publicationDate.message}</p>}
        </div>

        {/* Effective Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Effective Date <span className="text-destructive">*</span>
          </label>
          <input
            {...register("effectiveDate")}
            type="date"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              errors.effectiveDate && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {errors.effectiveDate && <p className="text-sm text-destructive">{errors.effectiveDate.message}</p>}
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Language <span className="text-destructive">*</span>
          </label>
          <select
            {...register("language")}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              errors.language && "border-destructive focus:ring-destructive"
            )}
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Other">Other</option>
          </select>
          {errors.language && <p className="text-sm text-destructive">{errors.language.message}</p>}
        </div>

        {/* Reference Number */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Reference Number</label>
          <input
            {...register("referenceNumber")}
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="e.g. SEBI/HO/MIRSD/..."
          />
        </div>

        {/* Tags */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-foreground">Tags</label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="flex h-full w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                placeholder="Type and press Enter to add tags..."
              />
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </form>
  );
}
