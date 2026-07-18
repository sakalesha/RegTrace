import React, { useState, useEffect } from "react";
import { ListChecks, Link2, CheckCircle2 } from "lucide-react";
import { getTasks, completeTask } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusChip } from "../components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import { useNavigate } from "react-router-dom";

export default function TasksPage({ documentId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks(documentId);
      setTasks(data || []);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [documentId]);

  const handleComplete = async (taskId) => {
    try {
      await completeTask(taskId);
      await fetchTasks();
    } catch (e) {
      console.error("Failed to complete task", e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ListChecks size={20} className="text-gold" />
        <h2 className="text-xl font-bold tracking-tight text-ink">Generated Compliance Tasks</h2>
      </div>

      <Card>
        {tasks.length === 0 && !loading ? (
          <div className="p-12 text-center text-slate text-sm">
            No tasks yet — approve obligations in the Review Queue to generate tasks.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clause</TableHead>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-gold font-bold">Clause {t.clauseNumber || t.clause_number || "-"}</TableCell>
                  <TableCell className="text-[13px] text-ink max-w-[300px] truncate" title={t.title}>
                    {t.title}
                  </TableCell>
                  <TableCell className="text-xs text-slate">{t.owner || t.assigned_to || "Unassigned"}</TableCell>
                  <TableCell className="text-xs text-ink font-medium">{t.deadline || "-"}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.priority === 'High' ? 'bg-rust/20 text-rust' : 'bg-gold/20 text-gold'}`}>
                      {t.priority || "Medium"}
                    </span>
                  </TableCell>
                  <TableCell><StatusChip status={t.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === "OPEN" && (
                        <Button size="sm" variant="success" onClick={() => handleComplete(t.id || t.task_id)}>
                          <CheckCircle2 size={14} className="mr-1" /> Complete
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => navigate(`/trace?task_id=${t.id || t.task_id}`)}>
                        <Link2 size={14} className="mr-1" /> Trace
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
