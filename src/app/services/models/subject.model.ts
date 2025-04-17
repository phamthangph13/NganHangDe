export interface Subject {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  gradeLevel: number; // Khối lớp từ 1-12
  createdAt?: Date;
  updatedAt?: Date;
} 