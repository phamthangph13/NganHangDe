using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BackEnd.Controllers
{
    [Route("api/class-students")]
    [ApiController]
    [Authorize]
    public class ClassStudentsController : ControllerBase
    {
        private readonly ClassService _classService;

        public ClassStudentsController(ClassService classService)
        {
            _classService = classService;
        }

        // GET: api/class-students?classId=xyz
        [HttpGet]
        [Authorize(Roles = "Teacher,Student")]
        public async Task<IActionResult> GetClassStudents([FromQuery] string classId)
        {
            if (string.IsNullOrEmpty(classId))
            {
                return BadRequest(new { message = "ClassId is required" });
            }

            var classInfo = await _classService.GetByIdAsync(classId);
            if (classInfo == null)
            {
                return NotFound(new { message = "Class not found" });
            }

            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            string userRole = User.FindFirstValue(ClaimTypes.Role);

            // If student, ensure they are part of the class
            if (userRole == "Student")
            {
                var studentClasses = await _classService.GetStudentClassesAsync(userId);
                if (!studentClasses.Any(c => c.Id == classId))
                {
                    return Forbid();
                }
            }
            // If teacher, ensure they own the class
            else if (userRole == "Teacher" && classInfo.TeacherId != userId)
            {
                return Forbid();
            }

            var studentInfoList = await _classService.GetStudentEnrollmentInfoAsync(classId);
            var students = studentInfoList.Select(s => new
            {
                id = s.Id,
                name = $"{s.FirstName} {s.LastName}",
                email = s.Email
            }).ToList();

            return Ok(students);
        }
    }
} 