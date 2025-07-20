using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public class QuestionSetService
    {
        private readonly IMongoCollection<QuestionSet> _questionSets;
        private readonly IMongoCollection<Subject> _subjects;

        public QuestionSetService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var client = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var database = client.GetDatabase(mongoDBSettings.Value.DatabaseName);
            _questionSets = database.GetCollection<QuestionSet>("QuestionSets");
            _subjects = database.GetCollection<Subject>("Subjects");
        }

        public async Task<List<QuestionSet>> GetAllAsync()
        {
            return await _questionSets.Find(set => true).ToListAsync();
        }

        public async Task<QuestionSetDTO> GetByIdAsync(string id)
        {
            var questionSet = await _questionSets.Find(set => set.Id == id).FirstOrDefaultAsync();
            if (questionSet == null)
                return null;

            // Find subject name
            var subject = await _subjects.Find(s => s.Id == questionSet.SubjectId).FirstOrDefaultAsync();
            var questionSetDTO = new QuestionSetDTO
            {
                Id = questionSet.Id,
                Title = questionSet.Title,
                Description = questionSet.Description,
                SubjectId = questionSet.SubjectId,
                SubjectName = subject?.Name ?? "Unknown Subject",
                GradeLevel = questionSet.GradeLevel,
                Questions = questionSet.Questions,
                QuestionCount = questionSet.Questions?.Count ?? 0,
                CreatedAt = questionSet.CreatedAt,
                UpdatedAt = questionSet.UpdatedAt
            };

            return questionSetDTO;
        }

        public async Task<List<QuestionSetDTO>> GetAllWithSubjectNamesAsync()
        {
            var questionSets = await _questionSets.Find(set => true).ToListAsync();
            var subjects = await _subjects.Find(subject => true).ToListAsync();

            var questionSetDTOs = questionSets.Select(qs => {
                var subject = subjects.FirstOrDefault(s => s.Id == qs.SubjectId);
                return new QuestionSetDTO
                {
                    Id = qs.Id,
                    Title = qs.Title,
                    Description = qs.Description,
                    SubjectId = qs.SubjectId,
                    SubjectName = subject?.Name ?? "Unknown Subject",
                    GradeLevel = qs.GradeLevel,
                    QuestionCount = qs.Questions?.Count ?? 0,
                    CreatedAt = qs.CreatedAt,
                    UpdatedAt = qs.UpdatedAt
                };
            }).ToList();

            return questionSetDTOs;
        }

        public async Task<QuestionSet> CreateAsync(CreateQuestionSetDTO createDto)
        {
            var questionSet = new QuestionSet
            {
                Title = createDto.Title,
                SubjectId = createDto.SubjectId,
                GradeLevel = createDto.GradeLevel,
                Description = createDto.Description,
                Questions = new List<Question>(),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            await _questionSets.InsertOneAsync(questionSet);
            return questionSet;
        }

        public async Task<QuestionSet> UpdateAsync(string id, UpdateQuestionSetDTO updateDto)
        {
            var filter = Builders<QuestionSet>.Filter.Eq(qs => qs.Id, id);
            var questionSet = await _questionSets.Find(filter).FirstOrDefaultAsync();
            
            if (questionSet == null)
                return null;
        
            // Update only provided fields
            if (!string.IsNullOrEmpty(updateDto.Title))
                questionSet.Title = updateDto.Title;
        
            if (!string.IsNullOrEmpty(updateDto.SubjectId))
                questionSet.SubjectId = updateDto.SubjectId;
        
            if (updateDto.GradeLevel.HasValue)
                questionSet.GradeLevel = updateDto.GradeLevel.Value;
        
            if (updateDto.Description != null)
                questionSet.Description = updateDto.Description;
        
            questionSet.UpdatedAt = DateTime.Now;
        
            await _questionSets.ReplaceOneAsync(filter, questionSet);
            return questionSet;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _questionSets.DeleteOneAsync(set => set.Id == id);
            return result.DeletedCount > 0;
        }

        public async Task<QuestionSet> AddQuestionAsync(string questionSetId, CreateQuestionDTO questionDto)
        {
            var filter = Builders<QuestionSet>.Filter.Eq(qs => qs.Id, questionSetId);
            var questionSet = await _questionSets.Find(filter).FirstOrDefaultAsync();
            
            if (questionSet == null)
                return null;

            if (questionSet.Questions == null)
                questionSet.Questions = new List<Question>();

            var question = new Question
            {
                Id = ObjectId.GenerateNewId().ToString(),
                Content = questionDto.Content,
                Type = questionDto.Type,
                CorrectAnswers = questionDto.CorrectAnswers ?? new List<int>(),
                BloomLevel = questionDto.BloomLevel ?? string.Empty
            };
            
            // Convert option DTOs to option models
            if (questionDto.Options != null)
            {
                question.Options = new List<Option>();
                for (int i = 0; i < questionDto.Options.Count; i++)
                {
                    question.Options.Add(new Option
                    {
                        Id = i,
                        Content = questionDto.Options[i].Content
                    });
                }
            }
            
            questionSet.Questions.Add(question);
            questionSet.UpdatedAt = DateTime.Now;

            await _questionSets.ReplaceOneAsync(filter, questionSet);
            return questionSet;
        }

        public async Task<QuestionSet> UpdateQuestionAsync(string questionSetId, string questionId, Question updatedQuestion)
        {
            var filter = Builders<QuestionSet>.Filter.Eq(qs => qs.Id, questionSetId);
            var questionSet = await _questionSets.Find(filter).FirstOrDefaultAsync();
            
            if (questionSet == null || questionSet.Questions == null)
                return null;

            var questionIndex = questionSet.Questions.FindIndex(q => q.Id == questionId);
            if (questionIndex == -1)
                return null;

            updatedQuestion.Id = questionId;
            questionSet.Questions[questionIndex] = updatedQuestion;
            questionSet.UpdatedAt = DateTime.Now;

            await _questionSets.ReplaceOneAsync(filter, questionSet);
            return questionSet;
        }

        public async Task<QuestionSet> DeleteQuestionAsync(string questionSetId, string questionId)
        {
            var filter = Builders<QuestionSet>.Filter.Eq(qs => qs.Id, questionSetId);
            var questionSet = await _questionSets.Find(filter).FirstOrDefaultAsync();
            
            if (questionSet == null || questionSet.Questions == null)
                return null;

            var questionIndex = questionSet.Questions.FindIndex(q => q.Id == questionId);
            if (questionIndex == -1)
                return null;

            questionSet.Questions.RemoveAt(questionIndex);
            questionSet.UpdatedAt = DateTime.Now;

            await _questionSets.ReplaceOneAsync(filter, questionSet);
            return questionSet;
        }

        // Get question sets with subject information
        public async Task<List<QuestionSetResponseDTO>> GetQuestionSetsWithSubjectInfo()
        {
            var questionSets = await GetAllAsync();
            var subjectIds = questionSets.Select(qs => qs.SubjectId).Distinct().ToList();
            
            // Get all subjects referenced by question sets in one query
            var subjects = await _subjects.Find(s => subjectIds.Contains(s.Id)).ToListAsync();
            var subjectDict = subjects.ToDictionary(s => s.Id);

            return questionSets.Select(qs => new QuestionSetResponseDTO
            {
                Id = qs.Id,
                Title = qs.Title,
                SubjectId = qs.SubjectId,
                SubjectName = subjectDict.ContainsKey(qs.SubjectId) ? subjectDict[qs.SubjectId].Name : "Unknown",
                GradeLevel = qs.GradeLevel,
                Description = qs.Description,
                CreatedAt = qs.CreatedAt,
                UpdatedAt = qs.UpdatedAt,
                QuestionCount = qs.Questions?.Count ?? 0
            }).ToList();
        }

        // Get detailed question set with subject information
        public async Task<QuestionSetDetailResponseDTO> GetQuestionSetDetail(string id)
        {
            var questionSet = await GetByIdAsync(id);
            if (questionSet == null)
                return null;

            var subject = await _subjects.Find(s => s.Id == questionSet.SubjectId).FirstOrDefaultAsync();

            var response = new QuestionSetDetailResponseDTO
            {
                Id = questionSet.Id,
                Title = questionSet.Title,
                SubjectId = questionSet.SubjectId,
                SubjectName = subject?.Name ?? "Unknown",
                GradeLevel = questionSet.GradeLevel,
                Description = questionSet.Description,
                CreatedAt = questionSet.CreatedAt,
                UpdatedAt = questionSet.UpdatedAt,
                QuestionCount = questionSet.Questions?.Count ?? 0,
                Questions = questionSet.Questions?.Select(q => new QuestionDTO
                {
                    Id = q.Id,
                    Content = q.Content,
                    Type = q.Type,
                    Options = q.Options?.Select(o => new QuestionOptionDTO
                    {
                        Id = o.Id,
                        Content = o.Content
                    }).ToList() ?? new List<QuestionOptionDTO>(),
                    CorrectAnswers = q.CorrectAnswers?.ToList() ?? new List<int>(),
                    BloomLevel = q.BloomLevel ?? string.Empty
                }).ToList() ?? new List<QuestionDTO>()
            };

            return response;
        }
    }
}