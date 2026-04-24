import React, { useEffect, useState } from 'react';
import { db, Course } from '../services/database';
import { attendanceService } from '../services/attendance';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { FileDown, FileText, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

export default function ReportsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [classStats, setClassStats] = useState<any | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const data = await db.getAll<Course>('courses');
    setCourses(data);
  };

  const generateReport = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    setLoading(true);
    try {
      const payload = await attendanceService.getCourseAttendanceAnalytics(selectedCourseId);
      setReportData(payload.students || []);
      setMonthlyTrend(payload.monthlyTrend || []);
      setClassStats(payload.classStats || null);
      setHasGenerated(true);
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!selectedCourseId || reportData.length === 0) return;
    const course = courses.find(c => c.id === selectedCourseId);
    if (course) {
      await attendanceService.generatePDFReport(selectedCourseId, course.name);
      toast.success('PDF downloaded');
    }
  };

  const exportCSV = async () => {
    if (!selectedCourseId || reportData.length === 0) return;
    const course = courses.find(c => c.id === selectedCourseId);
    if (course) {
      await attendanceService.exportToCSV(selectedCourseId, course.name);
      toast.success('CSV downloaded');
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Reports</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Loading...' : 'Generate'}
            </Button>
          </div>

          {reportData.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={exportCSV}>
                <FileDown className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Total Students</div>
                <div className="text-2xl font-bold mt-1">{reportData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Avg Attendance</div>
                <div className="text-2xl font-bold mt-1 text-green-600">
                  {(classStats?.averageAttendance || 0).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Defaulters (&lt;75%)</div>
                <div className="text-2xl font-bold mt-1 text-red-600">
                  {classStats?.defaulters || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-600">Total Sessions</div>
                <div className="text-2xl font-bold mt-1">
                  {classStats?.totalSessions || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Attendance Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={reportData.map((row) => ({ name: row.student.rollNumber, percentage: row.stats.attendancePercentage }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="percentage" name="Attendance %" stroke="#16a34a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Report - {selectedCourse?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Total Sessions</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Attendance %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row) => {
                    const isDefaulter = row.stats.attendancePercentage < 75;
                    return (
                      <TableRow key={row.student.id} className={isDefaulter ? 'bg-red-50' : ''}>
                        <TableCell className="font-mono">{row.student.rollNumber}</TableCell>
                        <TableCell className="font-medium">{row.student.name}</TableCell>
                        <TableCell>{row.stats.totalSessions}</TableCell>
                        <TableCell>{row.stats.attendedSessions}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{row.stats.attendancePercentage.toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={row.stats.attendancePercentage} 
                              className="h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {isDefaulter ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Defaulter
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Good
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {hasGenerated && reportData.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">No attendance records exist for this class yet.</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={[{ month: 'N/A', percentage: 0 }]}> 
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="percentage" name="Attendance %" stroke="#94a3b8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
