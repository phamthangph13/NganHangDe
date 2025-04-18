using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace BackEnd.Models
{
    public class Class
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("Name")]
        public string Name { get; set; }

        [BsonElement("Grade")]
        public int Grade { get; set; }

        [BsonElement("ClassCode")]
        public string ClassCode { get; set; }

        [BsonElement("CreatedAt")]
        public DateTime CreatedAt { get; set; }
        
        [BsonElement("TeacherId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string TeacherId { get; set; }
        
        [BsonElement("AccessType")]
        public ClassAccessType AccessType { get; set; } = ClassAccessType.Direct;
    }
    
    public enum ClassAccessType
    {
        Direct,     // Join with class code only
        Approval    // Join with class code and wait for teacher approval
    }
} 