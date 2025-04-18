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
    public class ExamsController : ControllerBase
    {
        private readonly ExamService _examService;
        private readonly QuestionSetService _questionSetService;
        private readonly ClassService _classService;

        public ExamsController(
            ExamService examService,
            QuestionSetService questionSetService,
            ClassService classService)
        {
            _examService = examService;
            _questionSetService = questionSetService;
            _classService = classService;
        }

        // GET: api/Exams
        [HttpGet]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<IEnumerable<ExamResponseDTO>>> GetExams()
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var exams = await _examService.GetTeacherExamsAsync(teacherId);

            var examDtos = new List<ExamResponseDTO>();
            foreach (var exam in exams)
            {
                var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                string className = null;
                if (!string.IsNullOrEmpty(exam.ClassId))
                {
                    var cls = await _examService.GetClassAsync(exam.ClassId);
                    className = cls?.Name;
                }

                var attemptCount = await _examService.GetExamAttemptsCountAsync(exam.Id);
                var avgScore = await _examService.GetAverageScoreAsync(exam.Id);

                examDtos.Add(new ExamResponseDTO
                {
                    Id = exam.Id,
                    Title = exam.Title,
                    QuestionSetId = exam.QuestionSetId,
                    QuestionSetTitle = questionSet?.Title,
                    Description = exam.Description,
                    Duration = exam.Duration,
                    AccessType = exam.AccessType,
                    ClassId = exam.ClassId,
                    ClassName = className,
                    SelectedStudentIds = exam.SelectedStudentIds,
                    Status = exam.Status,
                    PublishDate = exam.PublishDate,
                    CreatedAt = exam.CreatedAt,
                    UpdatedAt = exam.UpdatedAt,
                    QuestionCount = questionSet?.Questions.Count ?? 0,
                    AttemptCount = attemptCount,
                    AverageScore = avgScore
                });
            }

            return Ok(examDtos);
        }

        // GET: api/Exams/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ExamDetailDTO>> GetExam(string id)
        {
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            string userRole = User.FindFirstValue(ClaimTypes.Role);

            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }

            // Teachers can only see their own exams
            if (userRole == "Teacher" && exam.TeacherId != userId)
            {
                return Forbid();
            }

            // Students can only see exams they have access to
            if (userRole == "Student" && !await _examService.CanStudentAccessExamAsync(id, userId))
            {
                return Forbid();
            }

            var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
            string className = null;
            if (!string.IsNullOrEmpty(exam.ClassId))
            {
                var cls = await _examService.GetClassAsync(exam.ClassId);
                className = cls?.Name;
            }

            var selectedStudents = new List<StudentBriefDTO>();
            if (exam.AccessType == "selected" && exam.SelectedStudentIds.Count > 0)
            {
                var students = await _examService.GetSelectedStudentsAsync(exam.SelectedStudentIds);
                selectedStudents = students.Select(s => new StudentBriefDTO
                {
                    Id = s.Id,
                    Name = $"{s.FirstName} {s.LastName}",
                    Email = s.Email
                }).ToList();
            }

            var examLink = $"/exam/{exam.Id}";

            var examDetailDto = new ExamDetailDTO
            {
                Id = exam.Id,
                Title = exam.Title,
                QuestionSetId = exam.QuestionSetId,
                QuestionSetTitle = questionSet?.Title,
                Description = exam.Description,
                Duration = exam.Duration,
                AccessType = exam.AccessType,
                ClassId = exam.ClassId,
                ClassName = className,
                SelectedStudents = selectedStudents,
                Status = exam.Status,
                PublishDate = exam.PublishDate,
                CreatedAt = exam.CreatedAt,
                UpdatedAt = exam.UpdatedAt,
                QuestionCount = questionSet?.Questions.Count ?? 0,
                RequirePassword = exam.RequirePassword,
                ExamLink = examLink
            };

            return Ok(examDetailDto);
        }

        // POST: api/Exams
        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<ExamResponseDTO>> CreateExam(CreateExamDTO createExamDto)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Validate question set exists
            var questionSet = await _examService.GetQuestionSetAsync(createExamDto.QuestionSetId);
            if (questionSet == null)
            {
                return BadRequest("Bộ câu hỏi không tồn tại");
            }

            // Validate class if specified
            if (!string.IsNullOrEmpty(createExamDto.ClassId))
            {
                var cls = await _examService.GetClassAsync(createExamDto.ClassId);
                if (cls == null)
                {
                    return BadRequest("Lớp học không tồn tại");
                }

                // Verify the teacher owns this class
                if (cls.TeacherId != teacherId)
                {
                    return BadRequest("Bạn không có quyền truy cập vào lớp học này");
                }
            }

            // Validate student IDs if specified
            if (createExamDto.AccessType == "selected" && createExamDto.SelectedStudentIds.Count > 0)
            {
                // If class is specified, verify students are in the class
                if (!string.IsNullOrEmpty(createExamDto.ClassId))
                {
                    var classStudents = await _examService.GetClassStudentsAsync(createExamDto.ClassId);
                    var classStudentIds = classStudents.Select(s => s.Id).ToList();
                    var invalidStudents = createExamDto.SelectedStudentIds.Where(id => !classStudentIds.Contains(id)).ToList();

                    if (invalidStudents.Count > 0)
                    {
                        return BadRequest("Một số học sinh đã chọn không thuộc lớp học này");
                    }
                }
            }

            // Validate password if required
            if (createExamDto.RequirePassword && string.IsNullOrWhiteSpace(createExamDto.Password))
            {
                return BadRequest("Mật khẩu không được để trống nếu bạn chọn bảo vệ bằng mật khẩu");
            }

            var newExam = new Exam
            {
                Title = createExamDto.Title,
                QuestionSetId = createExamDto.QuestionSetId,
                Description = createExamDto.Description,
                Duration = createExamDto.Duration,
                AccessType = createExamDto.AccessType,
                ClassId = createExamDto.ClassId,
                SelectedStudentIds = createExamDto.SelectedStudentIds,
                TeacherId = teacherId,
                RequirePassword = createExamDto.RequirePassword,
                Password = createExamDto.Password
            };

            await _examService.CreateAsync(newExam);

            // Generate exam link
            var examLink = $"/exam/{newExam.Id}";

            var questionSetInfo = await _examService.GetQuestionSetAsync(newExam.QuestionSetId);
            string className = null;
            if (!string.IsNullOrEmpty(newExam.ClassId))
            {
                var cls = await _examService.GetClassAsync(newExam.ClassId);
                className = cls?.Name;
            }

            return Ok(new ExamResponseDTO
            {
                Id = newExam.Id,
                Title = newExam.Title,
                QuestionSetId = newExam.QuestionSetId,
                QuestionSetTitle = questionSetInfo?.Title,
                Description = newExam.Description,
                Duration = newExam.Duration,
                AccessType = newExam.AccessType,
                ClassId = newExam.ClassId,
                ClassName = className,
                SelectedStudentIds = newExam.SelectedStudentIds,
                Status = newExam.Status,
                CreatedAt = newExam.CreatedAt,
                UpdatedAt = newExam.UpdatedAt,
                QuestionCount = questionSetInfo?.Questions.Count ?? 0,
                AttemptCount = 0,
                AverageScore = null,
                RequirePassword = newExam.RequirePassword,
                ExamLink = examLink
            });
        }

        // PUT: api/Exams/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> UpdateExam(string id, UpdateExamDTO updateExamDto)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }

            // Verify the teacher owns this exam
            if (exam.TeacherId != teacherId)
            {
                return Forbid();
            }

            // Can't update a published or closed exam
            if (exam.Status != "draft")
            {
                return BadRequest("Không thể cập nhật đề thi đã được xuất bản hoặc đóng");
            }

            // Validate password if required is set to true
            if (updateExamDto.RequirePassword == true && string.IsNullOrWhiteSpace(updateExamDto.Password))
            {
                return BadRequest("Mật khẩu không được để trống nếu bạn chọn bảo vệ bằng mật khẩu");
            }

            // Update properties if provided
            if (!string.IsNullOrEmpty(updateExamDto.Title))
            {
                exam.Title = updateExamDto.Title;
            }

            if (updateExamDto.Description != null)
            {
                exam.Description = updateExamDto.Description;
            }

            if (updateExamDto.Duration.HasValue)
            {
                exam.Duration = updateExamDto.Duration.Value;
            }

            if (!string.IsNullOrEmpty(updateExamDto.AccessType))
            {
                exam.AccessType = updateExamDto.AccessType;

                // Handle class and student changes
                if (updateExamDto.AccessType == "public")
                {
                    exam.ClassId = null;
                    exam.SelectedStudentIds.Clear();
                }
                else if (updateExamDto.AccessType == "class")
                {
                    if (string.IsNullOrEmpty(updateExamDto.ClassId))
                    {
                        return BadRequest("Cần chỉ định lớp học cho loại truy cập 'class'");
                    }

                    // Validate class exists and belongs to teacher
                    var cls = await _examService.GetClassAsync(updateExamDto.ClassId);
                    if (cls == null)
                    {
                        return BadRequest("Lớp học không tồn tại");
                    }

                    if (cls.TeacherId != teacherId)
                    {
                        return BadRequest("Bạn không có quyền truy cập vào lớp học này");
                    }

                    exam.ClassId = updateExamDto.ClassId;
                    exam.SelectedStudentIds.Clear();
                }
                else if (updateExamDto.AccessType == "selected")
                {
                    if (string.IsNullOrEmpty(updateExamDto.ClassId))
                    {
                        return BadRequest("Cần chỉ định lớp học cho loại truy cập 'selected'");
                    }

                    if (updateExamDto.SelectedStudentIds == null || updateExamDto.SelectedStudentIds.Count == 0)
                    {
                        return BadRequest("Cần chỉ định học sinh cho loại truy cập 'selected'");
                    }

                    // Validate class exists and belongs to teacher
                    var cls = await _examService.GetClassAsync(updateExamDto.ClassId);
                    if (cls == null)
                    {
                        return BadRequest("Lớp học không tồn tại");
                    }

                    if (cls.TeacherId != teacherId)
                    {
                        return BadRequest("Bạn không có quyền truy cập vào lớp học này");
                    }

                    // Validate students belong to class
                    var classStudents = await _examService.GetClassStudentsAsync(updateExamDto.ClassId);
                    var classStudentIds = classStudents.Select(s => s.Id).ToList();
                    var invalidStudents = updateExamDto.SelectedStudentIds.Where(id => !classStudentIds.Contains(id)).ToList();

                    if (invalidStudents.Count > 0)
                    {
                        return BadRequest("Một số học sinh đã chọn không thuộc lớp học này");
                    }

                    exam.ClassId = updateExamDto.ClassId;
                    exam.SelectedStudentIds = updateExamDto.SelectedStudentIds;
                }
            }
            else
            {
                // Handle updates to class or selected students without changing access type
                if (exam.AccessType == "class" && !string.IsNullOrEmpty(updateExamDto.ClassId))
                {
                    // Validate class exists and belongs to teacher
                    var cls = await _examService.GetClassAsync(updateExamDto.ClassId);
                    if (cls == null)
                    {
                        return BadRequest("Lớp học không tồn tại");
                    }

                    if (cls.TeacherId != teacherId)
                    {
                        return BadRequest("Bạn không có quyền truy cập vào lớp học này");
                    }

                    exam.ClassId = updateExamDto.ClassId;
                }
                else if (exam.AccessType == "selected")
                {
                    if (!string.IsNullOrEmpty(updateExamDto.ClassId))
                    {
                        // Validate class exists and belongs to teacher
                        var cls = await _examService.GetClassAsync(updateExamDto.ClassId);
                        if (cls == null)
                        {
                            return BadRequest("Lớp học không tồn tại");
                        }

                        if (cls.TeacherId != teacherId)
                        {
                            return BadRequest("Bạn không có quyền truy cập vào lớp học này");
                        }

                        exam.ClassId = updateExamDto.ClassId;
                    }

                    if (updateExamDto.SelectedStudentIds != null && updateExamDto.SelectedStudentIds.Count > 0)
                    {
                        // Validate students belong to class
                        var classStudents = await _examService.GetClassStudentsAsync(exam.ClassId);
                        var classStudentIds = classStudents.Select(s => s.Id).ToList();
                        var invalidStudents = updateExamDto.SelectedStudentIds.Where(id => !classStudentIds.Contains(id)).ToList();

                        if (invalidStudents.Count > 0)
                        {
                            return BadRequest("Một số học sinh đã chọn không thuộc lớp học này");
                        }

                        exam.SelectedStudentIds = updateExamDto.SelectedStudentIds;
                    }
                }
            }

            // Update password settings if provided
            if (updateExamDto.RequirePassword.HasValue)
            {
                exam.RequirePassword = updateExamDto.RequirePassword.Value;
                
                // Only update password if provided
                if (!string.IsNullOrWhiteSpace(updateExamDto.Password))
                {
                    exam.Password = updateExamDto.Password;
                }
                // If password protection is disabled, clear the password
                else if (!updateExamDto.RequirePassword.Value)
                {
                    exam.Password = null;
                }
            }

            var result = await _examService.UpdateAsync(id, exam);
            if (!result)
            {
                return BadRequest("Cập nhật đề thi thất bại");
            }

            // Generate exam link
            var examLink = $"/exam/{exam.Id}";

            return NoContent();
        }

        // DELETE: api/Exams/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> DeleteExam(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }

            // Verify the teacher owns this exam
            if (exam.TeacherId != teacherId)
            {
                return Forbid();
            }

            var result = await _examService.DeleteAsync(id);
            if (!result)
            {
                return BadRequest("Xóa đề thi thất bại");
            }

            return NoContent();
        }

        // POST: api/Exams/5/publish
        [HttpPost("{id}/publish")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> PublishExam(string id, PublishExamDTO publishExamDto)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }

            // Verify the teacher owns this exam
            if (exam.TeacherId != teacherId)
            {
                return Forbid();
            }

            // Can't publish an already published or closed exam
            if (exam.Status != "draft")
            {
                return BadRequest("Chỉ có thể xuất bản đề thi ở trạng thái bản nháp");
            }

            var result = await _examService.PublishExamAsync(id, publishExamDto.PublishDate);
            if (!result)
            {
                return BadRequest("Xuất bản đề thi thất bại");
            }

            return NoContent();
        }

        // POST: api/Exams/5/close
        [HttpPost("{id}/close")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> CloseExam(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }

            // Verify the teacher owns this exam
            if (exam.TeacherId != teacherId)
            {
                return Forbid();
            }

            // Can only close a published exam
            if (exam.Status != "published")
            {
                return BadRequest("Chỉ có thể đóng đề thi đã xuất bản");
            }

            var result = await _examService.CloseExamAsync(id);
            if (!result)
            {
                return BadRequest("Đóng đề thi thất bại");
            }

            return NoContent();
        }

        // GET: api/Exams/available
        [HttpGet("available")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<IEnumerable<ExamResponseDTO>>> GetAvailableExams()
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var exams = await _examService.GetStudentAvailableExamsAsync(studentId);

            var examDtos = new List<ExamResponseDTO>();
            foreach (var exam in exams)
            {
                var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                string className = null;
                if (!string.IsNullOrEmpty(exam.ClassId))
                {
                    var cls = await _examService.GetClassAsync(exam.ClassId);
                    className = cls?.Name;
                }

                examDtos.Add(new ExamResponseDTO
                {
                    Id = exam.Id,
                    Title = exam.Title,
                    QuestionSetId = exam.QuestionSetId,
                    QuestionSetTitle = questionSet?.Title,
                    Description = exam.Description,
                    Duration = exam.Duration,
                    AccessType = exam.AccessType,
                    ClassId = exam.ClassId,
                    ClassName = className,
                    Status = exam.Status,
                    PublishDate = exam.PublishDate,
                    CreatedAt = exam.CreatedAt,
                    UpdatedAt = exam.UpdatedAt,
                    QuestionCount = questionSet?.Questions.Count ?? 0
                });
            }

            return Ok(examDtos);
        }

        // GET: api/Exams/{id}/results
        [HttpGet("{id}/results")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<IEnumerable<ExamResultDTO>>> GetExamResults(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Verify exam exists and teacher owns it
            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound();
            }
            
            // Bỏ qua việc kiểm tra teacherId, cho phép tất cả giáo viên xem kết quả
            // if (exam.TeacherId != teacherId)
            // {
            //     return Forbid();
            // }
            
            // Get all attempts for this exam
            var attempts = await _examService.GetExamResultsAsync(id);
            Console.WriteLine($"Found {attempts.Count} attempts for exam {id}");
            
            // Create DTOs with student information
            var resultDtos = new List<ExamResultDTO>();
            foreach (var attempt in attempts)
            {
                Console.WriteLine($"Processing attempt {attempt.Id} for student {attempt.StudentId}");
                var student = await _examService.GetStudentByIdAsync(attempt.StudentId);
                if (student == null)
                {
                    Console.WriteLine($"Student {attempt.StudentId} not found, checking for any user");
                    student = await _examService.GetUserAsync(attempt.StudentId);
                    if (student == null)
                    {
                        Console.WriteLine($"User {attempt.StudentId} not found either, skipping");
                        continue;
                    }
                }
                    
                var studentName = $"{student.FirstName} {student.LastName}";
                if (string.IsNullOrEmpty(studentName.Trim()))
                {
                    studentName = student.Email ?? "Unknown Student";
                }
                
                Console.WriteLine($"Adding result for student {studentName}");
                resultDtos.Add(new ExamResultDTO
                {
                    Id = attempt.Id,
                    StudentId = attempt.StudentId,
                    StudentName = studentName,
                    ExamId = attempt.ExamId,
                    Score = attempt.Score,
                    TotalQuestions = attempt.Answers.Count,
                    CorrectAnswers = attempt.Answers.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value),
                    StartTime = attempt.StartTime,
                    EndTime = attempt.EndTime,
                    Duration = attempt.EndTime.HasValue ? 
                        (int)Math.Ceiling((attempt.EndTime.Value - attempt.StartTime).TotalMinutes) : 0,
                    Completed = attempt.Status == "completed"
                });
            }
            
            Console.WriteLine($"Returning {resultDtos.Count} results");
            return Ok(resultDtos);
        }

        // GET: api/Exams/results/{resultId}
        [HttpGet("results/{resultId}")]
        [Authorize(Roles = "Teacher,Student")]
        public async Task<ActionResult<StudentResultDetailDTO>> GetStudentResult(string resultId)
        {
            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            string userRole = User.FindFirstValue(ClaimTypes.Role);
            
            // Get the attempt
            var attempt = await _examService.GetExamAttemptByIdAsync(resultId);
            if (attempt == null)
            {
                return NotFound();
            }
            
            // Get the exam
            var exam = await _examService.GetByIdAsync(attempt.ExamId);
            if (exam == null)
            {
                return NotFound();
            }
            
            // Check permissions
            if (userRole == "Teacher" && exam.TeacherId != userId)
            {
                return Forbid();
            }
            else if (userRole == "Student" && attempt.StudentId != userId)
            {
                return Forbid();
            }
            
            // Get student details
            var student = await _examService.GetStudentByIdAsync(attempt.StudentId);
            if (student == null)
            {
                return NotFound("Student not found");
            }
            
            var studentName = $"{student.FirstName} {student.LastName}";
            
            // Get question details
            var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
            if (questionSet == null)
            {
                return NotFound("Question set not found");
            }
            
            // Create DTO
            var resultDetails = new StudentResultDetailDTO
            {
                Id = attempt.Id,
                StudentId = attempt.StudentId,
                StudentName = studentName,
                ExamId = attempt.ExamId,
                Score = attempt.Score,
                TotalQuestions = attempt.Answers.Count,
                CorrectAnswers = attempt.Answers.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value),
                StartTime = attempt.StartTime,
                EndTime = attempt.EndTime,
                Duration = attempt.EndTime.HasValue ? 
                    (int)Math.Ceiling((attempt.EndTime.Value - attempt.StartTime).TotalMinutes) : 0,
                Completed = attempt.Status == "completed",
                Answers = new List<StudentAnswerDTO>()
            };
            
            // Only add answer details if the exam is closed or the user is a teacher
            if (exam.Status == "closed" || userRole == "Teacher")
            {
                foreach (var answer in attempt.Answers)
                {
                    var question = questionSet.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
                    if (question == null)
                        continue;
                        
                    // Get correct option ID based on the first correct answer (for single choice)
                    string correctOptionId = "0";
                    if (question.CorrectAnswers.Count > 0)
                    {
                        int correctOptionIndex = question.CorrectAnswers[0];
                        if (correctOptionIndex >= 0 && correctOptionIndex < question.Options.Count)
                        {
                            correctOptionId = question.Options[correctOptionIndex].Id.ToString();
                        }
                    }
                    
                    // Get selected option ID for this question
                    string selectedOptionId = null;
                    if (answer.SelectedOptions != null && answer.SelectedOptions.Count > 0)
                    {
                        int selectedOptionIndex = answer.SelectedOptions[0];
                        if (selectedOptionIndex >= 0 && selectedOptionIndex < question.Options.Count)
                        {
                            selectedOptionId = question.Options[selectedOptionIndex].Id.ToString();
                        }
                    }
                    
                    var answerDto = new StudentAnswerDTO
                    {
                        QuestionId = answer.QuestionId,
                        QuestionText = question.Content,
                        CorrectOptionId = correctOptionId,
                        SelectedOptionId = selectedOptionId,
                        IsCorrect = answer.IsCorrect.HasValue && answer.IsCorrect.Value,
                        Options = question.Options.Select(o => new ExamOptionDTO
                        {
                            Id = o.Id.ToString(),
                            Text = o.Content
                        }).ToList()
                    };
                    
                    resultDetails.Answers.Add(answerDto);
                }
            }
            
            return Ok(resultDetails);
        }

        // GET: api/Exams/validate-access/{id}
        [HttpGet("validate-access/{id}")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<ValidationResultDTO>> ValidateStudentExamAccess(string id)
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            string userRole = User.FindFirstValue(ClaimTypes.Role);
            
            // Check if the user has Student role
            if (userRole != "Student")
            {
                return Ok(new ValidationResultDTO
                {
                    CanAccess = false,
                    Message = "Only students can access exams"
                });
            }
            
            // Get the exam
            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound(new ValidationResultDTO
                {
                    CanAccess = false,
                    Message = "Exam not found"
                });
            }
            
            // Check if exam is published
            if (exam.Status != "published")
            {
                return Ok(new ValidationResultDTO
                {
                    CanAccess = false,
                    Message = "This exam is not currently available"
                });
            }
            
            // Check access based on AccessType
            bool canAccess = false;
            string message = "";
            
            if (exam.AccessType == "public")
            {
                // Public exams - any student can access
                canAccess = true;
                message = "Public exam access granted";
            }
            else if (exam.AccessType == "class")
            {
                // Class-based access - check if student is in the class
                var classEnrollment = await _classService.GetStudentEnrollmentsAsync(studentId);
                canAccess = classEnrollment.Any(cs => cs.ClassId == exam.ClassId);
                message = canAccess 
                    ? "Class-based exam access granted" 
                    : "You are not enrolled in the class required for this exam";
            }
            else if (exam.AccessType == "selected")
            {
                // Selected students - check if student is in the list
                canAccess = exam.SelectedStudentIds.Contains(studentId);
                message = canAccess 
                    ? "Selected student exam access granted" 
                    : "You are not authorized to take this exam";
            }
            
            // Check if student has already attempted this exam
            var existingAttempt = await _examService.GetStudentExamAttemptAsync(id, studentId);
            if (existingAttempt != null)
            {
                canAccess = false;
                message = "You have already attempted this exam";
            }
            
            return Ok(new ValidationResultDTO
            {
                CanAccess = canAccess,
                Message = message,
                Exam = canAccess ? new ExamBriefDTO
                {
                    Id = exam.Id,
                    Title = exam.Title,
                    Duration = exam.Duration,
                    RequirePassword = exam.RequirePassword
                } : null
            });
        }

        // POST: api/Exams/{id}/validate-password
        [HttpPost("{id}/validate-password")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<bool>> ValidateExamPassword(string id, [FromBody] ExamPasswordDTO passwordDto)
        {
            if (string.IsNullOrEmpty(passwordDto.Password))
            {
                return BadRequest(false);
            }
            
            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound(false);
            }
            
            // Check if exam requires password
            if (!exam.RequirePassword)
            {
                return Ok(true);
            }
            
            // Validate the password
            bool isValid = exam.Password == passwordDto.Password;
            return Ok(isValid);
        }

        // POST: api/Exams/{id}/start-session
        [HttpPost("{id}/start-session")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<ExamSessionDTO>> StartExamSession(string id)
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Verify exam exists
            var exam = await _examService.GetByIdAsync(id);
            if (exam == null)
            {
                return NotFound("Bài kiểm tra không tồn tại");
            }
            
            // Check if exam is published
            if (exam.Status != "published")
            {
                return BadRequest("Bài kiểm tra chưa được công bố");
            }
            
            // Check if student can access this exam
            if (!await _examService.CanStudentAccessExamAsync(id, studentId))
            {
                return Forbid();
            }
            
            // Check if student already has an attempt
            var existingAttempt = await _examService.GetStudentExamAttemptAsync(id, studentId);
            if (existingAttempt != null)
            {
                // If there's an existing attempt, check if it's still in progress
                if (existingAttempt.Status == "in_progress")
                {
                    // Return the existing session
                    var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                    
                    // Remove [CORRECT] tags from option content before sending to frontend
                    foreach (var question in questionSet.Questions)
                    {
                        foreach (var option in question.Options)
                        {
                            option.Content = option.Content.Replace("[CORRECT]", "").Trim();
                        }
                    }
                    
                    return Ok(new ExamSessionDTO
                    {
                        AttemptId = existingAttempt.Id,
                        ExamId = id,
                        Title = exam.Title,
                        Description = exam.Description,
                        Duration = exam.Duration,
                        StartTime = existingAttempt.StartTime,
                        EndTime = existingAttempt.EndTime,
                        RemainingTime = exam.Duration - (int)Math.Ceiling((DateTime.UtcNow - existingAttempt.StartTime).TotalMinutes),
                        Questions = questionSet.Questions.Select(q => new ExamQuestionDTO
                        {
                            Id = q.Id,
                            Content = q.Content,
                            Type = q.Type,
                            Options = q.Options.Select(o => new ExamOptionDTO
                            {
                                Id = o.Id.ToString(),
                                Text = o.Content
                            }).ToList()
                        }).ToList(),
                        StudentAnswers = existingAttempt.Answers.Select(a => new ExamAnswerRequestDTO
                        {
                            QuestionId = a.QuestionId,
                            SelectedOptions = a.SelectedOptions,
                            EssayAnswer = a.EssayAnswer
                        }).ToList()
                    });
                }
                else
                {
                    return BadRequest("Bạn đã hoàn thành bài kiểm tra này rồi");
                }
            }
            
            // Create a new attempt
            var attempt = new ExamAttempt
            {
                ExamId = id,
                StudentId = studentId,
                StartTime = DateTime.UtcNow,
                Status = "in_progress"
            };
            
            // Get questions from the question set
            var questions = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
            if (questions == null || questions.Questions.Count == 0)
            {
                return BadRequest("Bài kiểm tra không có câu hỏi");
            }
            
            // Remove [CORRECT] tags from option content before sending to frontend
            foreach (var question in questions.Questions)
            {
                foreach (var option in question.Options)
                {
                    option.Content = option.Content.Replace("[CORRECT]", "").Trim();
                }
            }
            
            // Add empty answers for each question
            foreach (var question in questions.Questions)
            {
                attempt.Answers.Add(new ExamAnswer
                {
                    QuestionId = question.Id,
                    SelectedOptions = new List<int>(),
                    EssayAnswer = null,
                    IsCorrect = null
                });
            }
            
            // Save the attempt
            await _examService.CreateExamAttemptAsync(attempt);
            
            // Return session info
            return Ok(new ExamSessionDTO
            {
                AttemptId = attempt.Id,
                ExamId = id,
                Title = exam.Title,
                Description = exam.Description,
                Duration = exam.Duration,
                StartTime = attempt.StartTime,
                EndTime = null,
                RemainingTime = exam.Duration,
                Questions = questions.Questions.Select(q => new ExamQuestionDTO
                {
                    Id = q.Id,
                    Content = q.Content,
                    Type = q.Type,
                    Options = q.Options.Select(o => new ExamOptionDTO
                    {
                        Id = o.Id.ToString(),
                        Text = o.Content
                    }).ToList()
                }).ToList(),
                StudentAnswers = new List<ExamAnswerRequestDTO>()
            });
        }
        
        // PUT: api/Exams/{id}/save-answers
        [HttpPut("{id}/save-answers")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult> SaveExamAnswers(string id, ExamAnswersRequestDTO answersDto)
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Get the attempt
            var attempt = await _examService.GetExamAttemptByIdAsync(answersDto.AttemptId);
            if (attempt == null)
            {
                return NotFound("Phiên thi không tồn tại");
            }
            
            // Verify the attempt belongs to this exam and student
            if (attempt.ExamId != id || attempt.StudentId != studentId)
            {
                return Forbid();
            }
            
            // Check if the attempt is still in progress
            if (attempt.Status != "in_progress")
            {
                return BadRequest("Bài thi đã kết thúc");
            }
            
            // Update answers
            foreach (var answer in answersDto.Answers)
            {
                var existingAnswer = attempt.Answers.FirstOrDefault(a => a.QuestionId == answer.QuestionId);
                if (existingAnswer != null)
                {
                    existingAnswer.SelectedOptions = answer.SelectedOptions;
                    existingAnswer.EssayAnswer = answer.EssayAnswer;
                }
            }
            
            // Save the updated attempt
            await _examService.UpdateExamAttemptAsync(attempt);
            
            return Ok();
        }
        
        // POST: api/Exams/{id}/submit
        [HttpPost("{id}/submit")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<ExamResultDTO>> SubmitExam(string id, SubmitExamDTO submitDto)
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Get the attempt
            var attempt = await _examService.GetExamAttemptByIdAsync(submitDto.AttemptId);
            if (attempt == null)
            {
                return NotFound("Phiên thi không tồn tại");
            }
            
            // Verify the attempt belongs to this exam and student
            if (attempt.ExamId != id || attempt.StudentId != studentId)
            {
                return Forbid();
            }
            
            // Check if the attempt is still in progress
            if (attempt.Status != "in_progress")
            {
                return BadRequest("Bài thi đã kết thúc");
            }
            
            // Get the question set to check correct answers
            var exam = await _examService.GetByIdAsync(id);
            var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
            
            // Calculate score
            double totalScore = 0;
            double questionValue = 10.0 / questionSet.Questions.Count; // Total score is out of 10
            
            foreach (var answer in attempt.Answers)
            {
                var question = questionSet.Questions.FirstOrDefault(q => q.Id == answer.QuestionId);
                if (question == null)
                    continue;
                
                // Only auto-grade multiple choice questions
                if (question.Type == "single" || question.Type == "multiple")
                {
                    // Check if the selected options match the correct answers
                    bool isCorrect = false;
                    
                    if (question.Type == "single" && answer.SelectedOptions.Count == 1)
                    {
                        isCorrect = question.CorrectAnswers.Contains(answer.SelectedOptions[0]);
                    }
                    else if (question.Type == "multiple")
                    {
                        // For multiple choice, all correct options must be selected and no incorrect ones
                        isCorrect = question.CorrectAnswers.Count == answer.SelectedOptions.Count &&
                                    question.CorrectAnswers.All(answer.SelectedOptions.Contains);
                    }
                    
                    answer.IsCorrect = isCorrect;
                    if (isCorrect)
                    {
                        totalScore += questionValue;
                    }
                }
                else
                {
                    // Essay questions need manual grading
                    answer.IsCorrect = null;
                }
            }
            
            // Update the attempt
            attempt.EndTime = DateTime.UtcNow;
            attempt.Status = "completed";
            attempt.Score = Math.Round(totalScore, 2);
            
            // Save the completed attempt
            await _examService.UpdateExamAttemptAsync(attempt);
            
            // Return the result
            return Ok(new ExamResultDTO
            {
                Id = attempt.Id,
                StudentId = studentId,
                ExamId = id,
                Score = attempt.Score.Value,
                TotalQuestions = attempt.Answers.Count,
                CorrectAnswers = attempt.Answers.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value),
                StartTime = attempt.StartTime,
                EndTime = attempt.EndTime.Value,
                Duration = (int)Math.Ceiling((attempt.EndTime.Value - attempt.StartTime).TotalMinutes),
                Completed = true
            });
        }

        // GET: api/Exams/student-history
        [HttpGet("student-history")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<List<ExamHistoryDTO>>> GetStudentHistory()
        {
            try
            {
                // Lấy ID của học sinh đăng nhập
                var studentId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(studentId))
                {
                    return Unauthorized("Không tìm thấy thông tin học sinh.");
                }

                // Lấy lịch sử làm bài của học sinh
                var examAttempts = await _examService.GetStudentExamAttemptsAsync(studentId);
                
                // Tạo danh sách kết quả
                var examHistoryList = new List<ExamHistoryDTO>();
                
                foreach (var attempt in examAttempts)
                {
                    var exam = await _examService.GetByIdAsync(attempt.ExamId);
                    var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                    var examClass = exam.ClassId != null ? await _examService.GetClassAsync(exam.ClassId) : null;
                    
                    var historyItem = new ExamHistoryDTO
                    {
                        AttemptId = attempt.Id,
                        ExamId = exam.Id,
                        ExamTitle = exam.Title,
                        ClassName = examClass?.Name ?? "Chưa xác định",
                        StartTime = attempt.StartTime,
                        EndTime = attempt.EndTime,
                        Duration = exam.Duration,
                        Score = attempt.Score,
                        TotalQuestions = questionSet?.Questions.Count ?? 0,
                        CorrectAnswers = attempt.Answers?.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value) ?? 0,
                        Status = attempt.Status,
                        Completed = attempt.Status == "completed"
                    };
                    
                    examHistoryList.Add(historyItem);
                }
                
                return Ok(examHistoryList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi khi lấy lịch sử làm bài: {ex.Message}");
            }
        }

        [HttpGet("student/{studentId}/history")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<List<ExamHistoryDTO>>> GetStudentHistoryById(string studentId)
        {
            try
            {
                // Xác thực quyền giáo viên
                var teacherId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(teacherId))
                {
                    return Unauthorized("Không tìm thấy thông tin giáo viên.");
                }

                // Kiểm tra học sinh có tồn tại không
                var student = await _examService.GetStudentByIdAsync(studentId);
                if (student == null)
                {
                    return NotFound("Không tìm thấy thông tin học sinh.");
                }

                // Kiểm tra học sinh có thuộc lớp mà giáo viên dạy không (tùy chọn, phụ thuộc vào logic của ứng dụng)
                // Trong trường hợp này, chúng ta cho phép giáo viên xem lịch sử của bất kỳ học sinh nào

                // Lấy lịch sử làm bài của học sinh
                var examAttempts = await _examService.GetStudentExamAttemptsAsync(studentId);
                
                // Tạo danh sách kết quả
                var examHistoryList = new List<ExamHistoryDTO>();
                
                foreach (var attempt in examAttempts)
                {
                    var exam = await _examService.GetByIdAsync(attempt.ExamId);
                    var questionSet = await _examService.GetQuestionSetAsync(exam.QuestionSetId);
                    var examClass = exam.ClassId != null ? await _examService.GetClassAsync(exam.ClassId) : null;
                    
                    var historyItem = new ExamHistoryDTO
                    {
                        AttemptId = attempt.Id,
                        ExamId = exam.Id,
                        ExamTitle = exam.Title,
                        ClassName = examClass?.Name ?? "Chưa xác định",
                        StartTime = attempt.StartTime,
                        EndTime = attempt.EndTime,
                        Duration = exam.Duration,
                        Score = attempt.Score,
                        TotalQuestions = questionSet?.Questions.Count ?? 0,
                        CorrectAnswers = attempt.Answers?.Count(a => a.IsCorrect.HasValue && a.IsCorrect.Value) ?? 0,
                        Status = attempt.Status,
                        Completed = attempt.Status == "completed"
                    };
                    
                    examHistoryList.Add(historyItem);
                }
                
                return Ok(examHistoryList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Lỗi khi lấy lịch sử làm bài: {ex.Message}");
            }
        }
    }
} 