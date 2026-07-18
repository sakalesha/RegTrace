import React, { useState } from 'react';
import { UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { createUserApi } from '../auth/authApi';

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
      setFormData({
        email: '',
        full_name: '',
        role: 'VIEWER',
        password: ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <ShieldAlert size={24} color="var(--rust)" />
        <h2 style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "'Playfair Display', serif" }}>
          System Administration
        </h2>
      </div>

      <div className="rt-card" style={{ padding: "32px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "24px", display: "flex", alignItems: "center", gap: "8px" }}>
          <UserPlus size={18} /> Provision New User
        </h3>

        {error && (
          <div style={{ backgroundColor: "rgba(166, 70, 46, 0.1)", color: "var(--rust)", padding: "12px", borderRadius: "6px", marginBottom: "20px", fontSize: "13px", border: "1px solid rgba(166, 70, 46, 0.2)" }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: "rgba(78, 107, 76, 0.1)", color: "var(--moss)", padding: "12px", borderRadius: "6px", marginBottom: "20px", fontSize: "13px", border: "1px solid rgba(78, 107, 76, 0.2)", display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Full Name</label>
            <input 
              type="text" 
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--paper-deep)", outline: "none" }}
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div>
            <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Email Address</label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--paper-deep)", outline: "none" }}
              placeholder="e.g. jane@regtrace.com"
            />
          </div>

          <div>
            <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--paper-deep)", outline: "none", backgroundColor: "var(--white)" }}
            >
              <option value="VIEWER">Viewer / Auditor (Read-only)</option>
              <option value="COMPLIANCE_OFFICER">Compliance Officer (Review & Run Pipelines)</option>
              <option value="ADMIN">System Admin (Full Access)</option>
            </select>
          </div>

          <div>
            <label className="rt-sans" style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Temporary Password</label>
            <input 
              type="text" 
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--paper-deep)", outline: "none" }}
              placeholder="Min 8 chars, 1 uppercase, 1 special char"
            />
            <p style={{ fontSize: "11px", color: "var(--slate)", marginTop: "6px" }}>Users will be forced to change this on their first login (pending UI implementation).</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="rt-btn rt-btn-dark"
            style={{ width: "100%", padding: "12px", marginTop: "8px" }}
          >
            {loading ? "Provisioning..." : "Create User Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
