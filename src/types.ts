export interface Teacher {
  id: number;
  name: string;
  email: string;
  discipline: string;
  classes: string[];
  role: 'teacher' | 'admin';
}

export interface Student {
  id: number;
  name: string;
  age: number;
  grade: string;
  parent_name: string;
  phone: string;
  address: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name?: string;
  teacher_id: number;
  date: string;
  status: 'present' | 'absent' | 'justified';
}

export interface Lesson {
  id: number;
  teacher_id: number;
  date: string;
  grade: string;
  content: string;
  activities: string;
  observations: string;
}

export interface Grade {
  id: number;
  student_id: number;
  student_name?: string;
  teacher_id: number;
  activity_name: string;
  score: number;
  type: 'activity' | 'test';
  date: string;
}
