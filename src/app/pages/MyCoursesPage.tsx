import React, { useEffect, useState } from 'react';
import { db, Course, TimetableEntry } from '../services/database';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BookOpen, Calendar, Clock } from 'lucide-react';

export default function MyCoursesPage() {
  const [classes, setClasses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [classRows, timetableRows] = await Promise.all([
      db.getAll<Course>('courses'),
      db.getAll<TimetableEntry>('timetable'),
    ]);
    setClasses(classRows);
    setTimetable(timetableRows);
  };

  const slotsByClass = timetable.reduce<Record<string, TimetableEntry[]>>((acc, slot) => {
    const id = slot.classId || slot.courseId;
    if (!acc[id]) {
      acc[id] = [];
    }
    acc[id].push(slot);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Classes</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map((course) => {
          const slots = slotsByClass[course.id] || [];
          return (
            <Card key={course.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    {course.code} - {course.name}
                  </span>
                  <Badge variant="outline">{course.credits} CR</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{slots.length} timetable slot(s)</span>
                  </div>

                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <div key={slot.id} className="p-2 bg-slate-50 rounded">
                        <div className="font-medium">{slot.day || slot.dayOfWeek}</div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4" />
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No schedule assigned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
