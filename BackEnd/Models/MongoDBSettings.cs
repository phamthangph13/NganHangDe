namespace BackEnd.Models
{
    public class MongoDBSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string DatabaseName { get; set; } = string.Empty;
        public string UsersCollection { get; set; } = string.Empty;
        public string ExamsCollection { get; set; } = "Exams";
        public string ExamAttemptsCollection { get; set; } = "ExamAttempts";
        public string QuestionSetsCollection { get; set; } = "QuestionSets";
        public string ClassesCollection { get; set; } = "Classes";
        public string ClassStudentsCollection { get; set; } = "ClassStudents";
    }
} 