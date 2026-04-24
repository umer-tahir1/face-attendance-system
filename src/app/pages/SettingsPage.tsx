import React, { useEffect, useRef, useState } from 'react';
import { db } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { Database, Trash2, AlertTriangle, Clock3 } from 'lucide-react';

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleClearData = async () => {
    if (!confirm('Are you sure? This will delete all attendance and academic records.')) {
      return;
    }

    setClearing(true);
    try {
      await db.clearAll();
      toast.success('System data reset completed.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Failed to reset data');
      console.error(error);
    } finally {
      setClearing(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const payload = await db.exportSystemData();
      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `attendance-system-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();

      window.URL.revokeObjectURL(url);
      toast.success('Data export downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const openImportPicker = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!confirm('Importing will overwrite current departments, programs, classes, teachers, students, timetable, and attendance data. Continue?')) {
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await db.importSystemData(parsed);
      toast.success('Data import completed');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="rounded-lg border bg-white px-4 py-2 text-right shadow-sm">
          <div className="flex items-center justify-end gap-2 text-slate-700">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm font-medium">Current Time</span>
          </div>
          <p className="text-lg font-semibold">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-slate-500">{currentTime.toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>System Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action is restricted to admin use only.
              </AlertDescription>
            </Alert>

            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExportData} disabled={exporting || importing || clearing}>
                <Database className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export Data'}
              </Button>
              <Button variant="outline" onClick={openImportPicker} disabled={exporting || importing || clearing}>
                <Database className="w-4 h-4 mr-2" />
                {importing ? 'Importing...' : 'Import Data'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h4>
              <p className="text-sm text-slate-600 mb-3">
                Permanently removes departments, programs, classes, teachers, students, timetable, and attendance records.
              </p>
              <Button variant="destructive" onClick={handleClearData} disabled={clearing}>
                <Trash2 className="w-4 h-4 mr-2" />
                {clearing ? 'Resetting...' : 'Reset System Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
