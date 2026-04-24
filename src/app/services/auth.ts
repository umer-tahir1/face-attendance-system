import { User } from './database';

class AuthService {
  private currentUser: User | null = null;
  private readonly API_BASE = `${((import.meta as any).env || {}).VITE_API_URL || 'http://localhost:4000'}/api`;

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      this.currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('authToken', data.token);

      if (data.user.role === 'teacher') {
        try {
          const scheduleResponse = await fetch(`${this.API_BASE}/teacher/today-schedule`, {
            headers: {
              Authorization: `Bearer ${data.token}`,
            },
          });
          if (scheduleResponse.ok) {
            const schedulePayload = await scheduleResponse.json();
            localStorage.setItem('teacherTodaySchedule', JSON.stringify(schedulePayload.schedule || []));
          }
        } catch {
          localStorage.removeItem('teacherTodaySchedule');
        }
      }

      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: 'Unable to connect to authentication service' };
    }
  }

  async fetchCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      this.currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      return data.user;
    } catch {
      return this.getCurrentUser();
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('teacherTodaySchedule');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;

    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }

    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  isTeacher(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'teacher';
  }

  hasRole(role: 'admin' | 'teacher'): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}

export const authService = new AuthService();
