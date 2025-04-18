using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs
{
    public class ExamSessionDTO
    {
        public string AttemptId { get; set; }
        public string ExamId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public int Duration { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int RemainingTime { get; set; } // in minutes
        public List<ExamQuestionDTO> Questions { get; set; } = new List<ExamQuestionDTO>();
        public List<ExamAnswerRequestDTO> StudentAnswers { get; set; } = new List<ExamAnswerRequestDTO>();
    }

    public class ExamQuestionDTO
    {
        public string Id { get; set; }
        public string Content { get; set; }
        public string Type { get; set; } // "single", "multiple", or "essay"
        public List<ExamOptionDTO> Options { get; set; } = new List<ExamOptionDTO>();
    }

    public class ExamAnswerRequestDTO
    {
        public string QuestionId { get; set; }
        public List<int> SelectedOptions { get; set; } = new List<int>();
        public string EssayAnswer { get; set; }
    }

    public class ExamAnswersRequestDTO
    {
        [Required]
        public string AttemptId { get; set; }
        [Required]
        public List<ExamAnswerRequestDTO> Answers { get; set; } = new List<ExamAnswerRequestDTO>();
    }

    public class SubmitExamDTO
    {
        [Required]
        public string AttemptId { get; set; }
    }
} 