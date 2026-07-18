import React, { useState } from 'react';
import { UserPlus, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { createUserApi } from '../auth/authApi';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminTab() {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'VIEWER',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await createUserApi(formData);
      setSuccess(`User ${formData.email} successfully created!`);
      setFormData({ email: '', full_name: '', role: 'VIEWER', password: '' });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-destructive/10 rounded-lg">
          <ShieldAlert size={24} className="text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-serif">System Administration</h2>
          <p className="text-sm text-muted-foreground">Manage users and system access</p>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-border/50 pb-4">
          <UserPlus size={18} className="text-primary" /> Provision New User
        </h3>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-start gap-3">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Full Name</label>
            <input 
              type="text" 
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none"
              placeholder="e.g. jane@regtrace.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none appearance-none"
            >
              <option value="VIEWER">Viewer / Auditor (Read-only)</option>
              <option value="COMPLIANCE_OFFICER">Compliance Officer (Review & Run Pipelines)</option>
              <option value="ADMIN">System Admin (Full Access)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Temporary Password</label>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none"
              placeholder="Min 8 chars, 1 uppercase, 1 special char"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">Users will be forced to change this on their first login (pending UI implementation).</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? <span className="animate-pulse">Provisioning User...</span> : "Create User Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
