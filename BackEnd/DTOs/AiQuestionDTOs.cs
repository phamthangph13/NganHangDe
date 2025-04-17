using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class GenerateQuestionsRequest
    {
        [Required]
        public string Prompt { get; set; } = string.Empty;
        
        [Required]
        public string QuestionSetId { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = "single"; // "single", "multiple", or "essay"
        
        [Range(1, 10)]
        public int Count { get; set; } = 3;
    }
    
    public class GenerateQuestionsResponse
    {
        public List<CreateQuestionDTO> Questions { get; set; } = new List<CreateQuestionDTO>();
    }
} 