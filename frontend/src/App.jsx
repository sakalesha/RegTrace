import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppShell from "./components/AppShell";

import IngestTab from "./components/IngestTab";
import ReviewTab from "./components/ReviewTab";
import TasksTab from "./components/TasksTab";
import TraceTab from "./components/TraceTab";
import DashboardTab from "./components/DashboardTab";
import AdminTab from "./components/AdminTab";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardTab />} />
            <Route path="ingest" element={<IngestTab />} />
            <Route path="review" element={<ReviewTab />} />
            <Route path="tasks" element={<TasksTab />} />
            <Route path="trace" element={<TraceTab />} />
            <Route path="admin" element={<AdminTab />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
