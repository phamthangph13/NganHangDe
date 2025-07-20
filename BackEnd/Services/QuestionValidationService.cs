using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BackEnd.Services
{
    public class QuestionValidationService
    {
        private readonly GeminiSettings _settings;
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions;

        public QuestionValidationService(IOptions<GeminiSettings> settings, IHttpClientFactory httpClientFactory)
        {
            _settings = settings.Value;
            _httpClient = httpClientFactory.CreateClient();
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
        }

        public async Task<QuestionValidationResponse> ValidateQuestionAsync(QuestionValidationRequest request)
        {
            try
            {
                var validationPrompt = CreateValidationPrompt(request);
                
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = validationPrompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.2,
                        maxOutputTokens = 1024
                    }
                };

                string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.ModelName}:generateContent?key={_settings.ApiKey}";
                
                var response = await _httpClient.PostAsJsonAsync(apiUrl, requestBody);
                response.EnsureSuccessStatusCode();
                
                var responseContent = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<ValidationGeminiResponse>(responseContent, _jsonOptions);
                
                var textContent = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                
                if (string.IsNullOrEmpty(textContent))
                {
                    throw new Exception("Failed to get validation response from Gemini API");
                }
                
                return ParseValidationResponse(textContent);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error validating question with Gemini: {ex.Message}");
                throw;
            }
        }

        private string CreateValidationPrompt(QuestionValidationRequest request)
        {
            var gradeDescription = GetGradeDescription(request.GradeLevel);
            var optionsText = request.Options.Any() ? string.Join(", ", request.Options.Select((opt, idx) => $"{(char)('A' + idx)}. {opt}")) : "Không có lựa chọn (câu tự luận)";
            
            return $"Bạn là một chuyên gia giáo dục. Hãy đánh giá câu hỏi sau:\n\nCâu hỏi: {request.QuestionContent}\nLoại: {GetQuestionTypeDescription(request.QuestionType)}\nLựa chọn: {optionsText}\nCấp độ: {gradeDescription}\nMôn học: {request.Subject}\n\nHãy phân tích và đánh giá câu hỏi, bao gồm xác định mức độ Bloom taxonomy phù hợp:\n- \"Nhận biết\" (Remember): Ghi nhớ, nhận biết thông tin cơ bản\n- \"Thông hiểu\" (Understand): Hiểu và giải thích ý nghĩa\n- \"Vận dụng\" (Apply): Áp dụng kiến thức vào tình huống cụ thể\n- \"Vận dụng cao\" (Analyze/Evaluate/Create): Phân tích, đánh giá, sáng tạo\n\nHãy trả lời theo định dạng JSON:\n{{\"isValid\": true/false, \"issues\": [], \"overallAssessment\": \"đánh giá\", \"bloomLevel\": \"mức độ bloom\", \"bloomLevelJustification\": \"lý do chọn mức độ này\"}}";
        }

        private string GetGradeDescription(int gradeLevel)
        {
            return gradeLevel switch
            {
                1 => "học sinh lớp 1",
                2 => "học sinh lớp 2",
                3 => "học sinh lớp 3",
                4 => "học sinh lớp 4",
                5 => "học sinh lớp 5",
                6 => "học sinh lớp 6",
                7 => "học sinh lớp 7",
                8 => "học sinh lớp 8",
                9 => "học sinh lớp 9",
                10 => "học sinh lớp 10",
                11 => "học sinh lớp 11",
                12 => "học sinh lớp 12",
                _ => $"học sinh lớp {gradeLevel}"
            };
        }

        private string GetQuestionTypeDescription(string type)
        {
            return type switch
            {
                "single" => "Trắc nghiệm một đáp án",
                "multiple" => "Trắc nghiệm nhiều đáp án",
                "essay" => "Câu hỏi tự luận",
                _ => "Không xác định"
            };
        }

        private QuestionValidationResponse ParseValidationResponse(string responseText)
        {
            try
            {
                var jsonStart = responseText.IndexOf("{");
                var jsonEnd = responseText.LastIndexOf("}") + 1;
                
                if (jsonStart >= 0 && jsonEnd > jsonStart)
                {
                    var jsonPart = responseText.Substring(jsonStart, jsonEnd - jsonStart);
                    var result = JsonSerializer.Deserialize<QuestionValidationResponse>(jsonPart, _jsonOptions);
                    
                    if (result != null)
                    {
                        return result;
                    }
                }
                
                return ParseValidationResponseManually(responseText);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing validation response: {ex.Message}");
                return ParseValidationResponseManually(responseText);
            }
        }

        private QuestionValidationResponse ParseValidationResponseManually(string responseText)
        {
            var response = new QuestionValidationResponse
            {
                IsValid = !responseText.ToLower().Contains("vấn đề"),
                OverallAssessment = responseText.Length > 500 ? responseText.Substring(0, 500) + "..." : responseText
            };

            if (responseText.ToLower().Contains("quá khó"))
            {
                response.Issues.Add(new ValidationIssue
                {
                    Type = "level_mismatch",
                    Description = "Câu hỏi có thể quá khó",
                    Severity = "medium",
                    Suggestion = "Điều chỉnh độ khó"
                });
                response.IsValid = false;
            }

            return response;
        }
    }

    public class ValidationGeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<ValidationCandidate> Candidates { get; set; } = new List<ValidationCandidate>();
    }

    public class ValidationCandidate
    {
        [JsonPropertyName("content")]
        public ValidationContent Content { get; set; } = new ValidationContent();
    }

    public class ValidationContent
    {
        [JsonPropertyName("parts")]
        public List<ValidationPart> Parts { get; set; } = new List<ValidationPart>();
    }

    public class ValidationPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }
}