export interface QuestionSet {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
}

export interface QuestionSetDetail extends QuestionSet {
  questions: Question[];
}

export interface Question {
  id: string;
  content: string;
  type: string; // 'single', 'multiple', or 'essay'
  options?: Option[];
  correctAnswers?: number[];
}

export interface Option {
  id: number;
  content: string;
}

export interface CreateQuestionSetDto {
  title: string;
  subjectId: string;
  gradeLevel: number;
  description?: string;
}

export interface UpdateQuestionSetDto {
  title?: string;
  subjectId?: string;
  gradeLevel?: number;
  description?: string;
}

export interface CreateQuestionDto {
  content: string;
  type: string;
  options?: CreateOptionDto[];
  correctAnswers?: number[];
}

export interface CreateOptionDto {
  content: string;
}

export interface GenerateAIQuestionsRequest {
  prompt: string;
  questionSetId: string;
  type: string;
  count: number;
}

export interface GenerateAIQuestionsResponse {
  questions: CreateQuestionDto[];
} 