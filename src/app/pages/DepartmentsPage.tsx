import React, { useEffect, useState } from 'react';
import { db, Department, Program, Course, Student } from '../services/database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, Pencil } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [departmentRows, programRows, courseRows] = await Promise.all([
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
        db.getAll<Course>('courses'),
      ]);

      setDepartments(departmentRows);
      setPrograms(programRows);
      setCourses(courseRows);

      setSelectedDepartmentId((prev) =>
        prev && departmentRows.some((row) => row.id === prev) ? prev : null,
      );
      setSelectedProgramId((prev) =>
        prev && programRows.some((row) => row.id === prev) ? prev : null,
      );
      setSelectedCourseId((prev) =>
        prev && courseRows.some((row) => row.id === prev) ? prev : null,
      );
    } catch (error) {
      toast.error('Failed to load hierarchy data');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill all fields');
      return;
    }

    if (editingDepartment) {
      await db.update('departments', {
        ...editingDepartment,
        name: formData.name,
        code: formData.code,
      });
      toast.success('Department updated');
    } else {
      const department: Department = {
        id: `dept_${Date.now()}`,
        name: formData.name,
        code: formData.code,
        createdAt: new Date().toISOString(),
      };

      await db.add('departments', department);
      toast.success('Department created');
    }

    setFormData({ name: '', code: '' });
    setEditingDepartment(null);
    setIsDialogOpen(false);
    loadData();
  };

  const openCreateDialog = () => {
    setEditingDepartment(null);
    setFormData({ name: '', code: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setFormData({ name: department.name, code: department.code });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this department?')) {
      try {
        await db.delete('departments', id);
        toast.success('Department deleted');
        if (selectedDepartmentId === id) {
          setSelectedDepartmentId(null);
          setSelectedProgramId(null);
          setSelectedCourseId(null);
          setClassStudents([]);
        }
        loadData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete department');
      }
    }
  };

  const handleSelectDepartment = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedProgramId(null);
    setSelectedCourseId(null);
    setClassStudents([]);
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedCourseId(null);
    setClassStudents([]);
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setLoadingStudents(true);
    try {
      const students = await db.getStudentsByCourse(courseId);
      setClassStudents(students);
    } catch (error) {
      setClassStudents([]);
      toast.error(error instanceof Error ? error.message : 'Failed to load enrolled students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const selectedDepartment = departments.find((row) => row.id === selectedDepartmentId) || null;
  const filteredPrograms = programs.filter((row) => row.departmentId === selectedDepartmentId);
  const selectedProgram = filteredPrograms.find((row) => row.id === selectedProgramId) || null;
  const filteredCourses = courses.filter((row) => row.programId === selectedProgramId);
  const selectedCourse = filteredCourses.find((row) => row.id === selectedCourseId) || null;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" />Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Edit Department' : 'Create Department'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Computer Science" />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CS" />
              </div>
              <Button onClick={handleSave} className="w-full">{editingDepartment ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Departments ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow
                  key={dept.id}
                  className={`cursor-pointer ${selectedDepartmentId === dept.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectDepartment(dept.id)}
                >
                  <TableCell className="font-mono">{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{new Date(dept.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectDepartment(dept.id);
                        }}
                      >
                        <Eye className="w-4 h-4 text-slate-700" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditDialog(dept);
                        }}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(dept.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedDepartment && (
        <Card className="mt-6">
          <CardContent className="space-y-6 pt-6">
            <div className="rounded border bg-slate-50 p-3 text-sm">
              <span className="font-semibold">{selectedDepartment.name} ({selectedDepartment.code})</span>
              {selectedProgram && (
                <>
                  <span className="mx-2 text-slate-400">/</span>
                  <span className="font-semibold">{selectedProgram.name} ({selectedProgram.code})</span>
                </>
              )}
              {selectedCourse && (
                <>
                  <span className="mx-2 text-slate-400">/</span>
                  <span className="font-semibold">{selectedCourse.code} - {selectedCourse.name}</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded border p-4">
                <h3 className="font-semibold mb-3">Programs ({filteredPrograms.length})</h3>
                {filteredPrograms.length === 0 ? (
                  <p className="text-sm text-slate-500">No programs found in this department.</p>
                ) : (
                  <div className="space-y-2">
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

              <div className="rounded border p-4">
                <h3 className="font-semibold mb-3">Classes ({filteredCourses.length})</h3>
                {!selectedProgram ? (
                  <p className="text-sm text-slate-500">Select a program to view classes.</p>
                ) : filteredCourses.length === 0 ? (
                  <p className="text-sm text-slate-500">No classes found in this program.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        className={`w-full rounded border px-3 py-2 text-left transition-colors ${
                          selectedCourseId === course.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => handleSelectCourse(course.id)}
                      >
                        <div className="font-medium">{course.code} - {course.name}</div>
                        <div className="text-sm text-slate-600">Section {course.section || 'A'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded border p-4">
              <h3 className="font-semibold mb-3">
                Students{selectedCourse ? ` in ${selectedCourse.code}` : ''} ({classStudents.length})
              </h3>

              {!selectedCourse ? (
                <p className="text-sm text-slate-500">Select a class to view enrolled students.</p>
              ) : loadingStudents ? (
                <p className="text-sm text-slate-500">Loading students...</p>
              ) : classStudents.length === 0 ? (
                <p className="text-sm text-slate-500">No students are enrolled in this class.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono">{student.rollNumber}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
