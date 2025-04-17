using BackEnd.DTOs;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BackEnd.Controllers
{
    [ApiController]
    [Route("api/dashboard/subjects")]
    [Authorize]
    public class SubjectsController : ControllerBase
    {
        private readonly SubjectService _subjectService;

        public SubjectsController(SubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SubjectResponseDTO>>> GetAll()
        {
            var subjects = await _subjectService.GetAllAsync();
            var response = subjects.Select(s => MapToResponseDTO(s));
            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SubjectResponseDTO>> GetById(string id)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid subject ID format" });

            var subject = await _subjectService.GetByIdAsync(id);
            if (subject == null)
                return NotFound();

            return Ok(MapToResponseDTO(subject));
        }

        [HttpPost]
        public async Task<ActionResult<SubjectResponseDTO>> Create(CreateSubjectDTO createDto)
        {
            // Check if subject code already exists
            bool codeExists = await _subjectService.CheckCodeExistsAsync(createDto.Code);
            if (codeExists)
                return BadRequest(new { message = "Subject code already exists" });

            var createdSubject = await _subjectService.CreateAsync(createDto);
            return CreatedAtAction(nameof(GetById), new { id = createdSubject.Id }, MapToResponseDTO(createdSubject));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<SubjectResponseDTO>> Update(string id, UpdateSubjectDTO updateDto)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid subject ID format" });

            // Check if the subject exists
            var subject = await _subjectService.GetByIdAsync(id);
            if (subject == null)
                return NotFound();

            // If code is being changed, check it doesn't conflict with existing codes
            if (!string.IsNullOrEmpty(updateDto.Code) && updateDto.Code != subject.Code)
            {
                bool codeExists = await _subjectService.CheckCodeExistsAsync(updateDto.Code, id);
                if (codeExists)
                    return BadRequest(new { message = "Subject code already exists" });
            }

            var updatedSubject = await _subjectService.UpdateAsync(id, updateDto);
            return Ok(MapToResponseDTO(updatedSubject));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            // Validate id format
            if (string.IsNullOrEmpty(id) || !ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid subject ID format" });

            var subject = await _subjectService.GetByIdAsync(id);
            if (subject == null)
                return NotFound();

            bool result = await _subjectService.DeleteAsync(id);
            if (result)
                return NoContent();
            else
                return StatusCode(500, new { message = "An error occurred while deleting the subject" });
        }

        private SubjectResponseDTO MapToResponseDTO(Subject subject)
        {
            return new SubjectResponseDTO
            {
                Id = subject.Id,
                Name = subject.Name,
                Code = subject.Code,
                Description = subject.Description,
                GradeLevel = subject.GradeLevel,
                CreatedAt = subject.CreatedAt,
                UpdatedAt = subject.UpdatedAt
            };
        }
    }
} 