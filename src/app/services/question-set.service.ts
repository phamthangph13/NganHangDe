import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  QuestionSet, 
  QuestionSetDetail, 
  CreateQuestionSetDto, 
  UpdateQuestionSetDto,
  CreateQuestionDto,
  GenerateAIQuestionsRequest,
  GenerateAIQuestionsResponse,
  DualGeminiQuestionRequest,
  DualGeminiQuestionResponse,
  QuestionValidationRequest,
  QuestionValidationResponse,
  BatchValidateQuestionsRequest,
  ValidatedQuestionResult
} from './models/question-set.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QuestionSetService {
  private apiUrl = `${environment.apiUrl}/dashboard/question-sets`;

  constructor(private http: HttpClient) { }

  getQuestionSets(): Observable<QuestionSet[]> {
    return this.http.get<QuestionSet[]>(this.apiUrl);
  }

  getQuestionSetById(id: string): Observable<QuestionSetDetail> {
    return this.http.get<QuestionSetDetail>(`${this.apiUrl}/${id}`);
  }

  createQuestionSet(questionSet: CreateQuestionSetDto): Observable<QuestionSet> {
    return this.http.post<QuestionSet>(this.apiUrl, questionSet);
  }

  updateQuestionSet(id: string, questionSet: UpdateQuestionSetDto): Observable<QuestionSetDetail> {
    return this.http.put<QuestionSetDetail>(`${this.apiUrl}/${id}`, questionSet);
  }

  deleteQuestionSet(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  addQuestion(questionSetId: string, question: CreateQuestionDto): Observable<QuestionSetDetail> {
    return this.http.post<QuestionSetDetail>(`${this.apiUrl}/${questionSetId}/questions`, question);
  }

  updateQuestion(questionSetId: string, questionId: string, question: any): Observable<QuestionSetDetail> {
    return this.http.put<QuestionSetDetail>(`${this.apiUrl}/${questionSetId}/questions/${questionId}`, question);
  }

  deleteQuestion(questionSetId: string, questionId: string): Observable<QuestionSetDetail> {
    return this.http.delete<QuestionSetDetail>(`${this.apiUrl}/${questionSetId}/questions/${questionId}`);
  }

  getGradeLevels(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/grade-levels`);
  }
  
  generateAIQuestions(request: GenerateAIQuestionsRequest): Observable<GenerateAIQuestionsResponse> {
    return this.http.post<GenerateAIQuestionsResponse>(`${this.apiUrl}/generate-ai-questions`, request);
  }

  // Dual Gemini Methods
  generateDualGeminiQuestions(request: DualGeminiQuestionRequest): Observable<DualGeminiQuestionResponse> {
    return this.http.post<DualGeminiQuestionResponse>(`${this.apiUrl}/generate-dual-gemini-questions`, request);
  }

  validateQuestion(request: QuestionValidationRequest): Observable<QuestionValidationResponse> {
    return this.http.post<QuestionValidationResponse>(`${this.apiUrl}/validate-question`, request);
  }

  batchValidateQuestions(request: BatchValidateQuestionsRequest): Observable<ValidatedQuestionResult[]> {
    return this.http.post<ValidatedQuestionResult[]>(`${this.apiUrl}/batch-validate-questions`, request);
  }
}