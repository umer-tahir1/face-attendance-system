import React, { useEffect, useState, useRef } from 'react';
import { db, AttendanceSession, Student, CurrentClassInfo, TimetableEntry } from '../services/database';
import { attendanceService } from '../services/attendance';
import { faceRecognitionService, FaceMatchResult } from '../services/faceRecognition';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Camera, CheckCircle, XCircle, Loader2, Users, Clock } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [currentClass, setCurrentClass] = useState<CurrentClassInfo | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [loadingCurrentClass, setLoadingCurrentClass] = useState(true);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [sessionCompletedToday, setSessionCompletedToday] = useState(false);
  
  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Recognition results
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<FaceMatchResult[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    refreshClassContext();

    const interval = window.setInterval(() => {
      refreshClassContext();
    }, 60_000);

    return () => {
      stopCamera();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !videoStream) {
      return;
    }

    const videoEl = videoRef.current;
    videoEl.srcObject = videoStream;

    const ensurePlayback = async () => {
      try {
        await videoEl.play();
      } catch (error) {
        // Playback can fail if metadata is not ready; it will retry on loadedmetadata.
        console.warn('Video playback start deferred:', error);
      }
    };

    const onLoadedMetadata = () => {
      void ensurePlayback();
    };

    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    void ensurePlayback();

    return () => {
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (videoEl.srcObject === videoStream) {
        videoEl.srcObject = null;
      }
    };
  }, [videoStream]);

  const refreshClassContext = async () => {
    setLoadingCurrentClass(true);
    try {
      const [current, schedule, sessions] = await Promise.all([
        attendanceService.getCurrentClass(),
        db.getTeacherTodaySchedule(),
        db.getAll<AttendanceSession>('attendanceSessions'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const completed = current
        ? sessions.some(
            (session) =>
              session.status === 'completed' &&
              session.date === today &&
              (session.classId || session.courseId) === current.class_id,
          )
        : false;

      setCurrentClass(current);
      setTodaySchedule(schedule);
      setSessionCompletedToday(completed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load timetable context');
      setCurrentClass(null);
      setTodaySchedule([]);
      setSessionCompletedToday(false);
    } finally {
      setLoadingCurrentClass(false);
    }
  };

  const startSession = async () => {
    if (!currentClass) {
      toast.error('No class scheduled at this time');
      return;
    }

    if (sessionCompletedToday) {
      toast.error('Attendance for this class is already completed today.');
      return;
    }

    try {
      const session = await attendanceService.createSession(
        currentClass.class_id,
        user?.id || '',
        currentClass.section,
        new Date().toISOString().split('T')[0],
        currentClass.start_time,
        currentClass.end_time,
        currentClass.room,
      );

      setActiveSession(session);
      
      // Load enrolled students
      const students = await db.getStudentsByCourse(currentClass.class_id);
      setEnrolledStudents(students);
      
      toast.success('Session started! You can now capture the class photo.');
    } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to start session');
      console.error(error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      setVideoStream(stream);
      toast.success('Camera activated');
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

  const captureClassPhoto = async () => {
    if (!videoRef.current) {
      toast.error('Camera not ready');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    setCapturedImage(imageData);
    stopCamera();
    toast.success('Photo captured! Processing attendance...');
    
    processAttendance(imageData);
  };

  const processAttendance = async (imageData: string) => {
    if (!activeSession || !user) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      setProgress(30);
      
      // Process with AI
      const result = await attendanceService.processAttendanceWithAI(
        activeSession.id,
        activeSession.classId || activeSession.courseId,
        imageData,
      );

      setProgress(70);

      if (result.success) {
        setRecognitionResults(result.results);
        setProgress(100);
        toast.success(`${result.results.length} students marked present!`);
      } else {
        toast.error(result.error || 'Failed to process attendance');
      }
    } catch (error) {
      toast.error('Error processing attendance');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setRecognitionResults([]);
    setProgress(0);
    startCamera();
  };

  const completeSession = async () => {
    if (!activeSession) return;

    await attendanceService.completeSession(activeSession.id);
    
    toast.success('Session completed!');
    
    // Reset
    setActiveSession(null);
    setSessionCompletedToday(true);
    setCapturedImage(null);
    setRecognitionResults([]);
    setEnrolledStudents([]);
    setProgress(0);
    await refreshClassContext();
  };

  const presentStudentIds = new Set(recognitionResults.map(r => r.studentId));
  const absentStudents = enrolledStudents.filter(s => !presentStudentIds.has(s.id));
  const activeClassId = currentClass?.class_id;

  return (
    <div className="p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-slate-500">No timetable assigned for today.</p>
          ) : (
            <div className="space-y-2">
              {todaySchedule.map((slot) => {
                const isCurrent = activeClassId === (slot.classId || slot.courseId);
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isCurrent ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="font-medium">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    <div>{slot.classCode} - {slot.className}</div>
                    <div>{slot.room || 'TBD'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!activeSession ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Current Class</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingCurrentClass ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking active class from timetable...
              </div>
            ) : currentClass ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-slate-500">Course</p>
                    <p className="font-semibold">{currentClass.class_code} - {currentClass.course_name}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-slate-500">Section</p>
                    <p className="font-semibold">{currentClass.section}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-slate-500">Room</p>
                    <p className="font-semibold">{currentClass.room}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-slate-500">Time Slot</p>
                    <p className="font-semibold">{currentClass.start_time} - {currentClass.end_time}</p>
                  </div>
                </div>

                <Button onClick={startSession} className="w-full" size="lg" disabled={sessionCompletedToday}>
                  <Clock className="w-5 h-5 mr-2" />
                  {sessionCompletedToday ? 'Attendance Completed For Today' : 'Start Attendance'}
                </Button>
                {sessionCompletedToday && (
                  <p className="text-sm text-slate-500">
                    This class session has already been completed for today.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-slate-600">
                No class scheduled at this time
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera/Image Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Capture Class Photo</CardTitle>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Session Active
                  </Badge>
                </div>
                <div className="text-sm text-slate-600">
                  {currentClass?.course_name} - Section {currentClass?.section} - {currentClass?.room}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!capturedImage ? (
                    <div className="bg-black rounded-lg overflow-hidden aspect-video">
                      {videoStream ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Button onClick={startCamera} size="lg">
                            <Camera className="w-5 h-5 mr-2" />
                            Activate Camera
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={capturedImage} alt="Captured class" className="w-full rounded-lg" />
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                          <div className="text-center text-white">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                            <p className="font-medium">Processing faces...</p>
                            <Progress value={progress} className="w-48 mx-auto mt-2" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {videoStream && !capturedImage && (
                      <Button onClick={captureClassPhoto} className="flex-1" size="lg">
                        <Camera className="w-5 h-5 mr-2" />
                        Capture Photo
                      </Button>
                    )}
                    {capturedImage && !isProcessing && (
                      <Button onClick={retakePhoto} variant="outline" className="flex-1">
                        Retake Photo
                      </Button>
                    )}
                    {capturedImage && !isProcessing && (
                      <Button onClick={completeSession} className="flex-1">
                        Complete Session
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recognition Results */}
            {recognitionResults.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Present Students ({recognitionResults.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recognitionResults.map((result) => (
                      <div key={result.studentId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium">{result.studentName}</p>
                          <p className="text-sm text-slate-600">
                            Confidence: {result.confidence.toFixed(1)}%
                          </p>
                        </div>
                        <Badge className="bg-green-600">Present</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enrolled Students Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Enrolled Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-600 mb-4">
                  Total: {enrolledStudents.length} | Present: {recognitionResults.length} | Absent: {absentStudents.length}
                </div>

                <div className="space-y-4">
                  {/* Absent Students */}
                  {absentStudents.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Absent ({absentStudents.length})
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {absentStudents.map((student) => (
                          <div key={student.id} className="p-2 bg-red-50 rounded text-sm">
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-slate-600">{student.rollNumber}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
