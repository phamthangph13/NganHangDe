using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public class SubjectService
    {
        private readonly IMongoCollection<Subject> _subjects;

        public SubjectService(IOptions<MongoDBSettings> mongoDBSettings)
        {
            var mongoClient = new MongoClient(mongoDBSettings.Value.ConnectionString);
            var database = mongoClient.GetDatabase(mongoDBSettings.Value.DatabaseName);
            _subjects = database.GetCollection<Subject>("Subjects");
        }

        public async Task<List<Subject>> GetAllAsync()
        {
            return await _subjects.Find(_ => true).ToListAsync();
        }

        public async Task<Subject> GetByIdAsync(string id)
        {
            // Check if the id is a valid ObjectId
            if (!ObjectId.TryParse(id, out _))
                return null;
                
            return await _subjects.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Subject> CreateAsync(CreateSubjectDTO subjectDto)
        {
            var subject = new Subject
            {
                Name = subjectDto.Name,
                Code = subjectDto.Code,
                Description = subjectDto.Description,
                GradeLevel = subjectDto.GradeLevel,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            await _subjects.InsertOneAsync(subject);
            return subject;
        }

        public async Task<Subject> UpdateAsync(string id, UpdateSubjectDTO updateDto)
        {
            var subject = await GetByIdAsync(id);
            if (subject == null)
                return null;

            var update = Builders<Subject>.Update;
            var updateDefinitions = new List<UpdateDefinition<Subject>>();

            if (!string.IsNullOrEmpty(updateDto.Name))
                updateDefinitions.Add(update.Set(s => s.Name, updateDto.Name));

            if (!string.IsNullOrEmpty(updateDto.Code))
                updateDefinitions.Add(update.Set(s => s.Code, updateDto.Code));

            if (updateDto.Description != null)
                updateDefinitions.Add(update.Set(s => s.Description, updateDto.Description));

            if (updateDto.GradeLevel.HasValue)
                updateDefinitions.Add(update.Set(s => s.GradeLevel, updateDto.GradeLevel.Value));

            updateDefinitions.Add(update.Set(s => s.UpdatedAt, DateTime.Now));

            var combinedUpdate = update.Combine(updateDefinitions);
            await _subjects.UpdateOneAsync(s => s.Id == id, combinedUpdate);

            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(string id)
        {
            // Check if the id is a valid ObjectId
            if (!ObjectId.TryParse(id, out _))
                return false;
                
            var result = await _subjects.DeleteOneAsync(s => s.Id == id);
            return result.DeletedCount > 0;
        }

        public async Task<bool> CheckCodeExistsAsync(string code, string excludeId = null)
        {
            var filter = Builders<Subject>.Filter.Eq(s => s.Code, code);
            
            if (!string.IsNullOrEmpty(excludeId) && ObjectId.TryParse(excludeId, out _))
                filter &= Builders<Subject>.Filter.Ne(s => s.Id, excludeId);
                
            return await _subjects.CountDocumentsAsync(filter) > 0;
        }
    }
} 