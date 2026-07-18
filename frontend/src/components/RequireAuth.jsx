import React from 'react';
import { useAuth } from '../auth/AuthContext';
import LoginPage from '../auth/LoginPage';

const RequireAuth = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--white)", fontSize: "20px" }}>Loading RegTrace...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="rt-card" style={{ padding: "32px", textAlign: "center", border: "1px solid var(--rust)" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--rust)", marginBottom: "16px" }}>Access Denied</h2>
          <p style={{ color: "var(--slate)" }}>You do not have permission to view this page.</p>
          <p className="rt-sans" style={{ color: "var(--slate)", marginTop: "8px", fontSize: "14px" }}>Your Role: {user.role}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default RequireAuth;
