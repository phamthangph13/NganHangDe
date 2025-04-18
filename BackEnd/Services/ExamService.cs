using BackEnd.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace BackEnd.Services
{
    public class ExamService
    {
        private readonly IMongoCollection<Exam> _exams;
        private readonly IMongoCollection<ExamAttempt> _examAttempts;
        private readonly IMongoCollection<QuestionSet> _questionSets;
        private readonly IMongoCollection<Class> _classes;
        private readonly IMongoCollection<User> _users;
        private readonly IMongoCollection<ClassStudent> _classStudents;

        public ExamService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var client = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var database = client.GetDatabase(mongoDBSettings.Value.DatabaseName);
            
            _exams = database.GetCollection<Exam>(mongoDBSettings.Value.ExamsCollection);
            _examAttempts = database.GetCollection<ExamAttempt>(mongoDBSettings.Value.ExamAttemptsCollection);
            _questionSets = database.GetCollection<QuestionSet>(mongoDBSettings.Value.QuestionSetsCollection);
            _classes = database.GetCollection<Class>(mongoDBSettings.Value.ClassesCollection);
            _users = database.GetCollection<User>(mongoDBSettings.Value.UsersCollection);
            _classStudents = database.GetCollection<ClassStudent>(mongoDBSettings.Value.ClassStudentsCollection);
        }

        public async Task<List<Exam>> GetTeacherExamsAsync(string teacherId)
        {
            return await _exams.Find(e => e.TeacherId == teacherId).ToListAsync();
        }

        public async Task<Exam> GetByIdAsync(string id)
        {
            return await _exams.Find(e => e.Id == id).FirstOrDefaultAsync();
        }

        public async Task<QuestionSet> GetQuestionSetAsync(string questionSetId)
        {
            return await _questionSets.Find(qs => qs.Id == questionSetId).FirstOrDefaultAsync();
        }

        public async Task<Class> GetClassAsync(string classId)
        {
            return await _classes.Find(c => c.Id == classId).FirstOrDefaultAsync();
        }

        public async Task<User> GetUserAsync(string userId)
        {
            return await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        }

        public async Task<List<User>> GetSelectedStudentsAsync(List<string> studentIds)
        {
            var filter = Builders<User>.Filter.In(u => u.Id, studentIds);
            return await _users.Find(filter).ToListAsync();
        }

        public async Task<List<User>> GetClassStudentsAsync(string classId)
        {
            var studentIds = await _classStudents
                .Find(cs => cs.ClassId == classId)
                .Project(cs => cs.StudentId)
                .ToListAsync();

            var filter = Builders<User>.Filter.In(u => u.Id, studentIds);
            return await _users.Find(filter).ToListAsync();
        }

        public async Task<Exam> CreateAsync(Exam exam)
        {
            await _exams.InsertOneAsync(exam);
            return exam;
        }

        public async Task<bool> UpdateAsync(string id, Exam updatedExam)
        {
            updatedExam.UpdatedAt = DateTime.UtcNow;
            var result = await _exams.ReplaceOneAsync(e => e.Id == id, updatedExam);
            return result.IsAcknowledged && result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _exams.DeleteOneAsync(e => e.Id == id);
            return result.IsAcknowledged && result.DeletedCount > 0;
        }

        public async Task<bool> PublishExamAsync(string id, DateTime? publishDate = null)
        {
            var update = Builders<Exam>.Update
                .Set(e => e.Status, "published")
                .Set(e => e.PublishDate, publishDate ?? DateTime.UtcNow)
                .Set(e => e.UpdatedAt, DateTime.UtcNow);

            var result = await _exams.UpdateOneAsync(e => e.Id == id, update);
            return result.IsAcknowledged && result.ModifiedCount > 0;
        }

        public async Task<bool> CloseExamAsync(string id)
        {
            var update = Builders<Exam>.Update
                .Set(e => e.Status, "closed")
                .Set(e => e.UpdatedAt, DateTime.UtcNow);

            var result = await _exams.UpdateOneAsync(e => e.Id == id, update);
            return result.IsAcknowledged && result.ModifiedCount > 0;
        }

        public async Task<int> GetExamAttemptsCountAsync(string examId)
        {
            return (int)await _examAttempts.CountDocumentsAsync(a => a.ExamId == examId);
        }

        public async Task<double?> GetAverageScoreAsync(string examId)
        {
            var attempts = await _examAttempts
                .Find(a => a.ExamId == examId && a.Score.HasValue)
                .ToListAsync();

            if (attempts.Count == 0)
                return null;

            return attempts.Average(a => a.Score.Value);
        }

        public async Task<List<Exam>> GetStudentAvailableExamsAsync(string studentId)
        {
            // Get all exams with status "published" that are publicly accessible
            var publicExams = await _exams.Find(e => 
                e.Status == "published" && 
                e.AccessType == "public"
            ).ToListAsync();

            // Get all classes the student is enrolled in
            var enrolledClasses = await _classStudents
                .Find(cs => cs.StudentId == studentId)
                .Project(cs => cs.ClassId)
                .ToListAsync();

            // Get all exams for those classes
            var classExams = await _exams.Find(e =>
                e.Status == "published" &&
                e.AccessType == "class" &&
                enrolledClasses.Contains(e.ClassId)
            ).ToListAsync();

            // Get all exams where the student is explicitly selected
            var selectedExams = await _exams.Find(e =>
                e.Status == "published" &&
                e.AccessType == "selected" &&
                e.SelectedStudentIds.Contains(studentId)
            ).ToListAsync();

            // Combine all exams
            var allExams = publicExams.Concat(classExams).Concat(selectedExams).ToList();

            // Filter out exams the student has already attempted
            var attemptedExamIds = await _examAttempts
                .Find(a => a.StudentId == studentId)
                .Project(a => a.ExamId)
                .ToListAsync();

            return allExams.Where(e => !attemptedExamIds.Contains(e.Id)).ToList();
        }

        public async Task<bool> CanStudentAccessExamAsync(string examId, string studentId)
        {
            var exam = await GetByIdAsync(examId);
            if (exam == null || exam.Status != "published")
                return false;

            // Public exams are accessible to everyone
            if (exam.AccessType == "public")
                return true;

            // For class-based access, check if student is in the class
            if (exam.AccessType == "class")
            {
                var classEnrollment = await _classStudents
                    .Find(cs => cs.ClassId == exam.ClassId && cs.StudentId == studentId)
                    .FirstOrDefaultAsync();
                return classEnrollment != null;
            }

            // For selected students, check if student is in the list
            if (exam.AccessType == "selected")
            {
                return exam.SelectedStudentIds.Contains(studentId);
            }

            return false;
        }
        
        public async Task<List<ExamAttempt>> GetExamResultsAsync(string examId)
        {
            return await _examAttempts
                .Find(a => a.ExamId == examId)
                .ToListAsync();
        }
        
        public async Task<ExamAttempt> GetExamAttemptByIdAsync(string attemptId)
        {
            return await _examAttempts
                .Find(a => a.Id == attemptId)
                .FirstOrDefaultAsync();
        }
        
        public async Task<ExamAttempt> GetStudentExamAttemptAsync(string examId, string studentId)
        {
            return await _examAttempts
                .Find(a => a.ExamId == examId && a.StudentId == studentId)
                .FirstOrDefaultAsync();
        }
        
        public async Task<List<ExamAttempt>> GetStudentExamAttemptsAsync(string studentId)
        {
            return await _examAttempts
                .Find(a => a.StudentId == studentId)
                .ToListAsync();
        }
        
        public async Task<User> GetStudentByIdAsync(string studentId)
        {
            return await _users
                .Find(u => u.Id == studentId)
                .FirstOrDefaultAsync();
        }
        
        public async Task<ExamAttempt> CreateExamAttemptAsync(ExamAttempt attempt)
        {
            await _examAttempts.InsertOneAsync(attempt);
            return attempt;
        }
        
        public async Task<bool> UpdateExamAttemptAsync(ExamAttempt attempt)
        {
            var updateResult = await _examAttempts
                .ReplaceOneAsync(a => a.Id == attempt.Id, attempt);
                
            return updateResult.IsAcknowledged && updateResult.ModifiedCount > 0;
        }
    }
} 