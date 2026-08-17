import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { PipelinePage } from './pages/PipelinePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ClauseExplorerPage } from './pages/ClauseExplorerPage';
import { ClausesPage } from './pages/ClausesPage';
import { ObligationsPage } from './pages/ObligationsPage';
import { TasksPage } from './pages/TasksPage';
import { EvidencePage } from './pages/EvidencePage';
import { CompliancePage } from './pages/CompliancePage';
import { GapAnalysisPage } from './pages/GapAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { SearchPage } from './pages/SearchPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/documents/:documentId/clauses" element={<ClauseExplorerPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/clauses" element={<ClausesPage />} />
        <Route path="/obligations" element={<ObligationsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/gap-analysis" element={<GapAnalysisPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
