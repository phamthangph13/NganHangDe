using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace BackEnd.Models
{
    public class QuestionSet
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("title")]
        public string Title { get; set; }

        [BsonElement("subjectId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string SubjectId { get; set; }

        [BsonElement("gradeLevel")]
        public int GradeLevel { get; set; }

        [BsonElement("description")]
        public string Description { get; set; }

        [BsonElement("questions")]
        public List<Question> Questions { get; set; } = new List<Question>();

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
    
    public class Question
    {
        [BsonElement("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [BsonElement("content")]
        public string Content { get; set; }

        [BsonElement("type")]
        public string Type { get; set; } // "single", "multiple", or "essay"

        [BsonElement("options")]
        public List<Option> Options { get; set; } = new List<Option>();

        [BsonElement("correctAnswers")]
        public List<int> CorrectAnswers { get; set; } = new List<int>();

        [BsonElement("bloomLevel")]
        public string BloomLevel { get; set; } = string.Empty; // "Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao"
    }

    public class Option
    {
        [BsonElement("id")]
        public int Id { get; set; }

        [BsonElement("content")]
        public string Content { get; set; }
    }
}