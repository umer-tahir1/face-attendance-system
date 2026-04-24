import React, { useEffect, useState } from 'react';
import { db, Course, Department, Program, Teacher } from '../services/database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    section: 'A',
    departmentId: '',
    programId: '',
    teacherId: '',
    credits: 3,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesData, deptData, progData, teacherData] = await Promise.all([
        db.getAll<Course>('courses'),
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
        db.getAll<Teacher>('teachers'),
      ]);

      setCourses(coursesData);
      setDepartments(deptData);
      setPrograms(progData);
      setTeachers(teacherData);

      setSelectedDepartmentId((prev) =>
        prev && deptData.some((department) => department.id === prev) ? prev : null,
      );
      setSelectedProgramId((prev) =>
        prev && progData.some((program) => program.id === prev) ? prev : null,
      );
      setSelectedCourseId((prev) =>
        prev && coursesData.some((course) => course.id === prev) ? prev : null,
      );
    } catch (error) {
      toast.error('Failed to load courses hierarchy data');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.departmentId || !formData.programId || !formData.teacherId) {
      toast.error('Please fill all fields');
      return;
    }

    const course: Course = {
      id: `course_${Date.now()}`,
      ...formData,
      createdAt: new Date().toISOString(),
    };

    await db.add('courses', course);
    toast.success('Course created');
    setFormData({ name: '', code: '', section: 'A', departmentId: '', programId: '', teacherId: '', credits: 3 });
    setIsDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this course?')) {
      try {
        await db.delete('courses', id);
        toast.success('Course deleted');
        if (selectedCourseId === id) {
          setSelectedCourseId(null);
        }
        loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete course');
      }
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

  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) || null;
  const filteredPrograms = programs.filter((program) => program.departmentId === selectedDepartmentId);
  const selectedProgram = filteredPrograms.find((program) => program.id === selectedProgramId) || null;
  const filteredCourses = courses.filter((course) => course.programId === selectedProgramId);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Course</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Data Structures" />
              </div>
              <div className="space-y-2">
                <Label>Course Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CS201" />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Input value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="A" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      departmentId: value,
                      programId: '',
                      teacherId: '',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={formData.programId} onValueChange={(value) => setFormData({ ...formData, programId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.filter(p => p.departmentId === formData.departmentId).map(prog => (
                      <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Teacher</Label>
                <Select value={formData.teacherId} onValueChange={(value) => setFormData({ ...formData, teacherId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers
                      .filter((teacher) => teacher.departmentId === formData.departmentId)
                      .map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.employeeId})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credits</Label>
                <Input type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })} />
              </div>
              <Button onClick={handleSave} className="w-full">Create</Button>
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
                          <TableHead>Credits</TableHead>
                          <TableHead>Lab</TableHead>
                          <TableHead>Lab Attendance</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCourses.map((course) => (
                          <TableRow
                            key={course.id}
                            className={selectedCourseId === course.id ? 'bg-blue-50' : ''}
                            onClick={() => setSelectedCourseId(course.id)}
                          >
                            <TableCell className="font-mono">{course.code}</TableCell>
                            <TableCell className="font-medium">{course.name}</TableCell>
                            <TableCell>{course.section || 'A'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{course.credits} CR</Badge>
                            </TableCell>
                            <TableCell>
                              {course.hasLab ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                  {course.labName || `${course.name} Lab`}
                                </Badge>
                              ) : (
                                <Badge variant="outline">No Lab</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={course.labAttendanceRequired ? 'default' : 'outline'}>
                                {course.labAttendanceRequired ? 'Required' : 'Not Required'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(course.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </TableCell>
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
    </div>
  );
}
