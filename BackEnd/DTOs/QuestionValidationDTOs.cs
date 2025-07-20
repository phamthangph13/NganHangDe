using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class QuestionValidationRequest
    {
        [Required]
        public string QuestionContent { get; set; } = string.Empty;
        
        [Required]
        public string QuestionType { get; set; } = string.Empty; // "single", "multiple", "essay"
        
        public List<string> Options { get; set; } = new List<string>();
        
        [Required]
        [Range(1, 12)]
        public int GradeLevel { get; set; }
        
        [Required]
        public string Subject { get; set; } = string.Empty;
    }
    
    public class QuestionValidationResponse
    {
        public bool IsValid { get; set; }
        public List<ValidationIssue> Issues { get; set; } = new List<ValidationIssue>();
        public string OverallAssessment { get; set; } = string.Empty;
        public string BloomLevel { get; set; } = string.Empty; // Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao
        public string BloomLevelJustification { get; set; } = string.Empty;
    }
    
    public class ValidationIssue
    {
        public string Type { get; set; } = string.Empty; // "level_mismatch", "redundant_text", "bloom_level_mismatch", "clarity_issue"
        public string Description { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty; // "low", "medium", "high"
        public string Suggestion { get; set; } = string.Empty;
    }
    
    public class DualGeminiQuestionRequest
    {
        [Required]
        public string Prompt { get; set; } = string.Empty;
        
        [Required]
        public string QuestionSetId { get; set; } = string.Empty;
        
        [Required]
        public string Type { get; set; } = "single";
        
        [Range(1, 10)]
        public int Count { get; set; } = 3;
        
        [Required]
        [Range(1, 12)]
        public int GradeLevel { get; set; }
        
        [Required]
        public string Subject { get; set; } = string.Empty;
    }
    
    public class DualGeminiQuestionResponse
    {
        public List<ValidatedQuestionResult> Questions { get; set; } = new List<ValidatedQuestionResult>();
        public int TotalGenerated { get; set; }
        public int ValidQuestions { get; set; }
        public int QuestionsWithIssues { get; set; }
    }
    
    public class ValidatedQuestionResult
    {
        public CreateQuestionDTO Question { get; set; } = new CreateQuestionDTO();
        public QuestionValidationResponse ValidationResult { get; set; } = new QuestionValidationResponse();
        public bool RequiresManualReview { get; set; }
    }
    
    public class BatchValidateQuestionsRequest
    {
        [Required]
        public List<CreateQuestionDTO> Questions { get; set; } = new List<CreateQuestionDTO>();
        
        [Required]
        [Range(1, 12)]
        public int GradeLevel { get; set; }
        
        [Required]
        public string SubjectId { get; set; } = string.Empty;
    }
}