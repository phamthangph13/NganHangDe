using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BackEnd.Services
{
    public class GeminiService
    {
        private readonly GeminiSettings _settings;
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions;

        public GeminiService(IOptions<GeminiSettings> settings, IHttpClientFactory httpClientFactory)
        {
            _settings = settings.Value;
            _httpClient = httpClientFactory.CreateClient();
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
        }

        public async Task<List<CreateQuestionDTO>> GenerateQuestionsAsync(string prompt, string type, int count)
        {
            try
            {
                // Create a structured prompt for Gemini
                var structuredPrompt = CreateStructuredPrompt(prompt, type, count);
                
                // Prepare the request content
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = structuredPrompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 2048
                    }
                };

                // Set up the API URL
                string apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.ModelName}:generateContent?key={_settings.ApiKey}";
                
                // Send request to Gemini API
                var response = await _httpClient.PostAsJsonAsync(apiUrl, requestBody);
                
                // Ensure the request was successful
                response.EnsureSuccessStatusCode();
                
                // Parse the response
                var responseContent = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, _jsonOptions);
                
                // Extract the text content from the response
                var textContent = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                
                if (string.IsNullOrEmpty(textContent))
                {
                    throw new Exception("Failed to generate response from Gemini API");
                }
                
                // Parse the response to extract questions
                return ParseResponseToQuestions(textContent, type);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error generating questions with Gemini: {ex.Message}");
                throw;
            }
        }

        private string CreateStructuredPrompt(string userPrompt, string questionType, int count)
        {
            var questionTypeDescription = questionType switch
            {
                "single" => "multiple-choice questions with a single correct answer",
                "multiple" => "multiple-choice questions with one or more correct answers",
                "essay" => "open-ended essay questions",
                _ => "multiple-choice questions with a single correct answer"
            };

            return $@"
Generate {count} {questionTypeDescription} based on the following topic: {userPrompt}

For multiple-choice questions, please follow these rules:
1. Each question should have 4 possible answers labeled A, B, C, D.
2. Clearly indicate which answer(s) is/are correct by marking them with [CORRECT].
3. Format the response as a JSON array with questions having: 'content', 'type', 'options', and 'correctAnswers' fields.

For essay questions, simply provide the question content.

Return the result in a JSON format like this example:
[
  {{
    ""content"": ""What is 2+2?"",
    ""type"": ""{questionType}"",
    ""options"": [
      {{ ""content"": ""3"" }},
      {{ ""content"": ""4"" }},
      {{ ""content"": ""5"" }},
      {{ ""content"": ""6"" }}
    ],
    ""correctAnswers"": [{(questionType == "single" ? "1" : "1, 2")}]
  }}
]

Only return the JSON array, no other text.";
        }

        private List<CreateQuestionDTO> ParseResponseToQuestions(string response, string defaultType)
        {
            try
            {
                // Clean up the response if needed to isolate the JSON part
                var cleanedResponse = response;
                
                if (response.Contains("[") && response.Contains("]"))
                {
                    var startIdx = response.IndexOf("[");
                    var endIdx = response.LastIndexOf("]") + 1;
                    cleanedResponse = response.Substring(startIdx, endIdx - startIdx);
                }
                
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                
                // Try to parse the response as JSON
                var questions = JsonSerializer.Deserialize<List<CreateQuestionDTO>>(cleanedResponse, options);
                
                if (questions == null || questions.Count == 0)
                {
                    throw new Exception("No valid questions were generated");
                }
                
                // Validate and fix any issues with the generated questions
                foreach (var question in questions)
                {
                    // Set default type if missing
                    if (string.IsNullOrEmpty(question.Type))
                    {
                        question.Type = defaultType;
                    }
                    
                    // Ensure options and correctAnswers are initialized for non-essay questions
                    if (question.Type != "essay")
                    {
                        question.Options ??= new List<CreateOptionDTO>();
                        question.CorrectAnswers ??= new List<int>();
                        
                        // Ensure at least one correct answer for multiple choice questions
                        if (question.CorrectAnswers.Count == 0 && question.Options.Count > 0)
                        {
                            question.CorrectAnswers.Add(0); // Default first option as correct
                        }
                    }
                }
                
                return questions;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error parsing Gemini response: {ex.Message}");
                Console.WriteLine($"Raw response: {response}");
                
                // Fallback to a simple parsing approach if JSON deserialization fails
                return CreateFallbackQuestions(response, defaultType);
            }
        }

        private List<CreateQuestionDTO> CreateFallbackQuestions(string response, string questionType)
        {
            // Very simple fallback - create a single question with the raw response
            return new List<CreateQuestionDTO>
            {
                new CreateQuestionDTO
                {
                    Content = "Unable to properly parse AI response. Please try again with a simpler prompt.",
                    Type = questionType,
                    Options = questionType != "essay" ? new List<CreateOptionDTO>
                    {
                        new CreateOptionDTO { Content = "Option A" },
                        new CreateOptionDTO { Content = "Option B" },
                        new CreateOptionDTO { Content = "Option C" },
                        new CreateOptionDTO { Content = "Option D" }
                    } : null,
                    CorrectAnswers = questionType != "essay" ? new List<int> { 0 } : null
                }
            };
        }
    }

    // Helper classes for parsing the Gemini API response
    public class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate> Candidates { get; set; }
    }

    public class Candidate
    {
        [JsonPropertyName("content")]
        public Content Content { get; set; }
    }

    public class Content
    {
        [JsonPropertyName("parts")]
        public List<Part> Parts { get; set; }
    }

    public class Part
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }
} 