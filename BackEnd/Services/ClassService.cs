using BackEnd.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public class ClassService
    {
        private readonly IMongoCollection<Class> _classes;
        private readonly IMongoCollection<ClassStudent> _classStudents;
        private readonly IMongoCollection<User> _users;
        private readonly Random _random = new Random();

        public ClassService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var database = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            _classes = database.GetCollection<Class>("Classes");
            _classStudents = database.GetCollection<ClassStudent>("ClassStudents");
            _users = database.GetCollection<User>("Users");
        }

        public async Task<List<Class>> GetAllAsync()
        {
            return await _classes.Find(c => true).ToListAsync();
        }

        public async Task<List<Class>> GetTeacherClassesAsync(string teacherId)
        {
            return await _classes.Find(c => c.TeacherId == teacherId).ToListAsync();
        }

        public async Task<List<Class>> GetByGradeAsync(int grade)
        {
            return await _classes.Find(c => c.Grade == grade).ToListAsync();
        }

        public async Task<List<Class>> GetTeacherClassesByGradeAsync(string teacherId, int grade)
        {
            return await _classes.Find(c => c.TeacherId == teacherId && c.Grade == grade).ToListAsync();
        }

        public async Task<Class> GetByIdAsync(string id)
        {
            return await _classes.Find(c => c.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Class> CreateAsync(Class newClass)
        {
            // Generate a unique class code if not provided
            if (string.IsNullOrEmpty(newClass.ClassCode))
            {
                newClass.ClassCode = GenerateUniqueClassCode();
            }

            newClass.CreatedAt = DateTime.UtcNow;
            await _classes.InsertOneAsync(newClass);
            return newClass;
        }

        public async Task<bool> UpdateAsync(string id, Class updatedClass)
        {
            var result = await _classes.ReplaceOneAsync(c => c.Id == id, updatedClass);
            return result.IsAcknowledged && result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            // First delete all enrollments for this class
            await _classStudents.DeleteManyAsync(cs => cs.ClassId == id);
            
            // Then delete the class
            var result = await _classes.DeleteOneAsync(c => c.Id == id);
            return result.IsAcknowledged && result.DeletedCount > 0;
        }

        public async Task<int> GetStudentCountAsync(string classId)
        {
            return (int)await _classStudents.CountDocumentsAsync(cs => cs.ClassId == classId);
        }

        public async Task<List<ClassStudent>> GetClassEnrollmentsAsync(string classId)
        {
            return await _classStudents.Find(cs => cs.ClassId == classId).ToListAsync();
        }

        public async Task<List<User>> GetStudentsInClassAsync(string classId)
        {
            var enrollments = await GetClassEnrollmentsAsync(classId);
            var studentIds = enrollments.Select(e => e.StudentId).ToList();

            if (!studentIds.Any())
            {
                return new List<User>();
            }

            return await _users
                .Find(u => studentIds.Contains(u.Id) && u.Role == "Student")
                .ToListAsync();
        }

        public async Task<List<StudentEnrollmentInfo>> GetStudentEnrollmentInfoAsync(string classId)
        {
            var enrollments = await GetClassEnrollmentsAsync(classId);
            var studentIds = enrollments.Select(e => e.StudentId).ToList();

            if (!studentIds.Any())
            {
                return new List<StudentEnrollmentInfo>();
            }

            var students = await _users
                .Find(u => studentIds.Contains(u.Id) && u.Role == "Student")
                .ToListAsync();

            return students.Select(s => {
                var enrollment = enrollments.FirstOrDefault(e => e.StudentId == s.Id);
                return new StudentEnrollmentInfo
                {
                    Id = s.Id,
                    FirstName = s.FirstName,
                    LastName = s.LastName,
                    Email = s.Email,
                    JoinDate = enrollment?.JoinDate ?? DateTime.MinValue
                };
            }).ToList();
        }

        public async Task<bool> AddStudentToClassAsync(string classId, string studentId)
        {
            // Check if student is already in the class
            var existingEnrollment = await _classStudents
                .Find(cs => cs.ClassId == classId && cs.StudentId == studentId)
                .FirstOrDefaultAsync();

            if (existingEnrollment != null)
            {
                return false; // Student already in class
            }

            var enrollment = new ClassStudent
            {
                ClassId = classId,
                StudentId = studentId,
                JoinDate = DateTime.UtcNow
            };

            await _classStudents.InsertOneAsync(enrollment);
            return true;
        }

        public async Task<bool> RemoveStudentFromClassAsync(string classId, string studentId)
        {
            var result = await _classStudents.DeleteOneAsync(
                cs => cs.ClassId == classId && cs.StudentId == studentId);
            return result.IsAcknowledged && result.DeletedCount > 0;
        }

        public async Task<string> RegenerateClassCodeAsync(string classId)
        {
            var classInfo = await GetByIdAsync(classId);
            if (classInfo == null)
            {
                return null;
            }

            string newCode = GenerateUniqueClassCode();
            classInfo.ClassCode = newCode;
            await UpdateAsync(classId, classInfo);

            return newCode;
        }

        public async Task<List<Class>> GetStudentClassesAsync(string studentId)
        {
            var enrollments = await _classStudents
                .Find(cs => cs.StudentId == studentId)
                .ToListAsync();

            var classIds = enrollments.Select(e => e.ClassId).ToList();

            if (!classIds.Any())
            {
                return new List<Class>();
            }

            return await _classes
                .Find(c => classIds.Contains(c.Id))
                .ToListAsync();
        }

        public async Task<List<ClassStudent>> GetStudentEnrollmentsAsync(string studentId)
        {
            return await _classStudents
                .Find(cs => cs.StudentId == studentId)
                .ToListAsync();
        }

        public async Task<List<User>> GetTeachersByIdsAsync(List<string> teacherIds)
        {
            if (teacherIds == null || !teacherIds.Any())
            {
                return new List<User>();
            }

            return await _users
                .Find(u => teacherIds.Contains(u.Id) && u.Role == "Teacher")
                .ToListAsync();
        }

        public async Task<ClassJoinResult> JoinClassAsync(string studentId, string classCode)
        {
            var result = new ClassJoinResult();

            // Find the class with the provided code
            var classInfo = await _classes
                .Find(c => c.ClassCode == classCode)
                .FirstOrDefaultAsync();

            if (classInfo == null)
            {
                result.ClassNotFound = true;
                return result;
            }

            // Check if student is already enrolled in this class
            var existingEnrollment = await _classStudents
                .Find(cs => cs.StudentId == studentId && cs.ClassId == classInfo.Id)
                .FirstOrDefaultAsync();

            if (existingEnrollment != null)
            {
                result.AlreadyJoined = true;
                return result;
            }

            try
            {
                // Create new enrollment
                var enrollment = new ClassStudent
                {
                    ClassId = classInfo.Id,
                    StudentId = studentId,
                    JoinDate = DateTime.UtcNow
                };

                await _classStudents.InsertOneAsync(enrollment);
                result.Success = true;
                return result;
            }
            catch (Exception)
            {
                // Failed to join
                return result;
            }
        }

        private string GenerateUniqueClassCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            bool isUnique = false;
            string code = "";

            while (!isUnique)
            {
                // Generate a 6-character code
                char[] codeArray = new char[6];
                for (int i = 0; i < 6; i++)
                {
                    codeArray[i] = chars[_random.Next(chars.Length)];
                }
                code = new string(codeArray);

                // Check if code is unique
                var existingClass = _classes
                    .Find(c => c.ClassCode == code)
                    .FirstOrDefaultAsync()
                    .Result;

                isUnique = (existingClass == null);
            }

            return code;
        }
    }

    public class StudentEnrollmentInfo
    {
        public string Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public DateTime JoinDate { get; set; }
    }

    public class ClassJoinResult
    {
        public bool Success { get; set; } = false;
        public bool ClassNotFound { get; set; } = false;
        public bool AlreadyJoined { get; set; } = false;
    }
} 