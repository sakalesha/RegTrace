import React, { useState } from 'react';
import { useAuth } from './AuthContext';

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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--paper)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "48px 16px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h2 style={{ textAlign: "center", fontSize: "32px", fontWeight: "800", color: "var(--ink)", fontFamily: "'Playfair Display', serif" }}>
          RegTrace
        </h2>
        <p className="rt-sans" style={{ textAlign: "center", fontSize: "14px", color: "var(--slate)", marginTop: "8px", marginBottom: "32px" }}>
          Sign in to your account
        </p>

        <div className="rt-card" style={{ padding: "32px" }}>
          <form style={{ display: "flex", flexDirection: "column", gap: "24px" }} onSubmit={handleSubmit}>
            <div>
              <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--ink)", marginBottom: "6px" }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--paper-deep)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--ink)", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--paper-deep)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  outline: "none"
                }}
              />
            </div>

            {error && (
              <div className="rt-sans" style={{ color: "var(--rust)", fontSize: "13px", backgroundColor: "rgba(166, 70, 46, 0.1)", padding: "10px", borderRadius: "6px", border: "1px solid rgba(166, 70, 46, 0.3)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="rt-btn rt-btn-primary rt-sans"
              style={{ width: "100%", padding: "12px", fontSize: "14px" }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div className="rt-sans" style={{ marginTop: "32px", backgroundColor: "rgba(255, 255, 255, 0.5)", padding: "20px", borderRadius: "8px", border: "1px dashed var(--slate)", fontSize: "12px" }}>
          <div style={{ fontWeight: "600", color: "var(--ink)", marginBottom: "12px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            TechSprint Demo Accounts
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div 
              style={{ cursor: "pointer", padding: "8px", backgroundColor: "var(--white)", borderRadius: "4px", border: "1px solid var(--paper-deep)", transition: "all 0.15s ease" }}
              onClick={() => { setEmail('admin@regtrace.com'); setPassword('Admin123!'); }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--paper-deep)"}
            >
              <div style={{ fontWeight: "600", color: "var(--ink)", marginBottom: "2px" }}>System Admin</div>
              <div style={{ color: "var(--slate)" }}>admin@regtrace.com / Admin123!</div>
            </div>
            
            <div 
              style={{ cursor: "pointer", padding: "8px", backgroundColor: "var(--white)", borderRadius: "4px", border: "1px solid var(--paper-deep)", transition: "all 0.15s ease" }}
              onClick={() => { setEmail('officer@regtrace.com'); setPassword('Officer123!'); }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--paper-deep)"}
            >
              <div style={{ fontWeight: "600", color: "var(--ink)", marginBottom: "2px" }}>Compliance Officer</div>
              <div style={{ color: "var(--slate)" }}>officer@regtrace.com / Officer123!</div>
            </div>
            
            <div 
              style={{ cursor: "pointer", padding: "8px", backgroundColor: "var(--white)", borderRadius: "4px", border: "1px solid var(--paper-deep)", transition: "all 0.15s ease" }}
              onClick={() => { setEmail('viewer@regtrace.com'); setPassword('Viewer123!'); }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--gold)"}
              onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--paper-deep)"}
            >
              <div style={{ fontWeight: "600", color: "var(--ink)", marginBottom: "2px" }}>Viewer / Auditor</div>
              <div style={{ color: "var(--slate)" }}>viewer@regtrace.com / Viewer123!</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "12px", color: "var(--slate)", fontStyle: "italic" }}>
            Click an account to auto-fill credentials
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
