import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center items-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-primary/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-1000"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[100px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-moss/10 blur-[100px] rounded-full mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            <Gavel className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-4xl font-extrabold tracking-tight font-serif text-foreground mb-2">
            RegTrace
          </h2>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Agentic Compliance Intelligence
          </p>
        </div>

        <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                placeholder="admin@regtrace.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-destructive text-sm bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-3 text-sm transition-all hover:bg-primary/90 disabled:opacity-70 flex justify-center items-center gap-2"
            >
              <span className="relative z-10">{isLoading ? "Authenticating..." : "Sign in to Dashboard"}</span>
              {!isLoading && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
              <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center mb-4 font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
              <Zap className="w-3 h-3 text-primary" /> Quick Demo Access
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Autofill System Admin", email: "admin@regtrace.com" },
                { label: "Autofill Compliance Officer", email: "officer@regtrace.com" },
                { label: "Autofill Viewer", email: "viewer@regtrace.com" }
              ].map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => {
                    setEmail(role.email);
                    setPassword("YourSecurePasswordHere!");
                  }}
                  className="w-full px-4 py-2 text-xs font-medium text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 rounded-lg transition-colors flex justify-between items-center group"
                >
                  <span>{role.label}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary">Use</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
