import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, TeacherProfile } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';

export default function TeacherSettingsPage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await db.getTeacherProfile();
      setProfile(data);
      setName(data.name);
      setAvatarUrl(data.avatarUrl || '');
    } catch (error) {
      toast.error('Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  };

  const initials = useMemo(() => {
    const source = name || profile?.name || user?.name || 'T';
    return source
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [name, profile?.name, user?.name]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await db.updateTeacherProfile({ name, avatarUrl: avatarUrl || null });
      updateUser({ name: updated.name, avatarUrl: updated.avatarUrl });
      toast.success('Profile updated');
      await loadProfile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickAvatar = () => {
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Please choose an image smaller than 2 MB');
      return;
    }

    const toDataUrl = (blob: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    try {
      const dataUrl = await toDataUrl(file);
      setAvatarUrl(dataUrl);
      toast.success('Profile image selected');
    } catch {
      toast.error('Failed to read selected image');
    } finally {
      event.target.value = '';
    }
  };

  const onRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const updatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please enter both current and new password');
      return;
    }

    setChangingPassword(true);
    try {
      await db.changeTeacherPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teacher Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || profile?.avatarUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile?.name}</p>
              <p className="text-sm text-slate-600">{profile?.email}</p>
              <p className="text-sm text-slate-600">{profile?.department}</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarFileChange}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onPickAvatar}>
              Upload Profile Picture
            </Button>
            {(avatarUrl || profile?.avatarUrl) && (
              <Button type="button" variant="outline" onClick={onRemoveAvatar}>
                Remove Picture
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (Read Only)</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
          </div>

          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.assignedCourses.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.assignedCourses.map((course) => (
                <div key={course.id} className="rounded border p-3">
                  <p className="font-semibold">{course.code} - {course.name}</p>
                  <p className="text-sm text-slate-600">Section {course.section || 'A'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No assigned courses</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button onClick={updatePassword} disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
