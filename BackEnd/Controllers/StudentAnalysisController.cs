using BackEnd.DTOs;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StudentAnalysisController : ControllerBase
    {
        private readonly ExamService _examService;
        private readonly GeminiService _geminiService;

        public StudentAnalysisController(
            ExamService examService,
            GeminiService geminiService)
        {
            _examService = examService;
            _geminiService = geminiService;
        }

        // GET: api/StudentAnalysis/weaknesses
        [HttpGet("weaknesses")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<StudentWeaknessAnalysisResponseDTO>> GetStudentWeaknesses()
        {
            try
            {
                string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                
                // Get the student
                var student = await _examService.GetStudentByIdAsync(studentId);
                if (student == null)
                {
                    return NotFound("Student not found");
                }
                
                // Get all student exam attempts
                var examAttempts = await _examService.GetStudentExamAttemptsAsync(studentId);
                
                // Filter to completed attempts only
                examAttempts = examAttempts.Where(a => a.Status == "completed").ToList();
                
                if (examAttempts.Count == 0)
                {
                    return Ok(new StudentWeaknessAnalysisResponseDTO
                    {
                        StudentId = studentId,
                        StudentName = $"{student.FirstName} {student.LastName}",
                        OverallAnalysis = "You haven't completed any exams yet. Complete some exams to get a personalized analysis.",
                        ImprovementSuggestions = "Start by taking some practice exams to assess your strengths and weaknesses."
                    });
                }
                
                // Create the response object
                var response = new StudentWeaknessAnalysisResponseDTO
                {
                    StudentId = studentId,
                    StudentName = $"{student.FirstName} {student.LastName}"
                };
                
                // Process each exam attempt
                var allWrongAnswers = new List<WrongAnswerDTO>();
                var allEssayAnswers = new List<EssayAnswerDTO>();
                
                foreach (var attempt in examAttempts)
                {
                    var exam = await _examService.GetByIdAsync(attempt.ExamId);
                    if (exam == null) continue;
                    
                    var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                    if (questionSet == null) continue;
                    
                    var examWeakness = new ExamWeaknessDTO
                    {
                        ExamId = exam.Id,
                        ExamTitle = exam.Title,
                        CompletedDate = attempt.EndTime ?? DateTime.UtcNow,
                        Score = attempt.Score ?? 0,
                        TotalQuestions = attempt.Answers.Count,
                        CorrectAnswers = attempt.Answers.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value)
                    };
                    
                    // Process wrong answers
                    foreach (var answer in attempt.Answers)
                    {
                        var question = questionSet.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
                        if (question == null) continue;
                        
                        if (question.Type == "essay")
                        {
                            var essayAnswer = new EssayAnswerDTO
                            {
                                QuestionId = question.Id,
                                QuestionText = question.Content,
                                StudentAnswer = answer.EssayAnswer ?? "No answer provided"
                            };
                            
                            examWeakness.EssayAnswers.Add(essayAnswer);
                            allEssayAnswers.Add(essayAnswer);
                        }
                        else if (answer.IsCorrect.HasValue && !answer.IsCorrect.Value)
                        {
                            // Get correct option text
                            string correctOptionText = "Unknown";
                            if (question.CorrectAnswers != null && question.CorrectAnswers.Count > 0)
                            {
                                var correctIndices = question.CorrectAnswers;
                                var correctOptions = correctIndices
                                    .Where(i => i >= 0 && i < question.Options.Count)
                                    .Select(i => question.Options[i].Content.Replace("[CORRECT]", "").Trim())
                                    .ToList();
                                    
                                correctOptionText = string.Join(", ", correctOptions);
                            }
                            
                            // Get student's answer text
                            string studentAnswerText = "No answer provided";
                            if (answer.SelectedOptions != null && answer.SelectedOptions.Count > 0)
                            {
                                var selectedIndices = answer.SelectedOptions;
                                var selectedOptions = selectedIndices
                                    .Where(i => i >= 0 && i < question.Options.Count)
                                    .Select(i => question.Options[i].Content.Replace("[CORRECT]", "").Trim())
                                    .ToList();
                                    
                                studentAnswerText = string.Join(", ", selectedOptions);
                            }
                            
                            var wrongAnswer = new WrongAnswerDTO
                            {
                                QuestionId = question.Id,
                                QuestionText = question.Content,
                                CorrectAnswerText = correctOptionText,
                                StudentAnswerText = studentAnswerText
                            };
                            
                            examWeakness.WrongAnswers.Add(wrongAnswer);
                            allWrongAnswers.Add(wrongAnswer);
                        }
                    }
                    
                    // If we have enough wrong answers for this exam, analyze them
                    if (examWeakness.WrongAnswers.Count > 0)
                    {
                        examWeakness.WeaknessCategories = await _geminiService.AnalyzeWeaknessCategoriesAsync(examWeakness.WrongAnswers);
                    }
                    
                    response.Exams.Add(examWeakness);
                }
                
                // Create overall analysis if we have enough data
                if (allWrongAnswers.Count > 0 || allEssayAnswers.Count > 0)
                {
                    response.OverallAnalysis = await _geminiService.AnalyzeStudentWeaknessesAsync(allWrongAnswers, allEssayAnswers);
                    
                    // Get top weakness categories if available
                    if (response.Exams.SelectMany(e => e.WeaknessCategories).Any())
                    {
                        response.TopWeaknesses = response.Exams
                            .SelectMany(e => e.WeaknessCategories)
                            .GroupBy(c => c.Name)
                            .Select(g => new WeaknessCategoryDTO
                            {
                                Name = g.Key,
                                PercentCorrect = g.Min(c => c.PercentCorrect),
                                Description = g.First().Description,
                                Recommendations = g.First().Recommendations
                            })
                            .OrderBy(c => c.PercentCorrect)
                            .Take(3)
                            .ToList();
                    }
                }
                else
                {
                    response.OverallAnalysis = "No wrong answers or essay responses to analyze. Keep completing exams to receive a detailed analysis.";
                    response.ImprovementSuggestions = "Continue practicing with more exams to help identify your areas for improvement.";
                }
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"An error occurred while analyzing student weaknesses: {ex.Message}");
            }
        }
    }
} 