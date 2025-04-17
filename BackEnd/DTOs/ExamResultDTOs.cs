using System;
using System.Collections.Generic;

namespace BackEnd.DTOs
{
    public class ExamResultDTO
    {
        public string Id { get; set; }
        public string StudentId { get; set; }
        public string StudentName { get; set; }
        public string ExamId { get; set; }
        public double? Score { get; set; }
        public int TotalQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int Duration { get; set; } // in minutes
        public bool Completed { get; set; }
    }

    public class StudentResultDetailDTO : ExamResultDTO
    {
        public List<StudentAnswerDTO> Answers { get; set; }
    }

    public class StudentAnswerDTO
    {
        public string QuestionId { get; set; }
        public string QuestionText { get; set; }
        public string CorrectOptionId { get; set; }
        public string SelectedOptionId { get; set; }
        public bool IsCorrect { get; set; }
        public List<ExamOptionDTO> Options { get; set; }
    }

    public class ExamOptionDTO
    {
        public string Id { get; set; }
        public string Text { get; set; }
    }
} 