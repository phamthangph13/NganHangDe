using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;

namespace BackEnd.Services
{
    public class DualGeminiQuestionService
    {
        private readonly GeminiService _geminiService;
        private readonly QuestionValidationService _validationService;
        private readonly QuestionSetService _questionSetService;
        private readonly SubjectService _subjectService;

        public DualGeminiQuestionService(
            GeminiService geminiService,
            QuestionValidationService validationService,
            QuestionSetService questionSetService,
            SubjectService subjectService)
        {
            _geminiService = geminiService;
            _validationService = validationService;
            _questionSetService = questionSetService;
            _subjectService = subjectService;
        }

        public async Task<DualGeminiQuestionResponse> GenerateAndValidateQuestionsAsync(DualGeminiQuestionRequest request)
        {
            try
            {
                // Step 1: Validate question set exists
                var questionSet = await _questionSetService.GetByIdAsync(request.QuestionSetId);
                if (questionSet == null)
                {
                    throw new ArgumentException("Question set not found");
                }

                // Step 2: Get subject name for validation
                var subject = await _subjectService.GetByIdAsync(questionSet.SubjectId);
                var subjectName = subject?.Name ?? request.Subject;

                // Step 3: Generate questions using first Gemini AI
                Console.WriteLine($"[DualGemini] Generating {request.Count} questions...");
                var generatedQuestions = await _geminiService.GenerateQuestionsAsync(
                    request.Prompt,
                    request.Type,
                    request.Count
                );

                Console.WriteLine($"[DualGemini] Generated {generatedQuestions.Count} questions, starting validation...");

                // Step 4: Validate each question using second Gemini AI
                var validatedResults = new List<ValidatedQuestionResult>();
                int validCount = 0;
                int issuesCount = 0;

                foreach (var question in generatedQuestions)
                {
                    try
                    {
                        // Prepare validation request
                        var validationRequest = new QuestionValidationRequest
                        {
                            QuestionContent = question.Content,
                            QuestionType = question.Type,
                            Options = question.Options?.Select(o => o.Content).ToList() ?? new List<string>(),
                            GradeLevel = request.GradeLevel,
                            Subject = subjectName
                        };

                        // Validate with second Gemini AI
                        var validationResult = await _validationService.ValidateQuestionAsync(validationRequest);

                        // Determine if manual review is required
                        bool requiresManualReview = !validationResult.IsValid || 
                                                   validationResult.Issues.Any(i => i.Severity == "high" || i.Severity == "medium");

                        var validatedQuestion = new ValidatedQuestionResult
                        {
                            Question = question,
                            ValidationResult = validationResult,
                            RequiresManualReview = requiresManualReview
                        };

                        validatedResults.Add(validatedQuestion);

                        if (validationResult.IsValid)
                        {
                            validCount++;
                        }
                        else
                        {
                            issuesCount++;
                        }

                        Console.WriteLine($"[DualGemini] Question validated - Valid: {validationResult.IsValid}, Issues: {validationResult.Issues.Count}, Manual Review: {requiresManualReview}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DualGemini] Error validating question: {ex.Message}");
                        
                        // Add question with validation error
                        validatedResults.Add(new ValidatedQuestionResult
                        {
                            Question = question,
                            ValidationResult = new QuestionValidationResponse
                            {
                                IsValid = false,
                                Issues = new List<ValidationIssue>
                                {
                                    new ValidationIssue
                                    {
                                        Type = "validation_error",
                                        Description = "Lỗi trong quá trình kiểm tra chất lượng câu hỏi",
                                        Severity = "high",
                                        Suggestion = "Cần kiểm tra thủ công"
                                    }
                                },
                                OverallAssessment = $"Lỗi kiểm tra: {ex.Message}"
                            },
                            RequiresManualReview = true
                        });
                        issuesCount++;
                    }

                    // Add small delay to avoid rate limiting
                    await Task.Delay(500);
                }

                Console.WriteLine($"[DualGemini] Validation completed - Total: {generatedQuestions.Count}, Valid: {validCount}, Issues: {issuesCount}");

                return new DualGeminiQuestionResponse
                {
                    Questions = validatedResults,
                    TotalGenerated = generatedQuestions.Count,
                    ValidQuestions = validCount,
                    QuestionsWithIssues = issuesCount
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DualGemini] Error in dual Gemini process: {ex.Message}");
                throw;
            }
        }

        public async Task<QuestionValidationResponse> ValidateSingleQuestionAsync(
            string questionContent,
            string questionType,
            List<string> options,
            int gradeLevel,
            string subjectId)
        {
            try
            {
                // Get subject name
                var subject = await _subjectService.GetByIdAsync(subjectId);
                var subjectName = subject?.Name ?? "Không xác định";

                var validationRequest = new QuestionValidationRequest
                {
                    QuestionContent = questionContent,
                    QuestionType = questionType,
                    Options = options ?? new List<string>(),
                    GradeLevel = gradeLevel,
                    Subject = subjectName
                };

                return await _validationService.ValidateQuestionAsync(validationRequest);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error validating single question: {ex.Message}");
                throw;
            }
        }

        public async Task<List<ValidatedQuestionResult>> BatchValidateQuestionsAsync(
            List<CreateQuestionDTO> questions,
            int gradeLevel,
            string subjectId)
        {
            try
            {
                // Get subject name
                var subject = await _subjectService.GetByIdAsync(subjectId);
                var subjectName = subject?.Name ?? "Không xác định";

                var results = new List<ValidatedQuestionResult>();

                foreach (var question in questions)
                {
                    try
                    {
                        var validationRequest = new QuestionValidationRequest
                        {
                            QuestionContent = question.Content,
                            QuestionType = question.Type,
                            Options = question.Options?.Select(o => o.Content).ToList() ?? new List<string>(),
                            GradeLevel = gradeLevel,
                            Subject = subjectName
                        };

                        var validationResult = await _validationService.ValidateQuestionAsync(validationRequest);
                        
                        bool requiresManualReview = !validationResult.IsValid || 
                                                   validationResult.Issues.Any(i => i.Severity == "high" || i.Severity == "medium");

                        results.Add(new ValidatedQuestionResult
                        {
                            Question = question,
                            ValidationResult = validationResult,
                            RequiresManualReview = requiresManualReview
                        });

                        // Add delay to avoid rate limiting
                        await Task.Delay(300);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error validating question in batch: {ex.Message}");
                        
                        results.Add(new ValidatedQuestionResult
                        {
                            Question = question,
                            ValidationResult = new QuestionValidationResponse
                            {
                                IsValid = false,
                                Issues = new List<ValidationIssue>
                                {
                                    new ValidationIssue
                                    {
                                        Type = "validation_error",
                                        Description = "Lỗi trong quá trình kiểm tra",
                                        Severity = "high",
                                        Suggestion = "Cần kiểm tra thủ công"
                                    }
                                },
                                OverallAssessment = $"Lỗi: {ex.Message}"
                            },
                            RequiresManualReview = true
                        });
                    }
                }

                return results;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in batch validation: {ex.Message}");
                throw;
            }
        }
    }
}