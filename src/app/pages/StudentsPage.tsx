import React, { useEffect, useState } from 'react';
import { db, Student, Department, Program, Course } from '../services/database';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Camera, Trash2, Eye } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognition';
import { useApp } from '../context/AppContext';

export default function StudentsPage() {
  const { dbInitialized } = useApp();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    departmentId: '',
    programId: '',
    enrolledCourses: [] as string[],
  });

  // Camera state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [faceDescriptors, setFaceDescriptors] = useState<Float32Array[]>([]);

  useEffect(() => {
    if (dbInitialized) {
      loadData();
    }
  }, [dbInitialized]);

  const loadData = async () => {
    try {
      const [studentsData, departmentsData, programsData, coursesData] = await Promise.all([
        db.getAll<Student>('students'),
        db.getAll<Department>('departments'),
        db.getAll<Program>('programs'),
        db.getAll<Course>('courses'),
      ]);
      setStudents(studentsData);
      setDepartments(departmentsData);
      setPrograms(programsData);
      setCourses(coursesData);

      const nextDepartmentId =
        selectedDepartmentId && departmentsData.some((department) => department.id === selectedDepartmentId)
          ? selectedDepartmentId
          : departmentsData[0]?.id || null;

      const programsInDepartment = programsData.filter((program) => program.departmentId === nextDepartmentId);
      const nextProgramId =
        selectedProgramId && programsInDepartment.some((program) => program.id === selectedProgramId)
          ? selectedProgramId
          : programsInDepartment[0]?.id || null;

      const coursesInProgram = coursesData.filter((course) => course.programId === nextProgramId);
      const nextCourseId =
        selectedCourseId && coursesInProgram.some((course) => course.id === selectedCourseId)
          ? selectedCourseId
          : coursesInProgram[0]?.id || null;

      setSelectedDepartmentId(nextDepartmentId);
      setSelectedProgramId(nextProgramId);
      setSelectedCourseId(nextCourseId);
    } catch (error) {
      console.error('Failed to load student data:', error);
      toast.error('Failed to load students data');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast.success('Camera started');
    } catch (error) {
      toast.error('Failed to access camera');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !faceRecognitionService.isModelsLoaded()) {
      toast.error('Camera or face recognition not ready');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');

      // Detect face and extract descriptor
      const img = new Image();
      img.src = imageData;
      await new Promise((resolve) => { img.onload = resolve; });

      const detection = await faceRecognitionService.detectFace(img);
      
      if (detection) {
        setCapturedImages(prev => [...prev, imageData]);
        setFaceDescriptors(prev => [...prev, detection.descriptor]);
        toast.success(`Face ${capturedImages.length + 1} captured successfully!`);
      } else {
        toast.error('No face detected. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to capture face');
      console.error('Capture error:', error);
    }
  };

  const handleSaveStudent = async () => {
    if (!formData.name || !formData.rollNumber || !formData.departmentId || !formData.programId) {
      toast.error('Please fill all required fields');
      return;
    }

    const normalizedRoll = formData.rollNumber.trim().toLowerCase();
    const rollAlreadyExists = students.some((student) => student.rollNumber.trim().toLowerCase() === normalizedRoll);
    if (rollAlreadyExists) {
      toast.error('A student with this roll number is already registered');
      return;
    }

    if (capturedImages.length < 3) {
      toast.error('Please capture at least 3 face images');
      return;
    }

    if (faceDescriptors.length === 0) {
      toast.error('Face data is missing. Please capture face images again.');
      return;
    }

    try {
      const student: Student = {
        id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...formData,
        rollNumber: formData.rollNumber.trim(),
        email: formData.email.trim(),
        faceDescriptors,
        faceImages: capturedImages,
        createdAt: new Date().toISOString(),
      };

      await db.add('students', student);
      toast.success('Student registered successfully!');
      
      // Reset form
      setFormData({
        name: '',
        rollNumber: '',
        email: '',
        departmentId: '',
        programId: '',
        enrolledCourses: [],
      });
      setCapturedImages([]);
      setFaceDescriptors([]);
      setIsAddDialogOpen(false);
      setIsCameraDialogOpen(false);
      stopCamera();
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register student';
      toast.error(message);
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      await db.delete('students', id);
      toast.success('Student deleted');
      loadData();
    }
  };

  const openCameraDialog = () => {
    setIsCameraDialogOpen(true);
    setTimeout(startCamera, 500);
  };

  const closeCameraDialog = () => {
    stopCamera();
    setIsCameraDialogOpen(false);
  };

  const openStudentImages = (student: Student) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const openRegisterDialog = () => {
    setFormData((prev) => ({
      ...prev,
      departmentId: selectedDepartmentId || prev.departmentId,
      programId: selectedProgramId || prev.programId,
      enrolledCourses: selectedCourseId ? [selectedCourseId] : prev.enrolledCourses,
    }));
    setIsAddDialogOpen(true);
  };

  const handleSelectDepartment = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedProgramId(null);
    setSelectedCourseId(null);
    setSearchTerm('');
  };

  const handleSelectProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedCourseId(null);
    setSearchTerm('');
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSearchTerm('');
  };

  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) || null;
  const filteredPrograms = programs.filter((program) => program.departmentId === selectedDepartmentId);
  const selectedProgram = filteredPrograms.find((program) => program.id === selectedProgramId) || null;
  const filteredCourses = courses.filter((course) => course.programId === selectedProgramId);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

  const studentsInSelectedCourse = selectedCourseId
    ? students.filter((student) => (student.enrolledCourses || []).includes(selectedCourseId))
    : [];

  const filteredStudents = studentsInSelectedCourse.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const availablePrograms = programs.filter((program) => program.departmentId === formData.departmentId);
  const availableCourses = courses.filter((course) => course.programId === formData.programId);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Students Management</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openRegisterDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Register Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Register New Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number *</Label>
                  <Input
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g., 21F-1234"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@nust.edu.pk"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        departmentId: value,
                        // Prevent stale program selection when department changes.
                        programId: '',
                        enrolledCourses: [],
                      }))
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
                  <Label>Program *</Label>
                  <Select
                    value={formData.programId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        programId: value,
                        // Keep class enrollments consistent with selected program.
                        enrolledCourses: [],
                      }))
                    }
                    disabled={!formData.departmentId || availablePrograms.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={formData.departmentId ? 'Select program' : 'Select department first'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrograms.map(prog => (
                        <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="mb-2 block">Enroll In Classes</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {availableCourses.length === 0 ? (
                    <p className="text-sm text-slate-500">Select a program to view available classes</p>
                  ) : (
                    availableCourses.map((course) => {
                      const checked = formData.enrolledCourses.includes(course.id);
                      return (
                        <label key={course.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const isChecked = Boolean(value);
                              setFormData((prev) => ({
                                ...prev,
                                enrolledCourses: isChecked
                                  ? [...prev.enrolledCourses, course.id]
                                  : prev.enrolledCourses.filter((id) => id !== course.id),
                              }));
                            }}
                          />
                          <span>{course.code} - {course.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Face Images ({capturedImages.length}/10)</Label>
                  <Button variant="outline" size="sm" onClick={openCameraDialog}>
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Faces
                  </Button>
                </div>
                
                {capturedImages.length > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {capturedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img src={img} alt={`Face ${idx + 1}`} className="w-full h-full object-cover rounded border" />
                        <button
                          onClick={() => {
                            setCapturedImages(prev => prev.filter((_, i) => i !== idx));
                            setFaceDescriptors(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {capturedImages.length < 3 && (
                  <p className="text-sm text-amber-600 mt-2">⚠️ Minimum 3 images required</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveStudent} disabled={capturedImages.length < 3}>
                  Save Student
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Camera Dialog */}
      <Dialog open={isCameraDialogOpen} onOpenChange={(open) => !open && closeCameraDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Capture Face Images</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
                style={{ maxHeight: '400px' }}
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={captureImage} size="lg">
                <Camera className="w-5 h-5 mr-2" />
                Capture ({capturedImages.length}/10)
              </Button>
              <Button variant="outline" onClick={closeCameraDialog}>Done</Button>
            </div>
            <p className="text-sm text-center text-slate-600">
              Look straight at the camera. Capture from different angles for better recognition.
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
                          <TableHead>Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCourses.map((course) => {
                          const enrolledCount = students.filter((student) =>
                            (student.enrolledCourses || []).includes(course.id),
                          ).length;

                          return (
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
                              <TableCell>{enrolledCount}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCourse ? (
        <>
          <Card className="mt-6">
            <CardContent className="pt-6">
              <Input
                placeholder={`Search students in ${selectedCourse.code} by name or roll number...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Students in {selectedCourse.code} - {selectedCourse.name} ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Face Images</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        {studentsInSelectedCourse.length === 0
                          ? 'No students enrolled in this class yet'
                          : 'No students found for this search'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const dept = departments.find((department) => department.id === student.departmentId);
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono">{student.rollNumber}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email || 'N/A'}</TableCell>
                          <TableCell>{dept?.code || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {(student.faceImages || []).length} images
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openStudentImages(student)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Select a course to view students for that class.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Student Face Images{selectedStudent ? ` - ${selectedStudent.name}` : ''}
            </DialogTitle>
          </DialogHeader>

          {!selectedStudent || (selectedStudent.faceImages || []).length === 0 ? (
            <p className="text-sm text-slate-500">No face images available for this student.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {(selectedStudent.faceImages || []).map((image, index) => (
                <div key={`${selectedStudent.id}_${index}`} className="rounded border overflow-hidden bg-slate-50">
                  <img
                    src={image}
                    alt={`Student face ${index + 1}`}
                    className="w-full h-44 object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
