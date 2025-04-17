import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Define interfaces for our data model
interface Question {
  id: number;
  content: string;
  type: 'single' | 'multiple' | 'essay';
  options?: Option[];
  correctAnswers?: number[];
}

interface Option {
  id: number;
  content: string;
}

interface QuestionSet {
  id: number;
  title: string;
  subject: string;
  grade: string;
  description: string;
  questions: Question[];
  createdAt: Date;
}

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
  currentQuestionSetId: number | null = null;
  currentQuestionId: number | null = null;
  activeQuestionSet: QuestionSet | null = null;
  
  // AI Question Generator
  aiPrompt = '';
  aiQuestionCount = 3;
  aiQuestionType = 'single';
  aiGeneratedQuestions: Question[] = [];
  
  // Filter options
  subjects = ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'GDCD'];
  grades = ['10', '11', '12'];
  questionTypes = [
    { value: 'single', label: 'Trắc nghiệm - Một đáp án' },
    { value: 'multiple', label: 'Trắc nghiệm - Nhiều đáp án' },
    { value: 'essay', label: 'Tự luận' }
  ];

  // Sample data for development
  demoQuestionSets: QuestionSet[] = [
    {
      id: 1,
      title: 'Bộ câu hỏi Toán đại số lớp 10',
      subject: 'Toán',
      grade: '10',
      description: 'Các câu hỏi về phương trình bậc 1, bậc 2, và hệ phương trình',
      questions: [
        {
          id: 1,
          content: 'Phương trình x² - 5x + 6 = 0 có nghiệm là?',
          type: 'single',
          options: [
            { id: 1, content: 'x = 2 và x = 3' },
            { id: 2, content: 'x = -2 và x = -3' },
            { id: 3, content: 'x = 2 và x = -3' },
            { id: 4, content: 'x = -2 và x = 3' }
          ],
          correctAnswers: [0]
        },
        {
          id: 2,
          content: 'Giải hệ phương trình: 2x + y = 5, x - y = 1',
          type: 'essay'
        }
      ],
      createdAt: new Date('2023-09-15')
    },
    {
      id: 2,
      title: 'Bộ câu hỏi Ngữ văn lớp 11',
      subject: 'Văn',
      grade: '11',
      description: 'Các câu hỏi về tác phẩm văn học Việt Nam',
      questions: [
        {
          id: 1,
          content: 'Tác giả của tác phẩm "Truyện Kiều" là ai?',
          type: 'single',
          options: [
            { id: 1, content: 'Nguyễn Du' },
            { id: 2, content: 'Nguyễn Trãi' },
            { id: 3, content: 'Hồ Xuân Hương' },
            { id: 4, content: 'Nguyễn Đình Chiểu' }
          ],
          correctAnswers: [0]
        }
      ],
      createdAt: new Date('2023-10-05')
    }
  ];

  constructor(private fb: FormBuilder, private sanitizer: DomSanitizer) {
    // Initialize question set form
    this.questionSetForm = this.fb.group({
      title: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      grade: ['', [Validators.required]],
      description: ['']
    });

    // Initialize question form
    this.questionForm = this.fb.group({
      content: ['', [Validators.required]],
      type: ['single', [Validators.required]],
      options: this.fb.array([]),
      correctAnswers: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Load sample data
    this.questionSets = [...this.demoQuestionSets];
    this.filteredQuestionSets = [...this.questionSets];
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
      qs.subject.toLowerCase().includes(searchLower) ||
      qs.grade.toLowerCase().includes(searchLower) ||
      qs.description.toLowerCase().includes(searchLower)
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
      subject: '',
      grade: '',
      description: ''
    });
  }

  editQuestionSet(questionSet: QuestionSet): void {
    this.isEditingQuestionSet = true;
    this.currentQuestionSetId = questionSet.id;
    
    this.questionSetForm.setValue({
      title: questionSet.title,
      subject: questionSet.subject,
      grade: questionSet.grade,
      description: questionSet.description || ''
    });
    
    this.showQuestionSetForm = true;
  }

  deleteQuestionSet(id: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa bộ câu hỏi này?')) {
      this.questionSets = this.questionSets.filter(qs => qs.id !== id);
      this.filterQuestionSets();
      
      // If viewing this question set, clear the view
      if (this.activeQuestionSet && this.activeQuestionSet.id === id) {
        this.activeQuestionSet = null;
      }
    }
  }

  submitQuestionSetForm(): void {
    if (this.questionSetForm.valid) {
      const formValue = this.questionSetForm.value;
      
      if (this.isEditingQuestionSet && this.currentQuestionSetId) {
        // Update existing question set
        this.questionSets = this.questionSets.map(qs => {
          if (qs.id === this.currentQuestionSetId) {
            return {
              ...qs,
              title: formValue.title,
              subject: formValue.subject,
              grade: formValue.grade,
              description: formValue.description
            };
          }
          return qs;
        });
        
        // Update active question set if it's the one being edited
        if (this.activeQuestionSet && this.activeQuestionSet.id === this.currentQuestionSetId) {
          this.activeQuestionSet = {
            ...this.activeQuestionSet,
            title: formValue.title,
            subject: formValue.subject,
            grade: formValue.grade,
            description: formValue.description
          };
        }
      } else {
        // Add new question set
        const newQuestionSet: QuestionSet = {
          id: Math.max(0, ...this.questionSets.map(qs => qs.id)) + 1,
          title: formValue.title,
          subject: formValue.subject,
          grade: formValue.grade,
          description: formValue.description,
          questions: [],
          createdAt: new Date()
        };
        
        this.questionSets.push(newQuestionSet);
      }
      
      this.filterQuestionSets();
      this.resetQuestionSetForm();
      this.showQuestionSetForm = false;
    }
  }
  
  // QUESTION FORM METHODS
  viewQuestionSet(questionSet: QuestionSet): void {
    this.activeQuestionSet = questionSet;
  }
  
  backToList(): void {
    this.activeQuestionSet = null;
  }
  
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
      this.resetAIQuestionForm();
    }
  }
  
  resetAIQuestionForm(): void {
    this.aiPrompt = '';
    this.aiQuestionCount = 3;
    this.aiQuestionType = 'single';
    this.aiGeneratedQuestions = [];
    this.isGeneratingAIQuestions = false;
  }
  
  generateAIQuestions(): void {
    if (!this.aiPrompt.trim()) {
      alert('Vui lòng nhập yêu cầu cho AI');
      return;
    }
    
    this.isGeneratingAIQuestions = true;
    
    // Simulate AI generation with a timeout
    setTimeout(() => {
      // Demo generated questions
      this.aiGeneratedQuestions = this.generateMockAIQuestions(
        this.aiPrompt, 
        this.aiQuestionCount, 
        this.aiQuestionType as 'single' | 'multiple' | 'essay'
      );
      this.isGeneratingAIQuestions = false;
    }, 1500);
  }
  
  addAIQuestion(question: Question): void {
    if (!this.activeQuestionSet) return;
    
    // Add new question with a new ID
    const newQuestion: Question = {
      ...question,
      id: Math.max(0, ...this.activeQuestionSet.questions.map(q => q.id), 0) + 1
    };
    
    this.activeQuestionSet = {
      ...this.activeQuestionSet,
      questions: [...this.activeQuestionSet.questions, newQuestion]
    };
    
    // Update the question sets array
    this.questionSets = this.questionSets.map(qs => {
      if (qs.id === this.activeQuestionSet?.id) {
        return this.activeQuestionSet;
      }
      return qs;
    });
  }
  
  addAllAIQuestions(): void {
    if (!this.activeQuestionSet) return;
    
    // Get the highest existing question ID
    const maxId = Math.max(0, ...this.activeQuestionSet.questions.map(q => q.id), 0);
    
    // Add all generated questions with new IDs
    const newQuestions = this.aiGeneratedQuestions.map((q, index) => ({
      ...q,
      id: maxId + index + 1
    }));
    
    this.activeQuestionSet = {
      ...this.activeQuestionSet,
      questions: [...this.activeQuestionSet.questions, ...newQuestions]
    };
    
    // Update the question sets array
    this.questionSets = this.questionSets.map(qs => {
      if (qs.id === this.activeQuestionSet?.id) {
        return this.activeQuestionSet;
      }
      return qs;
    });
    
    // Reset the AI form
    this.resetAIQuestionForm();
  }
  
  // Mock function to generate AI questions for demo purposes
  generateMockAIQuestions(prompt: string, count: number, type: 'single' | 'multiple' | 'essay'): Question[] {
    const questions: Question[] = [];
    
    // Generate sample questions based on type
    for (let i = 0; i < count; i++) {
      if (type === 'essay') {
        questions.push({
          id: i + 1,
          content: `Câu hỏi tự luận #${i+1} về ${prompt}?`,
          type: 'essay'
        });
      } else if (type === 'single') {
        questions.push({
          id: i + 1,
          content: `Câu hỏi trắc nghiệm #${i+1} về ${prompt}?`,
          type: 'single',
          options: [
            { id: 1, content: `Đáp án A cho câu hỏi ${i+1}` },
            { id: 2, content: `Đáp án B cho câu hỏi ${i+1}` },
            { id: 3, content: `Đáp án C cho câu hỏi ${i+1}` },
            { id: 4, content: `Đáp án D cho câu hỏi ${i+1}` }
          ],
          correctAnswers: [Math.floor(Math.random() * 4)]
        });
      } else {
        questions.push({
          id: i + 1,
          content: `Câu hỏi nhiều đáp án #${i+1} về ${prompt}?`,
          type: 'multiple',
          options: [
            { id: 1, content: `Đáp án A cho câu hỏi ${i+1}` },
            { id: 2, content: `Đáp án B cho câu hỏi ${i+1}` },
            { id: 3, content: `Đáp án C cho câu hỏi ${i+1}` },
            { id: 4, content: `Đáp án D cho câu hỏi ${i+1}` }
          ],
          correctAnswers: Array.from({ length: 2 }, () => Math.floor(Math.random() * 4))
            .filter((value, index, self) => self.indexOf(value) === index) // Ensure unique values
        });
      }
    }
    
    return questions;
  }
  
  resetQuestionForm(): void {
    this.isEditingQuestion = false;
    this.currentQuestionId = null;
    
    this.questionForm.reset({
      content: '',
      type: 'single'
    });
    
    // Clear options and correct answers
    this.options.clear();
    this.correctAnswers.clear();
  }
  
  editQuestion(question: Question): void {
    this.isEditingQuestion = true;
    this.currentQuestionId = question.id;
    
    // Reset form first
    this.resetQuestionForm();
    
    // Set basic values
    this.questionForm.patchValue({
      content: question.content,
      type: question.type
    });
    
    // Add options if it's a multiple choice question
    if (question.type !== 'essay' && question.options) {
      question.options.forEach(option => {
        this.addOption(option.content);
      });
    }
    
    // Set correct answers
    if (question.correctAnswers) {
      question.correctAnswers.forEach(index => {
        this.addCorrectAnswer(index);
      });
    }
    
    this.showQuestionForm = true;
  }
  
  deleteQuestion(id: number): void {
    if (!this.activeQuestionSet) return;
    
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      // Update the active question set
      this.activeQuestionSet = {
        ...this.activeQuestionSet,
        questions: this.activeQuestionSet.questions.filter(q => q.id !== id)
      };
      
      // Update the question sets array
      this.questionSets = this.questionSets.map(qs => {
        if (qs.id === this.activeQuestionSet?.id) {
          return this.activeQuestionSet;
        }
        return qs;
      });
    }
  }
  
  // Form array getters
  get options(): FormArray {
    return this.questionForm.get('options') as FormArray;
  }
  
  get correctAnswers(): FormArray {
    return this.questionForm.get('correctAnswers') as FormArray;
  }
  
  // Add option to the form
  addOption(content: string = ''): void {
    this.options.push(this.fb.control(content, Validators.required));
  }
  
  // Remove option from the form
  removeOption(index: number): void {
    this.options.removeAt(index);
    
    // Also remove from correct answers if it was selected
    const correctAnswersArray = this.correctAnswers.value;
    const answerIndex = correctAnswersArray.indexOf(index);
    if (answerIndex > -1) {
      this.correctAnswers.removeAt(answerIndex);
    }
    
    // Update indices in correct answers
    for (let i = 0; i < this.correctAnswers.length; i++) {
      if (this.correctAnswers.at(i).value > index) {
        this.correctAnswers.at(i).setValue(this.correctAnswers.at(i).value - 1);
      }
    }
  }
  
  // Add correct answer
  addCorrectAnswer(index: number): void {
    this.correctAnswers.push(this.fb.control(index));
  }
  
  // Toggle correct answer selection
  toggleCorrectAnswer(index: number): void {
    const correctAnswersArray = this.correctAnswers.value;
    const existingIndex = correctAnswersArray.indexOf(index);
    
    if (existingIndex > -1) {
      // Remove if already selected
      this.correctAnswers.removeAt(existingIndex);
    } else {
      // Add if not selected
      if (this.questionForm.value.type === 'single') {
        // For single choice, clear previous selections
        this.correctAnswers.clear();
      }
      this.addCorrectAnswer(index);
    }
  }
  
  // Check if an option is selected as a correct answer
  isCorrectAnswer(index: number): boolean {
    return this.correctAnswers.value.includes(index);
  }
  
  // Handle question type change
  onQuestionTypeChange(): void {
    const type = this.questionForm.value.type;
    
    if (type === 'essay') {
      // Clear options and correct answers for essay questions
      this.options.clear();
      this.correctAnswers.clear();
    } else if (this.options.length === 0) {
      // Add initial options for multiple choice questions
      this.addOption();
      this.addOption();
    }
    
    // For single choice, ensure only one correct answer
    if (type === 'single' && this.correctAnswers.length > 1) {
      // Keep only the first correct answer
      const firstValue = this.correctAnswers.at(0).value;
      this.correctAnswers.clear();
      this.addCorrectAnswer(firstValue);
    }
  }
  
  // Submit question form
  submitQuestionForm(): void {
    if (!this.activeQuestionSet) return;
    
    if (this.questionForm.valid) {
      const formValue = this.questionForm.value;
      let question: Question;
      
      // Prepare question data
      if (formValue.type === 'essay') {
        // Essay question
        question = {
          id: this.isEditingQuestion && this.currentQuestionId ? this.currentQuestionId : Math.max(0, ...this.activeQuestionSet.questions.map(q => q.id), 0) + 1,
          content: formValue.content,
          type: 'essay'
        };
      } else {
        // Multiple choice question
        const options: Option[] = formValue.options.map((content: string, index: number) => ({
          id: index + 1,
          content
        }));
        
        question = {
          id: this.isEditingQuestion && this.currentQuestionId ? this.currentQuestionId : Math.max(0, ...this.activeQuestionSet.questions.map(q => q.id), 0) + 1,
          content: formValue.content,
          type: formValue.type,
          options,
          correctAnswers: formValue.correctAnswers
        };
      }
      
      if (this.isEditingQuestion && this.currentQuestionId) {
        // Update existing question
        this.activeQuestionSet = {
          ...this.activeQuestionSet,
          questions: this.activeQuestionSet.questions.map(q => 
            q.id === this.currentQuestionId ? question : q
          )
        };
      } else {
        // Add new question
        this.activeQuestionSet = {
          ...this.activeQuestionSet,
          questions: [...this.activeQuestionSet.questions, question]
        };
      }
      
      // Update the question sets array
      this.questionSets = this.questionSets.map(qs => {
        if (qs.id === this.activeQuestionSet?.id) {
          return this.activeQuestionSet;
        }
        return qs;
      });
      
      this.resetQuestionForm();
      this.showQuestionForm = false;
    }
  }
  
  // Get question type display name
  getQuestionTypeName(type: string): string {
    const typeObj = this.questionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : '';
  }
  
  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index) + '.';
  }

  // Method to sanitize HTML content
  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }
  
  // Text formatting methods
  insertFormat(tag: string): void {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText = '';
    
    switch(tag) {
      case 'b':
        formattedText = `<b>${selectedText}</b>`;
        break;
      case 'i':
        formattedText = `<i>${selectedText}</i>`;
        break;
      case 'u':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'h3':
        formattedText = `<h3>${selectedText}</h3>`;
        break;
      case 'ul':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          formattedText = '<ul>\n' + lines.map(line => `  <li>${line}</li>`).join('\n') + '\n</ul>';
        } else {
          formattedText = `<ul>\n  <li>${selectedText}</li>\n</ul>`;
        }
        break;
      default:
        formattedText = selectedText;
    }
    
    const newValue = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    this.questionForm.get('content')?.setValue(newValue);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  }
  
  insertImage(): void {
    const url = prompt('Nhập URL của hình ảnh:');
    if (!url) return;
    
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const imageTag = `<img src="${url}" alt="Hình ảnh" style="max-width: 100%; height: auto;">`;
    const start = textarea.selectionStart;
    
    const newValue = textarea.value.substring(0, start) + imageTag + textarea.value.substring(start);
    this.questionForm.get('content')?.setValue(newValue);
    
    // Reset focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + imageTag.length, start + imageTag.length);
    }, 0);
  }

  insertOptionFormat(index: number, tag: string): void {
    const textarea = document.getElementById('option-' + index) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText = '';
    
    switch(tag) {
      case 'b':
        formattedText = `<b>${selectedText}</b>`;
        break;
      case 'i':
        formattedText = `<i>${selectedText}</i>`;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newValue = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    this.options.at(index).setValue(newValue);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  }
  
  insertOptionImage(index: number): void {
    const url = prompt('Nhập URL của hình ảnh:');
    if (!url) return;
    
    const textarea = document.getElementById('option-' + index) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const imageTag = `<img src="${url}" alt="Hình ảnh" style="max-width: 100%; height: auto;">`;
    const start = textarea.selectionStart;
    
    const newValue = textarea.value.substring(0, start) + imageTag + textarea.value.substring(start);
    this.options.at(index).setValue(newValue);
    
    // Reset focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + imageTag.length, start + imageTag.length);
    }, 0);
  }

  // Image handling methods
  private currentOptionIndex: number = -1;

  triggerImageUpload(inputId: string): void {
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  
  triggerOptionImageUpload(index: number): void {
    this.currentOptionIndex = index;
    this.triggerImageUpload('optionImageUpload');
  }
  
  handleImageUpload(event: Event, targetField: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn tệp hình ảnh.');
        input.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.');
        input.value = '';
        return;
      }
      
      // Create loading indicator
      const loadingText = '⌛ Đang tải ảnh...';
      const textarea = document.getElementById(targetField === 'content' ? 'content' : 'option-' + this.currentOptionIndex) as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const newValue = textarea.value.substring(0, start) + loadingText + textarea.value.substring(start);
        if (targetField === 'content') {
          this.questionForm.get('content')?.setValue(newValue);
        } else {
          this.options.at(this.currentOptionIndex).setValue(newValue);
        }
        
        textarea.focus();
        textarea.setSelectionRange(start, start + loadingText.length);
      }
      
      const reader = new FileReader();
      
      reader.onload = () => {
        const imgTag = `<img src="${reader.result}" alt="Hình ảnh" style="max-width: 100%; height: auto;">`;
        
        if (targetField === 'content') {
          const textarea = document.getElementById('content') as HTMLTextAreaElement;
          if (textarea) {
            const currentValue = textarea.value;
            const newValue = currentValue.replace(loadingText, imgTag);
            this.questionForm.get('content')?.setValue(newValue);
          }
        } else {
          const textarea = document.getElementById('option-' + this.currentOptionIndex) as HTMLTextAreaElement;
          if (textarea) {
            const currentValue = textarea.value;
            const newValue = currentValue.replace(loadingText, imgTag);
            this.options.at(this.currentOptionIndex).setValue(newValue);
          }
        }
      };
      
      reader.readAsDataURL(file);
      // Reset input so the same file can be selected again
      input.value = '';
    }
  }
  
  handleOptionImageUpload(event: Event): void {
    if (this.currentOptionIndex === -1) return;
    this.handleImageUpload(event, 'option');
  }
} 