import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QuestionSetService } from '../../services/question-set.service';
import { SubjectService } from '../../services/subject.service';
import { 
  QuestionSet, 
  QuestionSetDetail, 
  Question, 
  Option,
  CreateQuestionDto,
  CreateOptionDto
} from '../../services/models/question-set.model';
import { Subject } from '../../services/models/subject.model';

@Component({
  selector: 'app-question-sets',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './question-sets.component.html',
  styleUrls: ['./question-sets.component.scss']
})
export class QuestionSetsComponent implements OnInit {
  // Question sets
  questionSets: QuestionSet[] = [];
  filteredQuestionSets: QuestionSet[] = [];
  searchText = '';
  
  // Forms
  questionSetForm: FormGroup;
  questionForm: FormGroup;
  
  // View states
  showQuestionSetForm = false;
  showQuestionForm = false;
  showAIQuestionForm = false;
  isEditingQuestionSet = false;
  isEditingQuestion = false;
  isGeneratingAIQuestions = false;
  currentQuestionSetId: string | null = null;
  currentQuestionId: string | null = null;
  activeQuestionSet: QuestionSetDetail | null = null;
  
  // AI Question Generator
  aiPrompt = '';
  aiQuestionCount = 3;
  aiQuestionType = 'single';
  aiGeneratedQuestions: Question[] = [];
  
  // Dual Gemini AI System
  showDualGeminiForm = false;
  isGeneratingDualGemini = false;
  dualGeminiPrompt = '';
  dualGeminiQuestionCount = 3;
  dualGeminiQuestionType = 'single';
  dualGeminiGradeLevel = 1;
  dualGeminiResults: any[] = [];
  showValidationResults = false;
  
  // Question Validation
  showQuestionValidation = false;
  validationQuestionContent = '';
  validationQuestionType = 'single';
  validationOptions: string[] = ['', ''];
  validationGradeLevel = 1;
  validationSubject = '';
  validationResult: any = null;
  isValidating = false;
  
  // Filter options
  subjects: Subject[] = [];
  subjectMap: Map<string, string> = new Map(); // Map of SubjectId -> SubjectName for quick lookup
  gradeLevels: number[] = [];
  questionTypes = [
    { value: 'single', label: 'Trắc nghiệm - Một đáp án' },
    { value: 'multiple', label: 'Trắc nghiệm - Nhiều đáp án' },
    { value: 'essay', label: 'Tự luận' }
  ];

  constructor(
    private fb: FormBuilder, 
    private sanitizer: DomSanitizer,
    private questionSetService: QuestionSetService,
    private subjectService: SubjectService
  ) {
    // Initialize question set form
    this.questionSetForm = this.fb.group({
      title: ['', [Validators.required]],
      subjectId: ['', [Validators.required]],
      gradeLevel: ['', [Validators.required]],
      description: ['']
    });

    // Initialize question form
    this.questionForm = this.fb.group({
      content: ['', [Validators.required]],
      type: ['single', [Validators.required]],
      options: this.fb.array([]),
      correctAnswers: this.fb.array([]),
      bloomLevel: ['']
    });
  }

  ngOnInit(): void {
    // Load data from API
    this.loadQuestionSets();
    this.loadSubjects();
    this.loadGradeLevels();
  }

  loadQuestionSets(): void {
    this.questionSetService.getQuestionSets().subscribe({
      next: (data) => {
        this.questionSets = data;
        this.filteredQuestionSets = [...this.questionSets];
      },
      error: (error) => {
        console.error('Error loading question sets:', error);
      }
    });
  }

  loadSubjects(): void {
    this.subjectService.getSubjects().subscribe({
      next: (data) => {
        // Make sure each subject has both id and _id for compatibility
        this.subjects = data.map(subject => {
          // If the backend sends 'id' but not '_id'
          if (subject.id && !subject._id) {
            return { ...subject, _id: subject.id };
          }
          // If the backend sends '_id' but not 'id'
          else if (subject._id && !subject.id) {
            return { ...subject, id: subject._id };
          }
          return subject;
        });
        
        // Create a map for quick lookup of subject names by ID
        this.subjects.forEach(subject => {
          const id = subject.id || subject._id;
          if (id) {
            this.subjectMap.set(id, subject.name);
          }
        });
      },
      error: (error) => {
        console.error('Error loading subjects:', error);
      }
    });
  }

  loadGradeLevels(): void {
    this.questionSetService.getGradeLevels().subscribe({
      next: (data) => {
        this.gradeLevels = data;
      },
      error: (error) => {
        console.error('Error loading grade levels:', error);
        // Fallback to default grades 1-12
        this.gradeLevels = Array.from({length: 12}, (_, i) => i + 1);
      }
    });
  }

  // Filter question sets based on search text
  filterQuestionSets(): void {
    if (!this.searchText.trim()) {
      this.filteredQuestionSets = [...this.questionSets];
      return;
    }
    
    const searchLower = this.searchText.toLowerCase();
    this.filteredQuestionSets = this.questionSets.filter(qs => 
      qs.title.toLowerCase().includes(searchLower) ||
      qs.subjectName.toLowerCase().includes(searchLower) ||
      qs.gradeLevel.toString().includes(searchLower) ||
      (qs.description && qs.description.toLowerCase().includes(searchLower))
    );
  }

  // QUESTION SET FORM METHODS
  toggleQuestionSetForm(): void {
    this.showQuestionSetForm = !this.showQuestionSetForm;
    if (!this.showQuestionSetForm) {
      this.resetQuestionSetForm();
    }
  }

  resetQuestionSetForm(): void {
    this.isEditingQuestionSet = false;
    this.currentQuestionSetId = null;
    this.questionSetForm.reset({
      title: '',
      subjectId: '',
      gradeLevel: '',
      description: ''
    });
  }

  editQuestionSet(questionSet: QuestionSet): void {
    this.isEditingQuestionSet = true;
    this.currentQuestionSetId = questionSet.id;
    
    this.questionSetForm.setValue({
      title: questionSet.title,
      subjectId: questionSet.subjectId,
      gradeLevel: questionSet.gradeLevel,
      description: questionSet.description || ''
    });
    
    this.showQuestionSetForm = true;
  }

  deleteQuestionSet(id: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa bộ câu hỏi này?')) {
      this.questionSetService.deleteQuestionSet(id).subscribe({
        next: () => {
          this.questionSets = this.questionSets.filter(qs => qs.id !== id);
          this.filterQuestionSets();
          
          // If viewing this question set, clear the view
          if (this.activeQuestionSet && this.activeQuestionSet.id === id) {
            this.activeQuestionSet = null;
          }
        },
        error: (error) => {
          console.error('Error deleting question set:', error);
        }
      });
    }
  }

  submitQuestionSetForm(): void {
    if (this.questionSetForm.valid) {
      const formValue = this.questionSetForm.value;
      
      // Log the form values for debugging
      console.log('Form values:', formValue);
      console.log('SubjectId type:', typeof formValue.subjectId);
      console.log('GradeLevel type:', typeof formValue.gradeLevel);
      
      if (this.isEditingQuestionSet && this.currentQuestionSetId) {
        // Update existing question set
        this.questionSetService.updateQuestionSet(this.currentQuestionSetId, formValue).subscribe({
          next: (updatedQuestionSet) => {
            // Update the list
            this.loadQuestionSets();
            
            // Update active question set if it's the one being edited
            if (this.activeQuestionSet && this.activeQuestionSet.id === this.currentQuestionSetId) {
              this.loadQuestionSetDetail(this.currentQuestionSetId);
            }
            
            this.resetQuestionSetForm();
            this.showQuestionSetForm = false;
          },
          error: (error) => {
            console.error('Error updating question set:', error);
          }
        });
      } else {
        // Add new question set
        this.questionSetService.createQuestionSet(formValue).subscribe({
          next: (newQuestionSet) => {
            this.loadQuestionSets();
            this.resetQuestionSetForm();
            this.showQuestionSetForm = false;
          },
          error: (error) => {
            console.error('Error creating question set:', error);
          }
        });
      }
    }
  }
  
  // QUESTION SET DETAIL METHODS
  viewQuestionSet(questionSet: QuestionSet): void {
    this.loadQuestionSetDetail(questionSet.id);
  }

  loadQuestionSetDetail(id: string): void {
    this.questionSetService.getQuestionSetById(id).subscribe({
      next: (detail) => {
        this.activeQuestionSet = detail;
      },
      error: (error) => {
        console.error('Error loading question set details:', error);
      }
    });
  }

  backToList(): void {
    this.activeQuestionSet = null;
  }

  // QUESTION FORM METHODS
  toggleQuestionForm(): void {
    this.showQuestionForm = !this.showQuestionForm;
    this.showAIQuestionForm = false;
    if (!this.showQuestionForm) {
      this.resetQuestionForm();
    } else {
      // Add initial options if it's a multiple choice question
      this.addOption();
      this.addOption();
    }
  }

  toggleAIQuestionForm(): void {
    this.showAIQuestionForm = !this.showAIQuestionForm;
    this.showQuestionForm = false;
    if (!this.showAIQuestionForm) {
      this.aiGeneratedQuestions = [];
    }
  }

  // When submitting a question form:
  submitQuestionForm(): void {
    if (!this.activeQuestionSet) return;
    
    if (this.questionForm.valid) {
      const formValue = this.questionForm.value;
      let questionDto: any = {
        content: formValue.content,
        type: formValue.type,
        bloomLevel: formValue.bloomLevel || ''
      };
      
      // For multiple choice questions
      if (formValue.type !== 'essay') {
        questionDto.options = formValue.options.map((content: string): CreateOptionDto => ({
          content
        }));
        questionDto.correctAnswers = formValue.correctAnswers;
      }
      
      if (this.isEditingQuestion && this.currentQuestionId) {
        // Update an existing question
        this.questionSetService.updateQuestion(this.activeQuestionSet.id, this.currentQuestionId, questionDto).subscribe({
          next: (updatedQuestionSet) => {
            this.activeQuestionSet = updatedQuestionSet;
            this.resetQuestionForm();
            this.showQuestionForm = false;
          },
          error: (error) => {
            console.error('Error updating question:', error);
          }
        });
      } else {
        // Add a new question
        this.questionSetService.addQuestion(this.activeQuestionSet.id, questionDto).subscribe({
          next: (updatedQuestionSet) => {
            this.activeQuestionSet = updatedQuestionSet;
            this.resetQuestionForm();
            this.showQuestionForm = false;
          },
          error: (error) => {
            console.error('Error adding question:', error);
          }
        });
      }
    }
  }

  // Form array getters - needed for the template
  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }
  
  get correctAnswers(): FormArray {
    return this.questionForm.get('correctAnswers') as FormArray;
  }
  
  // Add/remove options in form
  addOption(content: string = ''): void {
    this.options.push(this.fb.control(content, Validators.required));
  }
  
  removeOption(index: number): void {
    this.options.removeAt(index);
    
    // Remove this option from correct answers if selected
    const correctAnswersArray = this.correctAnswers.value as number[];
    const correctAnswerIndex = correctAnswersArray.indexOf(index);
    
    if (correctAnswerIndex > -1) {
      this.correctAnswers.removeAt(correctAnswerIndex);
    }
    
    // Update indexes of correct answers
    for (let i = 0; i < correctAnswersArray.length; i++) {
      if (correctAnswersArray[i] > index) {
        this.correctAnswers.at(i).setValue(correctAnswersArray[i] - 1);
      }
    }
  }
  
  // Add/toggle correct answers in form
  addCorrectAnswer(index: number): void {
    this.correctAnswers.push(this.fb.control(index));
  }
  
  toggleCorrectAnswer(index: number): void {
    const correctAnswersArray = this.correctAnswers.value as number[];
    const correctAnswerIndex = correctAnswersArray.indexOf(index);
    
    if (correctAnswerIndex > -1) {
      // If already selected, remove it
      this.correctAnswers.removeAt(correctAnswerIndex);
    } else {
      // If single choice, clear existing selections
      if (this.questionForm.get('type')?.value === 'single') {
        this.correctAnswers.clear();
      }
      // Add the new selection
      this.addCorrectAnswer(index);
    }
  }
  
  // Check if an option is selected as a correct answer
  isCorrectAnswer(index: number): boolean {
    return (this.correctAnswers.value as number[]).includes(index);
  }

  // Get letter label for options (A, B, C, etc.)
  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  // Convert HTML to SafeHtml for displaying
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
  
  // Handle question type changes
  onQuestionTypeChange(): void {
    const questionType = this.questionForm.get('type')?.value;
    
    // Clear correct answers when switching question types
    this.correctAnswers.clear();
    
    if (questionType === 'essay') {
      // For essay questions, clear all options
      this.options.clear();
    } else if (this.options.length < 2) {
      // For multiple choice, ensure at least 2 options
      this.options.clear();
      this.addOption();
      this.addOption();
    }
  }
  
  // Reset question form
  resetQuestionForm(): void {
    this.isEditingQuestion = false;
    this.currentQuestionId = null;
    this.questionForm.reset({
      content: '',
      type: 'single',
      bloomLevel: ''
    });
    
    this.options.clear();
    this.correctAnswers.clear();
    
    // Add initial options for multiple choice
    this.addOption();
    this.addOption();
  }

  // Edit a question
  editQuestion(question: Question): void {
    this.isEditingQuestion = true;
    this.currentQuestionId = question.id;
    
    // Reset and populate the form
    this.questionForm.reset({
      content: question.content,
      type: question.type,
      bloomLevel: question.bloomLevel || ''
    });
    
    // Clear existing options and add the question's options
    this.options.clear();
    this.correctAnswers.clear();
    
    if (question.type !== 'essay' && question.options) {
      question.options.forEach(option => {
        this.addOption(option.content);
      });
      
      if (question.correctAnswers) {
        question.correctAnswers.forEach(index => {
          this.addCorrectAnswer(index);
        });
      }
    }
    
    this.showQuestionForm = true;
  }

  // Delete a question
  deleteQuestion(id: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      if (!this.activeQuestionSet) {
        console.error('No active question set');
        return;
      }
      
      this.questionSetService.deleteQuestion(this.activeQuestionSet.id, id).subscribe({
        next: (updatedQuestionSet) => {
          this.activeQuestionSet = updatedQuestionSet;
          console.log('Question deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting question:', error);
        }
      });
    }
  }

  // Format insertion for content editing
  insertFormat(tag: string): void {
    // Implementation for inserting formatting in the content textarea
    console.log(`Inserting ${tag} format`);
  }

  // Insert image in content
  insertImage(): void {
    // Implementation for inserting images in the content
    console.log('Inserting image');
  }

  // Insert formatting in options
  insertOptionFormat(index: number, tag: string): void {
    // Implementation for inserting formatting in option textareas
    console.log(`Inserting ${tag} format in option ${index}`);
  }

  // Insert image in option
  insertOptionImage(index: number): void {
    // Implementation for inserting images in options
    console.log(`Inserting image in option ${index}`);
  }

  // Handle image uploads
  handleImageUpload(event: Event, targetField: string): void {
    // Implementation for handling image uploads
    console.log(`Handling image upload for ${targetField}`);
  }

  // Handle option image uploads
  handleOptionImageUpload(event: Event): void {
    // Implementation for handling option image uploads
    console.log('Handling option image upload');
  }

  // Submit AI Question Form
  submitAIQuestionForm(): void {
    if (!this.activeQuestionSet || !this.aiPrompt.trim()) return;
    
    this.isGeneratingAIQuestions = true;
    
    const request = {
      prompt: this.aiPrompt.trim(),
      questionSetId: this.activeQuestionSet.id,
      type: this.aiQuestionType,
      count: this.aiQuestionCount
    };
    
    this.questionSetService.generateAIQuestions(request).subscribe({
      next: (response) => {
        // Convert the API response to our local Question format
        this.aiGeneratedQuestions = response.questions.map(q => ({
          id: 'temp-' + Math.random().toString(36).substr(2, 9),
          content: q.content,
          type: q.type,
          options: q.options?.map((opt, idx) => ({
            id: idx,
            content: opt.content
          })),
          correctAnswers: q.correctAnswers,
          bloomLevel: q.bloomLevel || ''
        }));
        this.isGeneratingAIQuestions = false;
      },
      error: (error) => {
        console.error('Error generating AI questions:', error);
        this.isGeneratingAIQuestions = false;
        alert('Có lỗi khi tạo câu hỏi. Vui lòng thử lại sau.');
      }
    });
  }
  
  // Save AI Generated Questions
  saveAIGeneratedQuestions(): void {
    if (!this.activeQuestionSet || this.aiGeneratedQuestions.length === 0) return;
    
    // For each generated question, add it to the question set
    const addQuestions = () => {
      const question = this.aiGeneratedQuestions.shift();
      if (!question) {
        // No more questions to add, refresh the question set
        this.loadQuestionSetDetail(this.activeQuestionSet!.id);
        this.aiGeneratedQuestions = [];
        return;
      }
      
      const questionDto = {
        content: question.content,
        type: question.type,
        options: question.options,
        correctAnswers: question.correctAnswers,
        bloomLevel: question.bloomLevel || ''
      };
      
      this.questionSetService.addQuestion(this.activeQuestionSet!.id, questionDto).subscribe({
        next: () => {
          // Continue with the next question
          addQuestions();
        },
        error: (error) => {
          console.error('Error adding AI generated question:', error);
          // Continue with the next question anyway
          addQuestions();
        }
      });
    };
    
    // Start adding questions
    addQuestions();
  }

  // DUAL GEMINI METHODS
  toggleDualGeminiForm(): void {
    this.showDualGeminiForm = !this.showDualGeminiForm;
    if (!this.showDualGeminiForm) {
      this.resetDualGeminiForm();
    }
  }

  resetDualGeminiForm(): void {
    this.dualGeminiPrompt = '';
    this.dualGeminiQuestionCount = 3;
    this.dualGeminiQuestionType = 'single';
    this.dualGeminiGradeLevel = this.activeQuestionSet?.gradeLevel || 1;
    this.dualGeminiResults = [];
    this.showValidationResults = false;
  }

  submitDualGeminiForm() {
    if (!this.activeQuestionSet || !this.dualGeminiPrompt.trim()) {
      return;
    }
    
    this.isGeneratingDualGemini = true;
    this.showValidationResults = false;
    
    const subject = this.subjectMap.get(this.activeQuestionSet.subjectId) || 'Không xác định';
    
    const request = {
      prompt: this.dualGeminiPrompt.trim(),
      questionSetId: this.activeQuestionSet.id,
      type: this.dualGeminiQuestionType,
      count: this.dualGeminiQuestionCount,
      gradeLevel: this.dualGeminiGradeLevel,
      subject: subject
    };
    
    this.questionSetService.generateDualGeminiQuestions(request).subscribe({
      next: (response) => {
        // Process the results to extract validation information
        this.dualGeminiResults = response.questions.map(result => ({
          ...result,
          hasIssues: !result.validationResult.isValid || result.validationResult.issues.length > 0,
          issues: result.validationResult.issues
        }));
        this.showValidationResults = true;
        this.isGeneratingDualGemini = false;
      },
      error: (error) => {
         console.error('Error generating dual gemini questions:', error);
         this.isGeneratingDualGemini = false;
         alert('Có lỗi khi tạo và kiểm tra câu hỏi. Vui lòng thử lại sau.');
       }
    });
  }

  getValidationSeverityClass(severity: string): string {
    switch (severity) {
      case 'high': return 'text-danger';
      case 'medium': return 'text-warning';
      case 'low': return 'text-info';
      default: return 'text-secondary';
    }
  }

  getValidationTypeLabel(type: string): string {
    switch (type) {
      case 'level_mismatch': return 'Không phù hợp cấp độ';
      case 'redundant_text': return 'Văn bản dư thừa';
      case 'validation_error': return 'Lỗi kiểm tra';
      default: return type;
    }
  }

  addValidatedQuestionToSet(result: any): void {
    if (!this.activeQuestionSet) return;
    
    const question = {
      content: result.question.content,
      type: result.question.type,
      options: result.question.options,
      correctAnswers: result.question.correctAnswers,
      bloomLevel: result.validationResult.bloomLevel || result.question.bloomLevel || ''
    };
    
    this.questionSetService.addQuestion(this.activeQuestionSet.id, question).subscribe({
      next: () => {
        this.loadQuestionSetDetail(this.activeQuestionSet!.id);
        // Remove the added question from results
        this.dualGeminiResults = this.dualGeminiResults.filter(r => r !== result);
      },
      error: (error) => {
        console.error('Error adding validated question:', error);
        alert('Có lỗi khi thêm câu hỏi. Vui lòng thử lại.');
      }
    });
  }

  // QUESTION VALIDATION METHODS
  toggleQuestionValidation(): void {
    this.showQuestionValidation = !this.showQuestionValidation;
    if (!this.showQuestionValidation) {
      this.resetQuestionValidation();
    }
  }

  resetQuestionValidation(): void {
    this.validationQuestionContent = '';
    this.validationQuestionType = 'single';
    this.validationOptions = ['', ''];
    this.validationGradeLevel = this.activeQuestionSet?.gradeLevel || 1;
    this.validationSubject = this.subjectMap.get(this.activeQuestionSet?.subjectId || '') || '';
    this.validationResult = null;
  }

  addValidationOption(): void {
    this.validationOptions.push('');
  }

  removeValidationOption(index: number): void {
    if (this.validationOptions.length > 2) {
      this.validationOptions.splice(index, 1);
    }
  }

  onValidationTypeChange(): void {
    if (this.validationQuestionType === 'essay') {
      this.validationOptions = [];
    } else if (this.validationOptions.length < 2) {
      this.validationOptions = ['', ''];
    }
  }

  submitQuestionValidation(): void {
    if (!this.validationQuestionContent.trim()) return;
    
    this.isValidating = true;
    
    const request = {
      questionContent: this.validationQuestionContent.trim(),
      questionType: this.validationQuestionType,
      options: this.validationQuestionType === 'essay' ? [] : this.validationOptions.filter(opt => opt.trim()),
      gradeLevel: this.validationGradeLevel,
      subject: this.validationSubject
    };
    
    this.questionSetService.validateQuestion(request).subscribe({
      next: (response) => {
        this.validationResult = response;
        this.isValidating = false;
        console.log('Validation Result:', response);
      },
      error: (error) => {
        console.error('Error validating question:', error);
        this.isValidating = false;
        alert('Có lỗi khi kiểm tra câu hỏi. Vui lòng thử lại sau.');
      }
    });
  }
}