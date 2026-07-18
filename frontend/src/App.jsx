import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/RequireAuth";
import AppShell from "./components/AppShell";

import IngestPage from "./pages/Ingest";
import ReviewQueuePage from "./pages/ReviewQueue";
import TasksPage from "./pages/Tasks";
import TracePage from "./pages/Trace";
import DashboardPage from "./pages/Dashboard";
import AdminTab from "./components/AdminTab"; // Will keep AdminTab as is for now

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
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="ingest" element={<IngestPage />} />
            <Route path="review" element={<ReviewQueuePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="trace" element={<TracePage />} />
            <Route path="admin" element={<AdminTab />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
