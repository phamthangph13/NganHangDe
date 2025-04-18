using System;
using System.Collections.Generic;

namespace BackEnd.DTOs
{
    public class StudentWeaknessAnalysisRequestDTO
    {
        public string StudentId { get; set; }
    }

    public class StudentWeaknessAnalysisResponseDTO
    {
        public string StudentId { get; set; }
        public string StudentName { get; set; }
        public List<ExamWeaknessDTO> Exams { get; set; } = new List<ExamWeaknessDTO>();
        public List<WeaknessCategoryDTO> TopWeaknesses { get; set; } = new List<WeaknessCategoryDTO>();
        public string OverallAnalysis { get; set; }
        public string ImprovementSuggestions { get; set; }
    }

    public class ExamWeaknessDTO
    {
        public string ExamId { get; set; }
        public string ExamTitle { get; set; }
        public DateTime CompletedDate { get; set; }
        public double Score { get; set; }
        public int TotalQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public List<WrongAnswerDTO> WrongAnswers { get; set; } = new List<WrongAnswerDTO>();
        public List<EssayAnswerDTO> EssayAnswers { get; set; } = new List<EssayAnswerDTO>();
        public List<WeaknessCategoryDTO> WeaknessCategories { get; set; } = new List<WeaknessCategoryDTO>();
    }

    public class WrongAnswerDTO
    {
        public string QuestionId { get; set; }
        public string QuestionText { get; set; }
        public string CorrectAnswerText { get; set; }
        public string StudentAnswerText { get; set; }
    }

    public class EssayAnswerDTO
    {
        public string QuestionId { get; set; }
        public string QuestionText { get; set; }
        public string StudentAnswer { get; set; }
    }

    public class WeaknessCategoryDTO
    {
        public string Name { get; set; }
        public int PercentCorrect { get; set; }
        public string Description { get; set; }
        public string Recommendations { get; set; }
    }
} 