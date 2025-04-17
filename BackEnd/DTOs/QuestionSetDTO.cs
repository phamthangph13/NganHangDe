using BackEnd.Models;
using System;
using System.Collections.Generic;

namespace BackEnd.DTOs
{
    public class QuestionSetDTO
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string SubjectId { get; set; }
        public string SubjectName { get; set; }
        public int GradeLevel { get; set; }
        public List<Question> Questions { get; set; }
        public int QuestionCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
} 