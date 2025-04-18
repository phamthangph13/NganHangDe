using BackEnd.DTOs;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
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
    public class ClassesController : ControllerBase
    {
        private readonly ClassService _classService;
        private readonly Random _random = new Random();

        public ClassesController(ClassService classService)
        {
            _classService = classService;
        }

        // GET: api/Classes
        [HttpGet]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<IEnumerable<ClassResponseDTO>>> GetClasses()
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var classes = await _classService.GetTeacherClassesAsync(teacherId);

            var responseDtos = classes.Select(cls => new ClassResponseDTO
            {
                Id = cls.Id,
                Name = cls.Name,
                Grade = cls.Grade,
                ClassCode = cls.ClassCode,
                CreatedAt = cls.CreatedAt,
                StudentCount = _classService.GetStudentCountAsync(cls.Id).Result,
                AccessType = cls.AccessType
            }).ToList();

            return Ok(responseDtos);
        }

        // GET: api/Classes/grade/10
        [HttpGet("grade/{grade}")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<IEnumerable<ClassResponseDTO>>> GetClassesByGrade(int grade)
        {
            if (grade < 1 || grade > 12)
            {
                return BadRequest("Khối phải từ 1 đến 12");
            }

            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var classes = await _classService.GetTeacherClassesByGradeAsync(teacherId, grade);

            var responseDtos = classes.Select(cls => new ClassResponseDTO
            {
                Id = cls.Id,
                Name = cls.Name,
                Grade = cls.Grade,
                ClassCode = cls.ClassCode,
                CreatedAt = cls.CreatedAt,
                StudentCount = _classService.GetStudentCountAsync(cls.Id).Result,
                AccessType = cls.AccessType
            }).ToList();

            return Ok(responseDtos);
        }

        // GET: api/Classes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClassDetailDTO>> GetClass(string id)
        {
            var cls = await _classService.GetByIdAsync(id);

            if (cls == null)
            {
                return NotFound();
            }

            // Get students in this class
            var studentDetailsList = await _classService.GetStudentEnrollmentInfoAsync(id);
            
            var responseDto = new ClassDetailDTO
            {
                Id = cls.Id,
                Name = cls.Name,
                Grade = cls.Grade,
                ClassCode = cls.ClassCode,
                CreatedAt = cls.CreatedAt,
                AccessType = cls.AccessType,
                Students = studentDetailsList.Select(s => new StudentEnrollmentDTO
                {
                    Id = s.Id,
                    Name = $"{s.FirstName} {s.LastName}",
                    Email = s.Email,
                    JoinDate = s.JoinDate,
                    Status = s.Status
                }).ToList(),
                TeacherId = cls.TeacherId
            };

            return Ok(responseDto);
        }

        // POST: api/Classes
        [HttpPost]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<ClassResponseDTO>> CreateClass(CreateClassDTO createClassDto)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var newClass = new Class
            {
                Name = createClassDto.Name,
                Grade = createClassDto.Grade,
                TeacherId = teacherId,
                AccessType = createClassDto.AccessType
            };

            var createdClass = await _classService.CreateAsync(newClass);

            var responseDto = new ClassResponseDTO
            {
                Id = createdClass.Id,
                Name = createdClass.Name,
                Grade = createdClass.Grade,
                ClassCode = createdClass.ClassCode,
                CreatedAt = createdClass.CreatedAt,
                StudentCount = 0,
                AccessType = createdClass.AccessType
            };

            return CreatedAtAction(nameof(GetClass), new { id = createdClass.Id }, responseDto);
        }

        // PUT: api/Classes/5
        [HttpPut("{id}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> UpdateClass(string id, UpdateClassDTO updateClassDto)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var existingClass = await _classService.GetByIdAsync(id);
                
            if (existingClass == null || existingClass.TeacherId != teacherId)
            {
                return NotFound();
            }

            existingClass.Name = updateClassDto.Name;
            existingClass.Grade = updateClassDto.Grade;
            existingClass.AccessType = updateClassDto.AccessType;

            var result = await _classService.UpdateAsync(id, existingClass);
                
            if (!result)
            {
                return BadRequest("Cập nhật lớp học thất bại");
            }

            return NoContent();
        }

        // DELETE: api/Classes/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> DeleteClass(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var existingClass = await _classService.GetByIdAsync(id);
                
            if (existingClass == null || existingClass.TeacherId != teacherId)
            {
                return NotFound();
            }

            // Delete class
            var result = await _classService.DeleteAsync(id);
                
            if (!result)
            {
                return BadRequest("Xóa lớp học thất bại");
            }

            // Delete all enrollments for this class
            // This logic can be added to the ClassService

            return NoContent();
        }

        // GET: api/classes/student
        [HttpGet("student")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<IEnumerable<StudentClassDTO>>> GetStudentClasses()
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // Get all classes the student is enrolled in
            var classes = await _classService.GetStudentClassesAsync(studentId);
            var studentEnrollments = await _classService.GetStudentEnrollmentsAsync(studentId);
            
            // Get teacher names for each class
            var teacherIds = classes.Select(c => c.TeacherId).Distinct().ToList();
            var teachers = await _classService.GetTeachersByIdsAsync(teacherIds);

            var classDTOs = classes.Select(c => {
                var teacher = teachers.FirstOrDefault(t => t.Id == c.TeacherId);
                var teacherName = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : "Unknown";
                var enrollment = studentEnrollments.FirstOrDefault(e => e.ClassId == c.Id);
                
                return new StudentClassDTO {
                    Id = c.Id,
                    Name = c.Name,
                    Grade = c.Grade,
                    JoinDate = enrollment?.JoinDate ?? DateTime.MinValue,
                    TeacherName = teacherName,
                    Status = enrollment?.Status ?? EnrollmentStatus.Approved
                };
            }).ToList();

            return Ok(classDTOs);
        }

        // POST: api/classes/join
        [HttpPost("join")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> JoinClass([FromBody] JoinClassRequest request)
        {
            if (string.IsNullOrEmpty(request.ClassCode))
            {
                return BadRequest(new { message = "Mã lớp học không được để trống" });
            }

            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _classService.JoinClassAsync(studentId, request.ClassCode);

            if (result.Success)
            {
                if (result.RequiresApproval)
                {
                    return Ok(new { message = "Yêu cầu tham gia lớp học đã được gửi. Vui lòng chờ giáo viên phê duyệt." });
                }
                return Ok(new { message = "Tham gia lớp học thành công" });
            }
            else if (result.ClassNotFound)
            {
                return NotFound(new { message = "Không tìm thấy lớp học với mã này" });
            }
            else if (result.AlreadyJoined)
            {
                return BadRequest(new { message = "Bạn đã tham gia lớp học này rồi" });
            }
            
            return BadRequest(new { message = "Không thể tham gia lớp học. Vui lòng thử lại sau." });
        }

        // DELETE: api/classes/leave/{classId}
        [HttpDelete("leave/{classId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> LeaveClass(string classId)
        {
            string studentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var result = await _classService.RemoveStudentFromClassAsync(classId, studentId);

            if (result)
            {
                return Ok(new { message = "Đã rời khỏi lớp học" });
            }
            
            return NotFound(new { message = "Bạn không tham gia lớp học này" });
        }

        // POST: api/classes/{id}/regenerate-code
        [HttpPost("{id}/regenerate-code")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<object>> RegenerateClassCode(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var classInfo = await _classService.GetByIdAsync(id);
                
            if (classInfo == null || classInfo.TeacherId != teacherId)
            {
                return NotFound(new { message = "Không tìm thấy lớp học" });
            }

            // Generate a new unique class code
            string newClassCode = await _classService.RegenerateClassCodeAsync(id);
            
            if (newClassCode == null)
            {
                return BadRequest(new { message = "Không thể tạo mã lớp mới" });
            }
                
            return Ok(new { 
                classCode = newClassCode,
                message = "Đã tạo mã lớp mới" 
            });
        }

        // DELETE: api/classes/{id}/students/{studentId}
        [HttpDelete("{classId}/students/{studentId}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> RemoveStudentFromClass(string classId, string studentId)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Verify this is the teacher's class
            var classInfo = await _classService.GetByIdAsync(classId);
                
            if (classInfo == null || classInfo.TeacherId != teacherId)
            {
                return NotFound(new { message = "Không tìm thấy lớp học" });
            }

            var result = await _classService.RemoveStudentFromClassAsync(classId, studentId);

            if (result)
            {
                return Ok(new { message = "Đã xóa học sinh khỏi lớp học" });
            }
            
            return NotFound(new { message = "Học sinh không tham gia lớp học này" });
        }

        // POST: api/classes/{classId}/approve-student/{studentId}
        [HttpPost("{classId}/approve-student/{studentId}")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> ApproveStudentEnrollment(string classId, string studentId, [FromBody] ApproveStudentRequest request)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Verify this is the teacher's class
            var classInfo = await _classService.GetByIdAsync(classId);
                
            if (classInfo == null || classInfo.TeacherId != teacherId)
            {
                return NotFound(new { message = "Không tìm thấy lớp học" });
            }

            var result = await _classService.ApproveStudentEnrollmentAsync(classId, studentId, request.Approve);

            if (result)
            {
                return Ok(new { 
                    message = request.Approve 
                        ? "Đã phê duyệt yêu cầu tham gia lớp học" 
                        : "Đã từ chối yêu cầu tham gia lớp học"
                });
            }
            
            return NotFound(new { message = "Không tìm thấy yêu cầu tham gia lớp học này" });
        }
        
        // GET: api/classes/{id}/pending-students
        [HttpGet("{id}/pending-students")]
        [Authorize(Roles = "Teacher")]
        public async Task<ActionResult<IEnumerable<StudentEnrollmentDTO>>> GetPendingStudents(string id)
        {
            string teacherId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Verify this is the teacher's class
            var classInfo = await _classService.GetByIdAsync(id);
                
            if (classInfo == null || classInfo.TeacherId != teacherId)
            {
                return NotFound(new { message = "Không tìm thấy lớp học" });
            }

            var pendingEnrollments = await _classService.GetPendingEnrollmentsAsync(id);
            
            if (!pendingEnrollments.Any())
            {
                return new List<StudentEnrollmentDTO>();
            }
            
            var studentIds = pendingEnrollments.Select(e => e.StudentId).ToList();
            var students = await _classService.GetStudentsByIdsAsync(studentIds);
            
            var pendingStudents = students
                .Select(s => {
                    var enrollment = pendingEnrollments.FirstOrDefault(e => e.StudentId == s.Id);
                    return new StudentEnrollmentDTO
                    {
                        Id = s.Id,
                        Name = $"{s.FirstName} {s.LastName}",
                        Email = s.Email,
                        JoinDate = enrollment?.JoinDate ?? DateTime.MinValue,
                        Status = EnrollmentStatus.Pending
                    };
                }).ToList();
                
            return Ok(pendingStudents);
        }
    }

    public class JoinClassRequest
    {
        public string ClassCode { get; set; }
    }

    public class StudentClassDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Grade { get; set; }
        public DateTime JoinDate { get; set; }
        public string TeacherName { get; set; }
        public EnrollmentStatus Status { get; set; }
    }

    public class StudentEnrollmentDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public DateTime JoinDate { get; set; }
        public EnrollmentStatus Status { get; set; }
    }

    public class ClassDetailDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Grade { get; set; }
        public string ClassCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public string TeacherId { get; set; }
        public ClassAccessType AccessType { get; set; }
        public List<StudentEnrollmentDTO> Students { get; set; }
    }

    public class ClassResponseDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public int Grade { get; set; }
        public string ClassCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public int StudentCount { get; set; }
        public ClassAccessType AccessType { get; set; }
    }

    public class CreateClassDTO
    {
        public string Name { get; set; }
        public int Grade { get; set; }
        public ClassAccessType AccessType { get; set; } = ClassAccessType.Direct;
    }

    public class UpdateClassDTO
    {
        public string Name { get; set; }
        public int Grade { get; set; }
        public ClassAccessType AccessType { get; set; }
    }

    public class ApproveStudentRequest
    {
        public bool Approve { get; set; } = true;
    }
} 