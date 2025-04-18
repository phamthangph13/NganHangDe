using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class CreateExamDTO
    {
        [Required]
        public string Title { get; set; }

        [Required]
        public string QuestionSetId { get; set; }

        public string Description { get; set; }

        [Required]
        [Range(1, 300)]
        public int Duration { get; set; } // Duration in minutes

        [Required]
        [RegularExpression("^(public|class|selected)$", ErrorMessage = "AccessType must be 'public', 'class', or 'selected'")]
        public string AccessType { get; set; } // "public", "class", "selected"

        public string ClassId { get; set; } // Required if accessType is "class" or "selected"

        public List<string> SelectedStudentIds { get; set; } = new List<string>(); // Required if accessType is "selected"
        
        public bool RequirePassword { get; set; } = false; // Whether the exam requires a password
        
        public string Password { get; set; } // Password for the exam (optional)
    }

    public class UpdateExamDTO
    {
        public string Title { get; set; }

        public string Description { get; set; }

        [Range(1, 300)]
        public int? Duration { get; set; }

        [RegularExpression("^(public|class|selected)$", ErrorMessage = "AccessType must be 'public', 'class', or 'selected'")]
        public string AccessType { get; set; }

        public string ClassId { get; set; }

        public List<string> SelectedStudentIds { get; set; }
        
        public bool? RequirePassword { get; set; }
        
        public string Password { get; set; }
    }

    public class ExamResponseDTO
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string QuestionSetId { get; set; }
        public string QuestionSetTitle { get; set; }
        public string Description { get; set; }
        public int Duration { get; set; }
        public string AccessType { get; set; }
        public string ClassId { get; set; }
        public string ClassName { get; set; }
        public List<string> SelectedStudentIds { get; set; }
        public string Status { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int QuestionCount { get; set; }
        public int AttemptCount { get; set; }
        public double? AverageScore { get; set; }
        public bool RequirePassword { get; set; }
        public string ExamLink { get; set; }
    }

    public class PublishExamDTO
    {
        public DateTime? PublishDate { get; set; } // If null, publish immediately
    }

    public class ExamDetailDTO
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string QuestionSetId { get; set; }
        public string QuestionSetTitle { get; set; }
        public string Description { get; set; }
        public int Duration { get; set; }
        public string AccessType { get; set; }
        public string ClassId { get; set; }
        public string ClassName { get; set; }
        public List<StudentBriefDTO> SelectedStudents { get; set; } = new List<StudentBriefDTO>();
        public string Status { get; set; }
        public DateTime? PublishDate { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int QuestionCount { get; set; }
        public bool RequirePassword { get; set; }
        public string ExamLink { get; set; }
    }

    public class StudentBriefDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
    }

    public class ValidationResultDTO
    {
        public bool CanAccess { get; set; }
        public string Message { get; set; }
        public ExamBriefDTO Exam { get; set; }
    }

    public class ExamBriefDTO
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public int Duration { get; set; }
        public bool RequirePassword { get; set; }
    }

    public class ExamPasswordDTO
    {
        [Required]
        public string Password { get; set; }
    }
} 