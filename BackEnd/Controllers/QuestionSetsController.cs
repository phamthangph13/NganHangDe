using BackEnd.DTOs;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/dashboard/question-sets")]
    [Authorize]
    public class QuestionSetsController : ControllerBase
    {
        private readonly QuestionSetService _questionSetService;
        private readonly SubjectService _subjectService;
        private readonly GeminiService _geminiService;
        private readonly DualGeminiQuestionService _dualGeminiService;

        public QuestionSetsController(
            QuestionSetService questionSetService, 
            SubjectService subjectService,
            GeminiService geminiService,
            DualGeminiQuestionService dualGeminiService)
        {
            _questionSetService = questionSetService;
            _subjectService = subjectService;
            _geminiService = geminiService;
            _dualGeminiService = dualGeminiService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QuestionSetResponseDTO>>> GetAll()
        {
            var questionSets = await _questionSetService.GetQuestionSetsWithSubjectInfo();
            return Ok(questionSets);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<QuestionSetDetailResponseDTO>> GetById(string id)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid question set ID format" });

            var questionSet = await _questionSetService.GetQuestionSetDetail(id);
            if (questionSet == null)
                return NotFound();

            return Ok(questionSet);
        }

        [HttpPost]
        public async Task<ActionResult<QuestionSetResponseDTO>> Create(CreateQuestionSetDTO createDto)
        {
            // Add logging to debug the received data
            Console.WriteLine($"Received request to create question set: Title={createDto.Title}, SubjectId={createDto.SubjectId}, GradeLevel={createDto.GradeLevel}");
            
            // Validate that the subject exists
            if (string.IsNullOrEmpty(createDto.SubjectId))
            {
                Console.WriteLine("Subject ID is null or empty");
                return BadRequest(new { message = "Subject ID is required" });
            }
            
            if (!ObjectId.TryParse(createDto.SubjectId, out _))
            {
                Console.WriteLine($"Failed to parse subject ID '{createDto.SubjectId}' as ObjectId");
                return BadRequest(new { message = "Invalid subject ID format" });
            }

            var subject = await _subjectService.GetByIdAsync(createDto.SubjectId);
            if (subject == null)
            {
                Console.WriteLine($"Subject with ID '{createDto.SubjectId}' not found");
                return BadRequest(new { message = "Subject not found" });
            }

            Console.WriteLine($"Subject found: {subject.Name}");
            var createdQuestionSet = await _questionSetService.CreateAsync(createDto);
            
            // Create response DTO
            var responseDto = new QuestionSetResponseDTO
            {
                Id = createdQuestionSet.Id,
                Title = createdQuestionSet.Title,
                SubjectId = createdQuestionSet.SubjectId,
                SubjectName = subject.Name,
                GradeLevel = createdQuestionSet.GradeLevel,
                Description = createdQuestionSet.Description,
                CreatedAt = createdQuestionSet.CreatedAt,
                UpdatedAt = createdQuestionSet.UpdatedAt,
                QuestionCount = 0
            };
            
            return CreatedAtAction(nameof(GetById), new { id = createdQuestionSet.Id }, responseDto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<QuestionSetResponseDTO>> Update(string id, UpdateQuestionSetDTO updateDto)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid question set ID format" });

            // Check if the question set exists
            var questionSet = await _questionSetService.GetByIdAsync(id);
            if (questionSet == null)
                return NotFound();

            // If subject is being updated, validate it exists
            if (!string.IsNullOrEmpty(updateDto.SubjectId) && updateDto.SubjectId != questionSet.SubjectId)
            {
                if (!ObjectId.TryParse(updateDto.SubjectId, out _))
                    return BadRequest(new { message = "Invalid subject ID format" });

                var subject = await _subjectService.GetByIdAsync(updateDto.SubjectId);
                if (subject == null)
                    return BadRequest(new { message = "Subject not found" });
            }

            var updatedQuestionSet = await _questionSetService.UpdateAsync(id, updateDto);
            var detail = await _questionSetService.GetQuestionSetDetail(id);
            
            return Ok(detail);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid question set ID format" });

            var questionSet = await _questionSetService.GetByIdAsync(id);
            if (questionSet == null)
                return NotFound();

            var result = await _questionSetService.DeleteAsync(id);
            if (result)
                return NoContent();
            else
                return StatusCode(500, new { message = "An error occurred while deleting the question set" });
        }

        [HttpPost("{id}/questions")]
        public async Task<ActionResult<QuestionSetDetailResponseDTO>> AddQuestion(string id, CreateQuestionDTO questionDto)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid question set ID format" });

            // Validate question type
            if (string.IsNullOrEmpty(questionDto.Type) || 
                (questionDto.Type != "single" && questionDto.Type != "multiple" && questionDto.Type != "essay"))
            {
                return BadRequest(new { message = "Question type must be 'single', 'multiple', or 'essay'" });
            }

            // For non-essay questions, validate options and correct answers
            if (questionDto.Type != "essay")
            {
                if (questionDto.Options == null || questionDto.Options.Count < 2)
                {
                    return BadRequest(new { message = "Multiple choice questions must have at least 2 options" });
                }

                if (questionDto.CorrectAnswers == null || questionDto.CorrectAnswers.Count == 0)
                {
                    return BadRequest(new { message = "Multiple choice questions must have at least one correct answer" });
                }

                if (questionDto.Type == "single" && questionDto.CorrectAnswers.Count > 1)
                {
                    return BadRequest(new { message = "Single choice questions must have exactly one correct answer" });
                }

                // Validate that all correct answers are valid indices
                foreach (var answerIndex in questionDto.CorrectAnswers)
                {
                    if (answerIndex < 0 || answerIndex >= questionDto.Options.Count)
                    {
                        return BadRequest(new { message = "Correct answer indices must be valid option indices" });
                    }
                }
            }

            var questionSet = await _questionSetService.AddQuestionAsync(id, questionDto);
            if (questionSet == null)
                return NotFound();

            var detail = await _questionSetService.GetQuestionSetDetail(id);
            return Ok(detail);
        }

        [HttpPut("{questionSetId}/questions/{questionId}")]
        public async Task<ActionResult<QuestionSetDetailResponseDTO>> UpdateQuestion(string questionSetId, string questionId, UpdateQuestionDTO questionDto)
        {
            // Validate questionSetId format
            if (string.IsNullOrEmpty(questionSetId) || !ObjectId.TryParse(questionSetId, out _))
                return BadRequest(new { message = "Invalid question set ID format" });
                
            // Validate questionId format
            if (string.IsNullOrEmpty(questionId))
                return BadRequest(new { message = "Invalid question ID format" });
                
            // Validate question type
            if (!string.IsNullOrEmpty(questionDto.Type) && 
                (questionDto.Type != "single" && questionDto.Type != "multiple" && questionDto.Type != "essay"))
            {
                return BadRequest(new { message = "Question type must be 'single', 'multiple', or 'essay'" });
            }

            // For non-essay questions, validate options and correct answers if they're provided
            if (questionDto.Type != "essay" && questionDto.Options != null)
            {
                if (questionDto.Options.Count < 2)
                {
                    return BadRequest(new { message = "Multiple choice questions must have at least 2 options" });
                }

                if (questionDto.CorrectAnswers != null)
                {
                    if (questionDto.CorrectAnswers.Count == 0)
                    {
                        return BadRequest(new { message = "Multiple choice questions must have at least one correct answer" });
                    }

                    if (questionDto.Type == "single" && questionDto.CorrectAnswers.Count > 1)
                    {
                        return BadRequest(new { message = "Single choice questions must have exactly one correct answer" });
                    }

                    // Validate that all correct answers are valid indices
                    foreach (var answerIndex in questionDto.CorrectAnswers)
                    {
                        if (answerIndex < 0 || answerIndex >= questionDto.Options.Count)
                        {
                            return BadRequest(new { message = "Correct answer indices must be valid option indices" });
                        }
                    }
                }
            }
            
            // Get the existing question to update
            var questionSet = await _questionSetService.GetByIdAsync(questionSetId);
            if (questionSet == null)
                return NotFound(new { message = "Question set not found" });
                
            var question = questionSet.Questions?.FirstOrDefault(q => q.Id == questionId);
            if (question == null)
                return NotFound(new { message = "Question not found" });
                
            // Update the question with new values
            if (!string.IsNullOrEmpty(questionDto.Content))
                question.Content = questionDto.Content;
                
            if (!string.IsNullOrEmpty(questionDto.Type))
                question.Type = questionDto.Type;
                
            if (questionDto.CorrectAnswers != null)
                question.CorrectAnswers = questionDto.CorrectAnswers;
                
            if (!string.IsNullOrEmpty(questionDto.BloomLevel))
                question.BloomLevel = questionDto.BloomLevel;
                
            if (questionDto.Options != null)
            {
                question.Options = questionDto.Options.Select((o, i) => new Option 
                { 
                    Id = i, 
                    Content = o.Content 
                }).ToList();
            }
            
            var result = await _questionSetService.UpdateQuestionAsync(questionSetId, questionId, question);
            if (result == null)
                return NotFound();
                
            var detail = await _questionSetService.GetQuestionSetDetail(questionSetId);
            return Ok(detail);
        }
        
        [HttpDelete("{questionSetId}/questions/{questionId}")]
        public async Task<ActionResult<QuestionSetDetailResponseDTO>> DeleteQuestion(string questionSetId, string questionId)
        {
            // Validate questionSetId format
            if (string.IsNullOrEmpty(questionSetId) || !ObjectId.TryParse(questionSetId, out _))
                return BadRequest(new { message = "Invalid question set ID format" });
                
            // Validate questionId format
            if (string.IsNullOrEmpty(questionId))
                return BadRequest(new { message = "Invalid question ID format" });
                
            var result = await _questionSetService.DeleteQuestionAsync(questionSetId, questionId);
            if (result == null)
                return NotFound();
                
            var detail = await _questionSetService.GetQuestionSetDetail(questionSetId);
            return Ok(detail);
        }

        // Get the list of available grade levels (1-12)
        [HttpGet("grade-levels")]
        public ActionResult<IEnumerable<int>> GetGradeLevels()
        {
            var gradeLevels = new List<int>();
            for (int i = 1; i <= 12; i++)
            {
                gradeLevels.Add(i);
            }
            return Ok(gradeLevels);
        }

        [HttpPost("generate-ai-questions")]
        public async Task<ActionResult<GenerateQuestionsResponse>> GenerateAIQuestions(GenerateQuestionsRequest request)
        {
            try
            {
                // Validate question set exists
                if (string.IsNullOrEmpty(request.QuestionSetId) || !ObjectId.TryParse(request.QuestionSetId, out _))
                    return BadRequest(new { message = "Invalid question set ID format" });

                var questionSet = await _questionSetService.GetByIdAsync(request.QuestionSetId);
                if (questionSet == null)
                    return NotFound(new { message = "Question set not found" });

                // Validate question type
                if (string.IsNullOrEmpty(request.Type) || 
                    (request.Type != "single" && request.Type != "multiple" && request.Type != "essay"))
                {
                    return BadRequest(new { message = "Question type must be 'single', 'multiple', or 'essay'" });
                }

                // Generate questions using Gemini
                var generatedQuestions = await _geminiService.GenerateQuestionsAsync(
                    request.Prompt, 
                    request.Type, 
                    request.Count
                );

                return Ok(new GenerateQuestionsResponse { Questions = generatedQuestions });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating AI questions: {ex.Message}");
                return StatusCode(500, new { message = "Failed to generate AI questions", error = ex.Message });
            }
        }

        [HttpPost("generate-dual-gemini-questions")]
        public async Task<ActionResult<DualGeminiQuestionResponse>> GenerateDualGeminiQuestions(DualGeminiQuestionRequest request)
        {
            try
            {
                // Validate question set exists
                if (string.IsNullOrEmpty(request.QuestionSetId) || !ObjectId.TryParse(request.QuestionSetId, out _))
                    return BadRequest(new { message = "Invalid question set ID format" });

                var questionSet = await _questionSetService.GetByIdAsync(request.QuestionSetId);
                if (questionSet == null)
                    return NotFound(new { message = "Question set not found" });

                // Validate question type
                if (string.IsNullOrEmpty(request.Type) || 
                    (request.Type != "single" && request.Type != "multiple" && request.Type != "essay"))
                {
                    return BadRequest(new { message = "Question type must be 'single', 'multiple', or 'essay'" });
                }

                // Validate grade level
                if (request.GradeLevel < 1 || request.GradeLevel > 12)
                {
                    return BadRequest(new { message = "Grade level must be between 1 and 12" });
                }

                // Generate and validate questions using dual Gemini system
                var result = await _dualGeminiService.GenerateAndValidateQuestionsAsync(request);

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating dual Gemini questions: {ex.Message}");
                return StatusCode(500, new { message = "Failed to generate and validate questions", error = ex.Message });
            }
        }

        [HttpPost("validate-question")]
        public async Task<ActionResult<QuestionValidationResponse>> ValidateQuestion(QuestionValidationRequest request)
        {
            try
            {
                // Validate grade level
                if (request.GradeLevel < 1 || request.GradeLevel > 12)
                {
                    return BadRequest(new { message = "Grade level must be between 1 and 12" });
                }

                // Validate question type
                if (string.IsNullOrEmpty(request.QuestionType) || 
                    (request.QuestionType != "single" && request.QuestionType != "multiple" && request.QuestionType != "essay"))
                {
                    return BadRequest(new { message = "Question type must be 'single', 'multiple', or 'essay'" });
                }

                var result = await _dualGeminiService.ValidateSingleQuestionAsync(
                    request.QuestionContent,
                    request.QuestionType,
                    request.Options,
                    request.GradeLevel,
                    request.Subject
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error validating question: {ex.Message}");
                return StatusCode(500, new { message = "Failed to validate question", error = ex.Message });
            }
        }

        [HttpPost("batch-validate-questions")]
        public async Task<ActionResult<List<ValidatedQuestionResult>>> BatchValidateQuestions(BatchValidateQuestionsRequest request)
        {
            try
            {
                // Validate grade level
                if (request.GradeLevel < 1 || request.GradeLevel > 12)
                {
                    return BadRequest(new { message = "Grade level must be between 1 and 12" });
                }

                // Validate questions
                if (request.Questions == null || !request.Questions.Any())
                {
                    return BadRequest(new { message = "At least one question is required" });
                }

                var result = await _dualGeminiService.BatchValidateQuestionsAsync(
                    request.Questions,
                    request.GradeLevel,
                    request.SubjectId
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error batch validating questions: {ex.Message}");
                return StatusCode(500, new { message = "Failed to batch validate questions", error = ex.Message });
            }
        }
    }
}