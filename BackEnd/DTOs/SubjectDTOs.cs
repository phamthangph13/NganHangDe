using System;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class CreateSubjectDTO
    {
        [Required]
        public string Name { get; set; }

        [Required]
        public string Code { get; set; }

        public string Description { get; set; }

        [Required]
        [Range(1, 12, ErrorMessage = "Grade level must be between 1 and 12")]
        public int GradeLevel { get; set; }
    }

    public class UpdateSubjectDTO
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public string Description { get; set; }
        
        [Range(1, 12, ErrorMessage = "Grade level must be between 1 and 12")]
        public int? GradeLevel { get; set; }
    }

    public class SubjectResponseDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string Description { get; set; }
        public int GradeLevel { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
} 