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
                QuestionCount = questionSet?.Questions.Count ?? 0
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

            var newExam = new Exam
            {
                Title = createExamDto.Title,
                QuestionSetId = createExamDto.QuestionSetId,
                Description = createExamDto.Description,
                Duration = createExamDto.Duration,
                AccessType = createExamDto.AccessType,
                ClassId = createExamDto.ClassId,
                SelectedStudentIds = createExamDto.SelectedStudentIds,
                Status = "draft",
                TeacherId = teacherId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var createdExam = await _examService.CreateAsync(newExam);

            var responseDto = new ExamResponseDTO
            {
                Id = createdExam.Id,
                Title = createdExam.Title,
                QuestionSetId = createdExam.QuestionSetId,
                QuestionSetTitle = questionSet.Title,
                Description = createdExam.Description,
                Duration = createdExam.Duration,
                AccessType = createdExam.AccessType,
                ClassId = createdExam.ClassId,
                SelectedStudentIds = createdExam.SelectedStudentIds,
                Status = createdExam.Status,
                CreatedAt = createdExam.CreatedAt,
                UpdatedAt = createdExam.UpdatedAt,
                QuestionCount = questionSet.Questions.Count,
                AttemptCount = 0
            };

            return CreatedAtAction(nameof(GetExam), new { id = createdExam.Id }, responseDto);
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

            var result = await _examService.UpdateAsync(id, exam);
            if (!result)
            {
                return BadRequest("Cập nhật đề thi thất bại");
            }

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
    }
} 