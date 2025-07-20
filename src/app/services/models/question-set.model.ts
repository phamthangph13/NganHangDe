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
  bloomLevel?: string; // Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao
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
  bloomLevel?: string;
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

// Dual Gemini Interfaces
export interface DualGeminiQuestionRequest {
  prompt: string;
  questionSetId: string;
  type: string;
  count: number;
  gradeLevel: number;
  subject: string;
}

export interface DualGeminiQuestionResponse {
  questions: ValidatedQuestionResult[];
  totalGenerated: number;
  validQuestions: number;
  questionsWithIssues: number;
}

export interface ValidatedQuestionResult {
  question: CreateQuestionDto;
  validationResult: QuestionValidationResponse;
  requiresManualReview: boolean;
  hasIssues?: boolean;
  issues?: ValidationIssue[];
}

export interface QuestionValidationRequest {
  questionContent: string;
  questionType: string;
  options: string[];
  gradeLevel: number;
  subject: string;
}

export interface QuestionValidationResponse {
  isValid: boolean;
  issues: ValidationIssue[];
  overallAssessment: string;
  bloomLevel?: string;
  bloomLevelJustification?: string;
}

export interface ValidationIssue {
  type: string; // 'level_mismatch', 'redundant_text'
  description: string;
  severity: string; // 'low', 'medium', 'high'
  suggestion: string;
}

export interface BatchValidateQuestionsRequest {
  questions: CreateQuestionDto[];
  gradeLevel: number;
  subjectId: string;
}