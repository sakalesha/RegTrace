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
          
          <div style={{ marginTop: "32px", borderTop: "1px solid var(--paper-deep)", paddingTop: "24px" }}>
            <p className="rt-sans" style={{ fontSize: "12px", color: "var(--slate)", textAlign: "center", marginBottom: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Quick Demo Access
            </p>
            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@regtrace.com");
                  setPassword("YourSecurePasswordHere!");
                }}
                className="rt-btn rt-btn-secondary rt-sans"
                style={{ width: "100%", padding: "8px", fontSize: "13px" }}
              >
                Autofill System Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("officer@regtrace.com");
                  setPassword("YourSecurePasswordHere!");
                }}
                className="rt-btn rt-btn-secondary rt-sans"
                style={{ width: "100%", padding: "8px", fontSize: "13px" }}
              >
                Autofill Compliance Officer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("viewer@regtrace.com");
                  setPassword("YourSecurePasswordHere!");
                }}
                className="rt-btn rt-btn-secondary rt-sans"
                style={{ width: "100%", padding: "8px", fontSize: "13px" }}
              >
                Autofill Viewer
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default LoginPage;
