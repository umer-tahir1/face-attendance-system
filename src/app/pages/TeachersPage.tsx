import React, { useEffect, useMemo, useState } from 'react';
import { db, Teacher, Department, Course, Program } from '../services/database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';

type HierarchyStep = 'departments' | 'programs' | 'courses' | 'teachers';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<HierarchyStep>('departments');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teachersData, deptData, programData, coursesData] = await Promise.all([
        db.getAll<Teacher>('teachers'),
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
        db.getAll<Course>('courses'),
      ]);

      setTeachers(teachersData);
      setDepartments(deptData);
      setPrograms(programData);
      setCourses(coursesData);

      setSelectedDepartmentId((prev) =>
        prev && deptData.some((department) => department.id === prev) ? prev : null,
      );
      setSelectedProgramId((prev) =>
        prev && programData.some((program) => program.id === prev) ? prev : null,
      );
      setSelectedCourseId((prev) =>
        prev && coursesData.some((course) => course.id === prev) ? prev : null,
      );
    } catch {
      toast.error('Failed to load teachers hierarchy');
    }
  };

  const handleSave = async () => {
    const fallbackDepartmentId = selectedDepartmentId || departments[0]?.id || '';

    if (!formData.name || !formData.employeeId || !fallbackDepartmentId) {
      toast.error('Please fill all required fields');
      return;
    }

    const teacher: Teacher = {
      id: `teacher_${Date.now()}`,
      ...formData,
      departmentId: fallbackDepartmentId,
      assignedCourses: [],
      createdAt: new Date().toISOString(),
    };

    const created = await db.add<any>('teachers', teacher);
    if (created?.credentials) {
      toast.success(
        `Teacher added. Login: ${created.credentials.email} / ${created.credentials.temporaryPassword}`,
      );
    } else {
      toast.success('Teacher added');
    }
    setFormData({ name: '', email: '', employeeId: '' });
    setIsDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this teacher?')) {
      await db.delete('teachers', id);
      toast.success('Teacher deleted');
      loadData();
    }
  };

  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) || null;

  const filteredPrograms = useMemo(
    () => programs.filter((program) => program.departmentId === selectedDepartmentId),
    [programs, selectedDepartmentId],
  );

  const selectedProgram = filteredPrograms.find((program) => program.id === selectedProgramId) || null;

  const filteredCourses = useMemo(
    () => courses.filter((course) => course.programId === selectedProgramId),
    [courses, selectedProgramId],
  );

  const selectedCourse = filteredCourses.find((course) => course.id === selectedCourseId) || null;

  const teachersForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return [];

    const matched = new Map<string, Teacher>();

    if (selectedCourse.teacherId) {
      const owner = teachers.find((teacher) => teacher.id === selectedCourse.teacherId);
      if (owner) {
        matched.set(owner.id, owner);
      }
    }

    teachers
      .filter((teacher) => Array.isArray(teacher.assignedCourses) && teacher.assignedCourses.includes(selectedCourse.id))
      .forEach((teacher) => {
        matched.set(teacher.id, teacher);
      });

    return Array.from(matched.values());
  }, [selectedCourse, teachers]);

  const handleSelectDepartment = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedProgramId(null);
    setSelectedCourseId(null);
    setCurrentStep('programs');
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedCourseId(null);
    setCurrentStep('courses');
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentStep('teachers');
  };

  const stepLabels: Record<HierarchyStep, string> = {
    departments: 'Departments',
    programs: 'Programs',
    courses: 'Courses',
    teachers: 'Teachers',
  };

  const canOpenStep = (step: HierarchyStep) => {
    if (step === 'departments') return true;
    if (step === 'programs') return Boolean(selectedDepartment);
    if (step === 'courses') return Boolean(selectedProgram);
    return Boolean(selectedCourse);
  };

  const handleBack = () => {
    if (currentStep === 'teachers') {
      setCurrentStep('courses');
      return;
    }
    if (currentStep === 'courses') {
      setCurrentStep('programs');
      return;
    }
    if (currentStep === 'programs') {
      setCurrentStep('departments');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Teacher</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Dr. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="teacher@nust.edu.pk" />
              </div>
              <div className="space-y-2">
                <Label>Employee ID *</Label>
                <Input value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} placeholder="EMP-001" />
              </div>
              <Button onClick={handleSave} className="w-full">Add Teacher</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teachers by Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(stepLabels) as HierarchyStep[]).map((step, index) => {
              const active = currentStep === step;
              const enabled = canOpenStep(step);
              return (
                <Button
                  key={step}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  disabled={!enabled}
                  onClick={() => setCurrentStep(step)}
                >
                  {index + 1}. {stepLabels[step]}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded border bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium">Current:</span>
            <Badge variant="outline">{stepLabels[currentStep]}</Badge>
            {selectedDepartment && <Badge variant="outline">Dept: {selectedDepartment.code}</Badge>}
            {selectedProgram && <Badge variant="outline">Program: {selectedProgram.code}</Badge>}
            {selectedCourse && <Badge variant="outline">Course: {selectedCourse.code}</Badge>}
          </div>

          <div className="rounded border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{stepLabels[currentStep]}</h3>
              {currentStep !== 'departments' && (
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
            </div>

            {currentStep === 'departments' && (
              <>
                {departments.length === 0 ? (
                  <p className="text-sm text-slate-500">No departments found.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {departments.map((department) => (
                      <button
                        key={department.id}
                        className={`w-full rounded border px-4 py-3 text-left transition-colors ${
                          selectedDepartmentId === department.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectDepartment(department.id)}
                      >
                        <div className="font-medium">{department.name}</div>
                        <div className="text-sm text-slate-600">{department.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {currentStep === 'programs' && (
              <>
                {!selectedDepartment ? (
                  <p className="text-sm text-slate-500">Select a department first.</p>
                ) : filteredPrograms.length === 0 ? (
                  <p className="text-sm text-slate-500">No programs in selected department.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPrograms.map((program) => (
                      <button
                        key={program.id}
                        className={`w-full rounded border px-4 py-3 text-left transition-colors ${
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
              </>
            )}

            {currentStep === 'courses' && (
              <>
                {!selectedProgram ? (
                  <p className="text-sm text-slate-500">Select a program first.</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-sm text-slate-500">No courses in selected program.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        className={`w-full rounded border px-4 py-3 text-left transition-colors ${
                          selectedCourseId === course.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectCourse(course.id)}
                      >
                        <div className="font-medium">{course.name}</div>
                        <div className="text-sm text-slate-600">
                          {course.code}
                          {course.section ? ` • ${course.section}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {currentStep === 'teachers' && (
              <>
                {!selectedCourse ? (
                  <p className="text-sm text-slate-500">Select a course first.</p>
                ) : (
                  <>
                    <div className="mb-4 rounded border bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium">{selectedCourse.name}</div>
                      <div className="text-slate-600">
                        {selectedCourse.code}
                        {selectedCourse.section ? ` • ${selectedCourse.section}` : ''}
                      </div>
                    </div>

                    {teachersForSelectedCourse.length === 0 ? (
                      <p className="text-sm text-slate-500">No teacher assigned to this course.</p>
                    ) : (
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teachersForSelectedCourse.map((teacher) => (
                              <TableRow key={teacher.id}>
                                <TableCell className="font-mono">{teacher.employeeId}</TableCell>
                                <TableCell className="font-medium">{teacher.name}</TableCell>
                                <TableCell>{teacher.email || 'N/A'}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(teacher.id)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
