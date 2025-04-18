using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace BackEnd.Models
{
    public class ClassStudent
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("ClassId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ClassId { get; set; }

        [BsonElement("StudentId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string StudentId { get; set; }

        [BsonElement("JoinDate")]
        public DateTime JoinDate { get; set; } = DateTime.UtcNow;
        
        [BsonElement("Status")]
        public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Approved;
    }
    
    public enum EnrollmentStatus
    {
        Pending,
        Approved,
        Rejected
    }
} 