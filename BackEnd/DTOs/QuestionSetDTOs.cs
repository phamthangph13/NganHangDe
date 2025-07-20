using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class CreateQuestionSetDTO
    {
        [Required]
        public string Title { get; set; }

        [Required]
        public string SubjectId { get; set; }

        [Required]
        [Range(1, 12, ErrorMessage = "Grade level must be between 1 and 12")]
        public int GradeLevel { get; set; }

        public string Description { get; set; }
    }

    public class UpdateQuestionSetDTO
    {
        public string Title { get; set; }
        public string SubjectId { get; set; }
        
        [Range(1, 12, ErrorMessage = "Grade level must be between 1 and 12")]
        public int? GradeLevel { get; set; }
        
        public string Description { get; set; }
    }

    public class QuestionSetResponseDTO
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string SubjectId { get; set; }
        public string SubjectName { get; set; } // Include subject name for display
        public int GradeLevel { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int QuestionCount { get; set; } // Number of questions in the set
    }

    public class QuestionSetDetailResponseDTO : QuestionSetResponseDTO
    {
        public List<QuestionDTO> Questions { get; set; } = new List<QuestionDTO>();
    }

    public class QuestionDTO
    {
        public string Id { get; set; }
        public string Content { get; set; }
        public string Type { get; set; } // "single", "multiple", or "essay"
        public List<QuestionOptionDTO> Options { get; set; } = new List<QuestionOptionDTO>();
        public List<int> CorrectAnswers { get; set; } = new List<int>();
        public string BloomLevel { get; set; } = string.Empty;
    }

    public class QuestionOptionDTO
    {
        public int Id { get; set; }
        public string Content { get; set; }
    }

    public class CreateQuestionDTO
    {
        [Required]
        public string Content { get; set; }

        [Required]
        public string Type { get; set; } // "single", "multiple", or "essay"

        public List<CreateOptionDTO> Options { get; set; } = new List<CreateOptionDTO>();
        public List<int> CorrectAnswers { get; set; } = new List<int>();
        public string BloomLevel { get; set; } = string.Empty;
    }

    public class CreateOptionDTO
    {
        [Required]
        public string Content { get; set; }
    }

    public class UpdateQuestionDTO
    {
        public string Content { get; set; }
        public string Type { get; set; } // "single", "multiple", or "essay"
        public List<CreateOptionDTO> Options { get; set; }
        public List<int> CorrectAnswers { get; set; }
        public string BloomLevel { get; set; } = string.Empty;
    }
}