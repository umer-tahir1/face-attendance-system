import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { db, Course, Student, Teacher } from '../services/database';
import {
  AppNotification,
  communicationService,
  Conversation,
  ConversationFilters,
  ConversationMessage,
  ConversationPriority,
  ConversationStatus,
  ConversationType,
} from '../services/communication';
import { useAuth } from '../context/AuthContext';

const statusClassMap: Record<string, string> = {
  open: 'bg-orange-100 text-orange-700 border-orange-200',
  in_review: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

const priorityClassMap: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

const formatLabel = (value?: string | null) => {
  if (!value) return 'N/A';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const toAttachmentList = (raw: string) =>
  raw
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

const initialConversationForm = {
  type: 'attendance_issue' as ConversationType,
  priority: 'medium' as ConversationPriority,
  subject: '',
  relatedCourseId: '',
  relatedLab: '',
  studentId: '',
  issueType: 'absent_marked_wrong',
  requestedChange: '',
  evidenceText: '',
  messageText: '',
  attachmentsText: '',
};

export default function CommunicationPage() {
  const { user, isAdmin, isTeacher } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [summary, setSummary] = useState({
    open: 0,
    inReview: 0,
    resolved: 0,
    rejected: 0,
    highPriority: 0,
  });

  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newConversation, setNewConversation] = useState(initialConversationForm);
  const [messageText, setMessageText] = useState('');
  const [messageAttachmentsText, setMessageAttachmentsText] = useState('');
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);

  const [resolutionForm, setResolutionForm] = useState({
    studentId: '',
    date: '',
    status: 'present' as 'present' | 'absent',
    note: '',
  });

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const visibleConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((item) => {
      const subject = String(item.subject || '').toLowerCase();
      const courseCode = String(item.relatedCourseCode || '').toLowerCase();
      const courseName = String(item.relatedCourseName || '').toLowerCase();
      const creator = String(item.createdByName || '').toLowerCase();
      return (
        subject.includes(term) ||
        courseCode.includes(term) ||
        courseName.includes(term) ||
        creator.includes(term)
      );
    });
  }, [conversations, searchTerm]);

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;

  const loadReferenceData = useCallback(async () => {
    try {
      const [classRows, studentRows] = await Promise.all([
        db.getAll<Course>('courses'),
        db.getAll<Student>('students'),
      ]);
      setCourses(classRows);
      setStudents(studentRows);

      if (isAdmin) {
        const teacherRows = await db.getAll<Teacher>('teachers');
        setTeachers(teacherRows);
      }
    } catch {
      toast.error('Failed to load communication data');
    }
  }, [isAdmin]);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await communicationService.getConversations(filters);
      setConversations(rows);

      setSelectedConversationId((prev) => {
        if (!prev) return rows[0]?.id || null;
        return rows.some((row) => row.id === prev) ? prev : rows[0]?.id || null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load conversations');
    }
  }, [filters]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const rows = await communicationService.getMessages(conversationId);
      setMessages(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load messages');
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const rows = await communicationService.getNotifications({ limit: 20 });
      setNotifications(rows);
    } catch {
      // Keep page responsive even when notification request fails.
    }
  }, []);

  const loadSummary = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await communicationService.getAdminSummary();
      setSummary(response);
    } catch {
      // Summary widgets are non-blocking.
    }
  }, [isAdmin]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadNotifications();
    loadSummary();
  }, [loadNotifications, loadSummary]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedConversationId);
    communicationService.markMessagesRead(selectedConversationId).catch(() => {});
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const suggestedStudentId = selectedConversation.attendanceIssuePayload?.studentId || '';
    const suggestedIdentifier = students.find((student) => student.id === suggestedStudentId)?.rollNumber || suggestedStudentId;
    setResolutionForm((prev) => ({
      ...prev,
      studentId: suggestedIdentifier || prev.studentId,
    }));
  }, [selectedConversation, students]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadConversations();
      loadNotifications();
      loadSummary();
      if (selectedConversationId) {
        loadMessages(selectedConversationId);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadConversations, loadMessages, loadNotifications, loadSummary, selectedConversationId]);

  const handleCreateConversation = async () => {
    if (!newConversation.messageText.trim()) {
      toast.error('Message is required');
      return;
    }

    if (newConversation.type !== 'general' && !newConversation.relatedCourseId) {
      toast.error('Select related class');
      return;
    }

    if (newConversation.type === 'lab_issue' && !newConversation.relatedLab.trim()) {
      toast.error('Lab name is required for lab issue');
      return;
    }

    const attendanceIssue =
      newConversation.type === 'attendance_issue' || newConversation.type === 'lab_issue'
        ? {
            studentId: newConversation.studentId || undefined,
            courseName: courses.find((item) => item.id === newConversation.relatedCourseId)?.name,
            labName: newConversation.relatedLab || undefined,
            issueType: newConversation.issueType as any,
            requestedChange: newConversation.requestedChange || undefined,
            evidence: toAttachmentList(newConversation.evidenceText),
          }
        : undefined;

    try {
      const created = await communicationService.createConversation({
        type: newConversation.type,
        priority: newConversation.priority,
        subject: newConversation.subject || undefined,
        relatedCourseId: newConversation.relatedCourseId || undefined,
        relatedLab: newConversation.relatedLab || undefined,
        messageText: newConversation.messageText,
        attachments: toAttachmentList(newConversation.attachmentsText),
        attendanceIssue,
      });

      toast.success('Conversation created');
      setNewConversation(initialConversationForm);
      setIsCreateDialogOpen(false);
      await loadConversations();
      setSelectedConversationId(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId) {
      toast.error('Select a conversation first');
      return;
    }

    if (!messageText.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    try {
      await communicationService.sendMessage(selectedConversationId, {
        messageText: messageText.trim(),
        attachments: toAttachmentList(messageAttachmentsText),
        parentMessageId: replyToMessageId || undefined,
      });

      setMessageText('');
      setMessageAttachmentsText('');
      setReplyToMessageId(null);

      await loadMessages(selectedConversationId);
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleStatusUpdate = async (status: ConversationStatus, note?: string) => {
    if (!selectedConversationId) return;

    try {
      await communicationService.updateConversationStatus(selectedConversationId, {
        status,
        note,
      });
      toast.success(`Status updated to ${formatLabel(status)}`);
      await loadConversations();
      await loadNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleResolveAttendance = async () => {
    if (!selectedConversationId) return;
    if (!resolutionForm.studentId) {
      toast.error('Student ID or roll number is required');
      return;
    }

    try {
      await communicationService.resolveAttendance(selectedConversationId, {
        studentId: resolutionForm.studentId,
        status: resolutionForm.status,
        date: resolutionForm.date || undefined,
        note: resolutionForm.note || undefined,
      });

      toast.success('Attendance corrected and conversation resolved');
      await loadConversations();
      await loadNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve attendance issue');
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await communicationService.markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark notifications');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardContent className="pt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Communication</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">Open {summary.open}</Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">Review {summary.inReview}</Badge>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolved {summary.resolved}</Badge>
                <Badge className="bg-red-100 text-red-700 border-red-200">High {summary.highPriority}</Badge>
              </>
            ) : null}

            <Badge variant="outline">Unread {unreadNotifications}</Badge>

            <Button variant="outline" onClick={markAllNotificationsRead}>
              Mark Notifications Read
            </Button>

            {isTeacher ? (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Report Issue</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newConversation.type}
                          onValueChange={(value) =>
                            setNewConversation((prev) => ({
                              ...prev,
                              type: value as ConversationType,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="attendance_issue">Attendance Issue</SelectItem>
                            <SelectItem value="lab_issue">Lab Issue</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={newConversation.priority}
                          onValueChange={(value) =>
                            setNewConversation((prev) => ({
                              ...prev,
                              priority: value as ConversationPriority,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Class</Label>
                        <Select
                          value={newConversation.relatedCourseId || 'none'}
                          onValueChange={(value) =>
                            setNewConversation((prev) => ({
                              ...prev,
                              relatedCourseId: value === 'none' ? '' : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Class</SelectItem>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.code} - {course.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Input
                      value={newConversation.subject}
                      onChange={(event) =>
                        setNewConversation((prev) => ({
                          ...prev,
                          subject: event.target.value,
                        }))
                      }
                      placeholder="Subject"
                    />

                    {(newConversation.type === 'attendance_issue' || newConversation.type === 'lab_issue') && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Student</Label>
                          <Select
                            value={newConversation.studentId || 'none'}
                            onValueChange={(value) =>
                              setNewConversation((prev) => ({
                                ...prev,
                                studentId: value === 'none' ? '' : value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Student</SelectItem>
                              {students.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.rollNumber} - {student.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Issue</Label>
                          <Select
                            value={newConversation.issueType}
                            onValueChange={(value) =>
                              setNewConversation((prev) => ({
                                ...prev,
                                issueType: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="absent_marked_wrong">Absent Marked Wrong</SelectItem>
                              <SelectItem value="lab_missing">Lab Missing</SelectItem>
                              <SelectItem value="attendance_not_updated">Attendance Not Updated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Lab</Label>
                          <Input
                            value={newConversation.relatedLab}
                            onChange={(event) =>
                              setNewConversation((prev) => ({
                                ...prev,
                                relatedLab: event.target.value,
                              }))
                            }
                            placeholder="Lab name"
                          />
                        </div>
                      </div>
                    )}

                    <Textarea
                      value={newConversation.requestedChange}
                      onChange={(event) =>
                        setNewConversation((prev) => ({
                          ...prev,
                          requestedChange: event.target.value,
                        }))
                      }
                      placeholder="Requested change"
                    />

                    <Textarea
                      value={newConversation.messageText}
                      onChange={(event) =>
                        setNewConversation((prev) => ({
                          ...prev,
                          messageText: event.target.value,
                        }))
                      }
                      placeholder="Message"
                    />

                    <Input
                      value={newConversation.evidenceText}
                      onChange={(event) =>
                        setNewConversation((prev) => ({
                          ...prev,
                          evidenceText: event.target.value,
                        }))
                      }
                      placeholder="Evidence (one per line)"
                    />

                    <Input
                      value={newConversation.attachmentsText}
                      onChange={(event) =>
                        setNewConversation((prev) => ({
                          ...prev,
                          attachmentsText: event.target.value,
                        }))
                      }
                      placeholder="Attachments (one per line)"
                    />

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateConversation}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Card className="xl:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value === 'all' ? undefined : (value as ConversationStatus),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: value === 'all' ? undefined : (value as ConversationPriority),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: value === 'all' ? undefined : (value as ConversationType),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="attendance_issue">Attendance Issue</SelectItem>
                  <SelectItem value="lab_issue">Lab Issue</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.courseId || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    courseId: value === 'all' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin ? (
              <Select
                value={filters.teacherId || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    teacherId: value === 'all' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <div className="max-h-[520px] overflow-auto space-y-2 pr-1">
              {visibleConversations.length === 0 ? (
                <p className="text-sm text-slate-500">No conversations</p>
              ) : (
                visibleConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className={`w-full rounded border p-3 text-left transition ${
                      selectedConversationId === conversation.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {conversation.subject || 'Attendance Issue'}
                      </span>
                      {conversation.unreadCount ? <Badge>{conversation.unreadCount}</Badge> : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className={statusClassMap[conversation.status] || ''}>
                        {formatLabel(conversation.status)}
                      </Badge>
                      <Badge className={priorityClassMap[conversation.priority] || ''}>
                        {formatLabel(conversation.priority)}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 truncate">
                      {conversation.relatedCourseCode ? `${conversation.relatedCourseCode} - ` : ''}
                      {conversation.relatedCourseName || conversation.relatedLab || conversation.type}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle>{selectedConversation ? selectedConversation.subject || 'Conversation' : 'Conversation'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedConversation ? (
              <p className="text-sm text-slate-500">Select any conversation.</p>
            ) : (
              <>
                <div className="rounded border bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={statusClassMap[selectedConversation.status] || ''}>
                      {formatLabel(selectedConversation.status)}
                    </Badge>
                    <Badge className={priorityClassMap[selectedConversation.priority] || ''}>
                      {formatLabel(selectedConversation.priority)}
                    </Badge>
                    <Badge variant="outline">{formatLabel(selectedConversation.type)}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                    <p>
                      Class:{' '}
                      {selectedConversation.relatedCourseCode
                        ? `${selectedConversation.relatedCourseCode} - ${selectedConversation.relatedCourseName}`
                        : 'N/A'}
                    </p>
                    <p>Lab: {selectedConversation.relatedLab || 'N/A'}</p>
                    <p>By: {selectedConversation.createdByName || 'Unknown'}</p>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto space-y-2 pr-1">
                  {messages.map((message) => {
                    const ownMessage = message.senderId === user?.id;

                    return (
                      <div key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`w-full max-w-[86%] rounded border p-3 ${
                            ownMessage ? 'bg-blue-50 border-blue-200' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              {message.senderName || 'Unknown'} ({formatLabel(message.senderRole)})
                            </span>
                            <span>{new Date(message.timestamp).toLocaleString()}</span>
                          </div>

                          {message.parentMessageId ? (
                            <p className="text-xs text-indigo-600 mt-1">Reply to #{message.parentMessageId.slice(-6)}</p>
                          ) : null}

                          <p className="text-sm mt-2 whitespace-pre-wrap">{message.messageText}</p>

                          {message.attachments.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment, index) => (
                                <p key={`${message.id}-${index}`} className="text-xs text-blue-700 break-all">
                                  {attachment}
                                </p>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              {message.readStatus ? 'Read' : 'Unread'}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => setReplyToMessageId(message.id)}>
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {replyToMessageId ? (
                    <div className="text-xs text-indigo-600 flex items-center justify-between rounded border border-indigo-100 bg-indigo-50 px-2 py-1">
                      <span>Replying to #{replyToMessageId.slice(-6)}</span>
                      <Button variant="link" className="h-auto px-0 py-0 text-xs" onClick={() => setReplyToMessageId(null)}>
                        Clear
                      </Button>
                    </div>
                  ) : null}

                  <Textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Write a message"
                  />
                  <Input
                    value={messageAttachmentsText}
                    onChange={(event) => setMessageAttachmentsText(event.target.value)}
                    placeholder="Attachments (optional, one per line)"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleSendMessage}>Send</Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        selectedConversationId &&
                        communicationService
                          .markMessagesRead(selectedConversationId)
                          .then(() => loadMessages(selectedConversationId))
                      }
                    >
                      Mark Read
                    </Button>
                  </div>
                </div>

                {isAdmin ? (
                  <div className="rounded border p-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleStatusUpdate('in_review')}>
                        In Review
                      </Button>
                      <Button variant="outline" onClick={() => handleStatusUpdate('resolved')}>
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const reason = window.prompt('Reason for rejection') || '';
                          handleStatusUpdate('rejected', reason);
                        }}
                      >
                        Reject
                      </Button>
                    </div>

                    {(selectedConversation.type === 'attendance_issue' || selectedConversation.type === 'lab_issue') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Student ID or Roll Number"
                          value={resolutionForm.studentId}
                          onChange={(event) =>
                            setResolutionForm((prev) => ({
                              ...prev,
                              studentId: event.target.value,
                            }))
                          }
                        />
                        <Input
                          type="date"
                          value={resolutionForm.date}
                          onChange={(event) =>
                            setResolutionForm((prev) => ({
                              ...prev,
                              date: event.target.value,
                            }))
                          }
                        />
                        <Select
                          value={resolutionForm.status}
                          onValueChange={(value) =>
                            setResolutionForm((prev) => ({
                              ...prev,
                              status: value as 'present' | 'absent',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Attendance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Note"
                          value={resolutionForm.note}
                          onChange={(event) =>
                            setResolutionForm((prev) => ({
                              ...prev,
                              note: event.target.value,
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <Button onClick={handleResolveAttendance}>Approve and Apply Fix</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
