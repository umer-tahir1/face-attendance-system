import React, { useEffect, useMemo, useState } from 'react';
import { db, Course, Department, Program, TimetableEntry } from '../services/database';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
};

export default function TimetablePage() {
  const [classes, setClasses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    day: 'MONDAY',
    startTime: '09:00',
    endTime: '10:30',
    room: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [courseRows, timetableRows, departmentRows, programRows] = await Promise.all([
        db.getAll<Course>('courses'),
        db.getAll<TimetableEntry>('timetable'),
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
      ]);
      setClasses(courseRows);
      setEntries(timetableRows);
      setDepartments(departmentRows);
      setPrograms(programRows);

      const nextDepartmentId =
        selectedDepartmentId && departmentRows.some((department) => department.id === selectedDepartmentId)
          ? selectedDepartmentId
          : departmentRows[0]?.id || null;

      const programsInDepartment = programRows.filter((program) => program.departmentId === nextDepartmentId);
      const nextProgramId =
        selectedProgramId && programsInDepartment.some((program) => program.id === selectedProgramId)
          ? selectedProgramId
          : programsInDepartment[0]?.id || null;

      const coursesInProgram = courseRows.filter((course) => course.programId === nextProgramId);
      const nextCourseId =
        selectedCourseId && coursesInProgram.some((course) => course.id === selectedCourseId)
          ? selectedCourseId
          : coursesInProgram[0]?.id || null;

      setSelectedDepartmentId(nextDepartmentId);
      setSelectedProgramId(nextProgramId);
      setSelectedCourseId(nextCourseId);
    } catch (error) {
      toast.error('Failed to load timetable data');
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      setFormData((prev) => ({ ...prev, classId: selectedCourseId }));
    }
  }, [selectedCourseId]);

  const saveEntry = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a class first');
      return;
    }

    if (!formData.classId || !formData.day || !formData.startTime || !formData.endTime || !formData.room) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await db.add('timetable', {
        courseId: selectedCourseId,
        classId: selectedCourseId,
        teacherId: '',
        day: formData.day,
        dayOfWeek: formData.day,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room,
      });

      toast.success('Timetable entry created');
      setOpen(false);
      setFormData({ classId: selectedCourseId, day: 'MONDAY', startTime: '09:00', endTime: '10:30', room: '' });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create entry');
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this timetable entry?')) {
      return;
    }

    try {
      await db.delete('timetable', id);
      toast.success('Timetable entry deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete timetable entry');
    }
  };

  const handleSelectDepartment = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedProgramId(null);
    setSelectedCourseId(null);
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedCourseId(null);
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const openCreateDialog = () => {
    if (!selectedCourseId) {
      toast.error('Select a course first to manage its schedule');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      classId: selectedCourseId,
      day: prev.day || 'MONDAY',
      startTime: prev.startTime || '09:00',
      endTime: prev.endTime || '10:30',
    }));
    setOpen(true);
  };

  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) || null;
  const filteredPrograms = programs.filter((program) => program.departmentId === selectedDepartmentId);
  const selectedProgram = filteredPrograms.find((program) => program.id === selectedProgramId) || null;
  const filteredCourses = classes.filter((course) => course.programId === selectedProgramId);
  const selectedCourse = classes.find((course) => course.id === selectedCourseId) || null;

  const selectedCourseEntries = useMemo(() => {
    if (!selectedCourseId) {
      return [];
    }

    return entries
      .filter((entry) => (entry.classId || entry.courseId) === selectedCourseId)
      .sort((a, b) => {
        const dayOrder = (DAY_ORDER[a.day || a.dayOfWeek] || 99) - (DAY_ORDER[b.day || b.dayOfWeek] || 99);
        if (dayOrder !== 0) {
          return dayOrder;
        }

        return a.startTime.localeCompare(b.startTime);
      });
  }, [entries, selectedCourseId]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Timetable</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={!selectedCourseId}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Timetable Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selected Class</Label>
                <div className="rounded border bg-slate-50 px-3 py-2 text-sm">
                  {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'No class selected'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={formData.day} onValueChange={(value) => setFormData((prev) => ({ ...prev, day: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room</Label>
                <Input
                  value={formData.room}
                  onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                  placeholder="Room 101"
                />
              </div>

              <Button className="w-full" onClick={saveEntry}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Programs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => {
                const departmentProgramCount = programs.filter(
                  (program) => program.departmentId === department.id,
                ).length;

                return (
                  <TableRow
                    key={department.id}
                    className={`cursor-pointer ${
                      selectedDepartmentId === department.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectDepartment(department.id)}
                  >
                    <TableCell className="font-mono">{department.code}</TableCell>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell>{departmentProgramCount}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedDepartment && (
        <Card className="mt-6">
          <CardContent className="space-y-6 pt-6">
            <div className="rounded border bg-slate-50 p-3 text-sm">
              <span className="font-semibold">
                {selectedDepartment.name} ({selectedDepartment.code})
              </span>
              {selectedProgram && (
                <>
                  <span className="mx-2 text-slate-400">/</span>
                  <span className="font-semibold">
                    {selectedProgram.name} ({selectedProgram.code})
                  </span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="rounded border p-4 lg:col-span-4">
                <h3 className="font-semibold mb-3">Programs ({filteredPrograms.length})</h3>
                {filteredPrograms.length === 0 ? (
                  <p className="text-sm text-slate-500">No programs found in this department.</p>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {filteredPrograms.map((program) => (
                      <button
                        key={program.id}
                        className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                          selectedProgramId === program.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectProgram(program.id)}
                      >
                        <div className="font-medium">{program.name}</div>
                        <div className="text-sm text-slate-600">{program.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded border p-4 lg:col-span-8">
                <h3 className="font-semibold mb-3">Courses ({filteredCourses.length})</h3>
                {!selectedProgram ? (
                  <p className="text-sm text-slate-500">Select a program to view courses.</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-sm text-slate-500">No courses found in this program.</p>
                ) : (
                  <div className="max-h-[520px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Teacher</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCourses.map((course) => (
                          <TableRow
                            key={course.id}
                            className={`cursor-pointer ${
                              selectedCourseId === course.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleSelectCourse(course.id)}
                          >
                            <TableCell className="font-mono">{course.code}</TableCell>
                            <TableCell className="font-medium">{course.name}</TableCell>
                            <TableCell>{course.section || 'A'}</TableCell>
                            <TableCell>{course.teacherName || 'Unassigned'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCourse && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Schedule for {selectedCourse.code} - {selectedCourse.name} ({selectedCourseEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCourseEntries.length === 0 ? (
              <p className="text-sm text-slate-500">
                No schedule exists for this class yet. Use Add Schedule to create one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCourseEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.day || entry.dayOfWeek}</TableCell>
                      <TableCell>{entry.section || selectedCourse.section || 'A'}</TableCell>
                      <TableCell>{entry.room || 'TBD'}</TableCell>
                      <TableCell>{entry.startTime}</TableCell>
                      <TableCell>{entry.endTime}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
