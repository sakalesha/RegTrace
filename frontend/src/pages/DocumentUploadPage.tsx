import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon, Save } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { UploadDropzone } from "../components/documents/UploadDropzone";
import { SelectedFileCard } from "../components/documents/SelectedFileCard";
import { MetadataForm, type DocumentUploadFormValues } from "../components/documents/MetadataForm";
import { ValidationPanel } from "../components/documents/ValidationPanel";
import { ProcessingFlow } from "../components/documents/ProcessingFlow";
import { Button } from "../components/ui/button-1";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { api } from "../lib/api";

export function DocumentUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Validation state
  const [isMetadataValid, setIsMetadataValid] = useState(false);
  const [completedFieldsCount, setCompletedFieldsCount] = useState(0);
  const [totalFieldsCount, setTotalFieldsCount] = useState(7); // default 7 required fields

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleValidityChange = (isValid: boolean, completed: number, total: number) => {
    setIsMetadataValid(isValid);
    setCompletedFieldsCount(completed);
    setTotalFieldsCount(total);
  };

  const handleStartProcessing = async (data: DocumentUploadFormValues) => {
    if (!file) return;

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Append metadata
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      const result = await api.documents.upload(formData);
      
      // Successfully uploaded
      navigate(`/documents/${result.document_id}/clauses`);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload document. Please check the console and ensure backend is running.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFormSubmit = () => {
    // We trigger form submission via the external button using the form id
    const formElement = document.getElementById("metadata-form") as HTMLFormElement;
    if (formElement) {
      formElement.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  const handleSaveDraft = () => {
    // In a real application, save to local storage or backend draft endpoint
    alert("Draft saved locally");
  };

  return (
    <AppLayout>
      <div className="flex flex-col max-w-5xl mx-auto gap-6 mt-4 pb-20">
        
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full w-8 h-8 mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Regulatory Document</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Uploaded documents will be parsed, segmented into clauses, converted into obligations, reviewed, and transformed into operational compliance tasks.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          
          {/* Main Form Area (Left Column, spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">1. Document File</CardTitle>
                <CardDescription>Upload a single regulatory document for processing</CardDescription>
              </CardHeader>
              <CardContent>
                {!file ? (
                  <UploadDropzone onFileSelected={handleFileSelected} />
                ) : (
                  <SelectedFileCard file={file} onRemove={handleRemoveFile} />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">2. Document Metadata</CardTitle>
                <CardDescription>Provide details required for the compliance pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <MetadataForm 
                  initialValues={{ title: file?.name.split('.').slice(0, -1).join('.') || "" }}
                  onValidityChange={handleValidityChange}
                  onSubmit={handleStartProcessing}
                />
              </CardContent>
            </Card>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <ValidationPanel 
              file={file}
              isMetadataValid={isMetadataValid}
              completedFieldsCount={completedFieldsCount}
              totalFieldsCount={totalFieldsCount}
            />

            <Card className="shadow-sm border border-border bg-slate-50/50 dark:bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Processing Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessingFlow />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4">
              <Button 
                onClick={triggerFormSubmit} 
                disabled={!file || !isMetadataValid || isUploading}
                className="w-full gap-2 h-11"
              >
                <UploadIcon className="w-4 h-4" />
                {isUploading ? "Processing..." : "Start Processing"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleSaveDraft}
                className="w-full gap-2 h-11"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                disabled={isUploading}
                className="w-full h-11"
              >
                Cancel
              </Button>
            </div>
          </div>
          
        </div>
      </div>
    </AppLayout>
  );
}
