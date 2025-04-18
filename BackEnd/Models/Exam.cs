using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace BackEnd.Models
{
    public class Exam
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("title")]
        public string Title { get; set; }

        [BsonElement("questionSetId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string QuestionSetId { get; set; }

        [BsonElement("description")]
        public string Description { get; set; }

        [BsonElement("duration")]
        public int Duration { get; set; } // Duration in minutes

        [BsonElement("accessType")]
        public string AccessType { get; set; } // "public", "class", "selected"

        [BsonElement("classId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ClassId { get; set; } // If accessType is "class" or "selected"

        [BsonElement("selectedStudentIds")]
        [BsonRepresentation(BsonType.ObjectId)]
        public List<string> SelectedStudentIds { get; set; } = new List<string>(); // If accessType is "selected"

        [BsonElement("status")]
        public string Status { get; set; } = "draft"; // "draft", "published", "closed"

        [BsonElement("publishDate")]
        public DateTime? PublishDate { get; set; }

        [BsonElement("teacherId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string TeacherId { get; set; }

        [BsonElement("password")]
        public string Password { get; set; } // Password for the exam (optional)

        [BsonElement("requirePassword")]
        public bool RequirePassword { get; set; } = false; // Whether the exam requires a password

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    
    public class ExamAttempt
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("examId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ExamId { get; set; }

        [BsonElement("studentId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string StudentId { get; set; }

        [BsonElement("startTime")]
        public DateTime StartTime { get; set; }

        [BsonElement("endTime")]
        public DateTime? EndTime { get; set; }

        [BsonElement("answers")]
        public List<ExamAnswer> Answers { get; set; } = new List<ExamAnswer>();

        [BsonElement("score")]
        public double? Score { get; set; }

        [BsonElement("status")]
        public string Status { get; set; } = "in_progress"; // "in_progress", "completed", "abandoned"
    }

    public class ExamAnswer
    {
        [BsonElement("questionId")]
        public string QuestionId { get; set; }

        [BsonElement("selectedOptions")]
        public List<int> SelectedOptions { get; set; } = new List<int>(); // For single/multiple choice

        [BsonElement("essayAnswer")]
        public string EssayAnswer { get; set; } // For essay questions

        [BsonElement("isCorrect")]
        public bool? IsCorrect { get; set; } // For automatically graded questions
    }
} 