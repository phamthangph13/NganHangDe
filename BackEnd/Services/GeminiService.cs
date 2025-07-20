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

            // Check if the prompt is related to foreign language learning
            bool isForeignLanguage = IsRelatedToForeignLanguage(userPrompt);
            string targetLanguage = ExtractTargetLanguage(userPrompt);
            
            // Base prompt structure
            var basePrompt = $@"
Generate {count} {questionTypeDescription} based on the following topic: {userPrompt}

For multiple-choice questions, please follow these rules:
1. Each question should have 4 possible answers.
2. Use the 'correctAnswers' array to indicate which option indices are correct (0-based indexing).
3. Format the response as a JSON array with questions having: 'content', 'type', 'options', 'correctAnswers', and 'bloomLevel' fields.
4. For bloomLevel, assign one of these Vietnamese Bloom taxonomy levels based on the cognitive complexity:
   - ""Nhận biết"" (Remember): Basic recall of facts
   - ""Thông hiểu"" (Understand): Comprehension and explanation
   - ""Vận dụng"" (Apply): Application of knowledge
   - ""Vận dụng cao"" (Analyze/Evaluate/Create): Higher-order thinking

For essay questions, simply provide the question content and bloomLevel.

Return the result in a JSON format like this example:
[
  {{
    ""content"": ""What is 2+2?"",
    ""type"": ""{questionType}"",
    ""bloomLevel"": ""Nhận biết"",
    ""options"": [
      {{ ""content"": ""3"" }},
      {{ ""content"": ""4"" }},
      {{ ""content"": ""5"" }},
      {{ ""content"": ""6"" }}
    ],
    ""correctAnswers"": [{(questionType == "single" ? "1" : "1, 2")}]
  }}
]";

            // If it's a foreign language subject, use the target language for content
            if (isForeignLanguage)
            {
                return basePrompt + $@"

IMPORTANT: All content in the response (questions and options) must be in {targetLanguage} language only. 
Only return the JSON array, no other text.";
            }
            else
            {
                return basePrompt + @"

IMPORTANT: All content in the response must be in Vietnamese language. 
Only return the JSON array, no other text.";
            }
        }

        private bool IsRelatedToForeignLanguage(string prompt)
        {
            // Check if the prompt mentions common foreign languages or language teaching keywords
            string lowerPrompt = prompt.ToLowerInvariant();
            string[] languageKeywords = new[] 
            { 
                "english", "tiếng anh", 
                "german", "tiếng đức", 
                "french", "tiếng pháp", 
                "chinese", "tiếng trung", 
                "japanese", "tiếng nhật", 
                "korean", "tiếng hàn", 
                "spanish", "tiếng tây ban nha", 
                "russian", "tiếng nga",
                "language", "foreign language", "ngoại ngữ",
                "vocabulary", "grammar", "từ vựng", "ngữ pháp"
            };
            
            return languageKeywords.Any(keyword => lowerPrompt.Contains(keyword));
        }

        private string ExtractTargetLanguage(string prompt)
        {
            // Map Vietnamese language names to English language names
            Dictionary<string, string> languageMap = new Dictionary<string, string>
            {
                { "tiếng anh", "English" },
                { "english", "English" },
                { "tiếng đức", "German" },
                { "german", "German" },
                { "tiếng pháp", "French" },
                { "french", "French" },
                { "tiếng trung", "Chinese" },
                { "chinese", "Chinese" },
                { "tiếng nhật", "Japanese" },
                { "japanese", "Japanese" },
                { "tiếng hàn", "Korean" },
                { "korean", "Korean" },
                { "tiếng tây ban nha", "Spanish" },
                { "spanish", "Spanish" },
                { "tiếng nga", "Russian" },
                { "russian", "Russian" }
            };
            
            string lowerPrompt = prompt.ToLowerInvariant();
            
            foreach (var language in languageMap)
            {
                if (lowerPrompt.Contains(language.Key))
                {
                    return language.Value;
                }
            }
            
            // Default to English if no specific language is found
            return "the target foreign language";
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
                
                // Remove [CORRECT] annotations that cause JSON parsing errors
                cleanedResponse = cleanedResponse.Replace(" [CORRECT]", "");
                cleanedResponse = cleanedResponse.Replace("[CORRECT]", "");
                cleanedResponse = cleanedResponse.Replace(" (CORRECT)", "");
                cleanedResponse = cleanedResponse.Replace("(CORRECT)", "");
                
                // Try to normalize mathematical symbols and expressions for better parsing
                cleanedResponse = NormalizeMathNotation(cleanedResponse);
                
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    AllowTrailingCommas = true,
                    ReadCommentHandling = JsonCommentHandling.Skip
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
                
                // Fallback to a more robust parsing approach if JSON deserialization fails
                return ExtractQuestionsFromText(response, defaultType);
            }
        }

        // Helper method to normalize math notation for better JSON parsing
        private string NormalizeMathNotation(string input)
        {
            // Replace common math symbols that might cause JSON parsing issues
            var result = input
                .Replace("\\", "\\\\")  // Escape backslashes
                .Replace("\n", " ")     // Remove newlines in inappropriate places
                .Replace("\r", " ");    // Remove carriage returns
                
            return result;
        }

        private List<CreateQuestionDTO> ExtractQuestionsFromText(string response, string questionType)
        {
            try
            {
                // Look for questions patterns in the text
                var lines = response.Split('\n');
                var questions = new List<CreateQuestionDTO>();
                CreateQuestionDTO currentQuestion = null;
                
                foreach (var line in lines)
                {
                    // Skip empty lines
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    
                    // Look for question patterns
                    if (line.Contains("câu hỏi") || line.Contains("Câu hỏi") || 
                        line.StartsWith("Câu ") || line.Contains("Question:") || 
                        (line.Contains("?") && line.Length < 200))
                    {
                        // If we already have a question in progress, add it to the list
                        if (currentQuestion != null)
                        {
                            questions.Add(currentQuestion);
                        }
                        
                        currentQuestion = new CreateQuestionDTO
                        {
                            Content = line.Trim(),
                            Type = questionType,
                            Options = new List<CreateOptionDTO>(),
                            CorrectAnswers = new List<int>()
                        };
                    }
                    // Look for options
                    else if (currentQuestion != null && 
                            (line.Contains("A.") || line.Contains("A)") || 
                             line.Contains("B.") || line.Contains("B)") ||
                             line.Contains("C.") || line.Contains("C)") ||
                             line.Contains("D.") || line.Contains("D)")))
                    {
                        // Extract option content
                        string optionContent = line.Trim();
                        
                        // Check if this is marked as correct
                        bool isCorrect = optionContent.Contains("[CORRECT]") || 
                                        optionContent.Contains("(CORRECT)") ||
                                        optionContent.EndsWith("✓");
                        
                        // Remove the correct marker
                        optionContent = optionContent
                            .Replace("[CORRECT]", "")
                            .Replace("(CORRECT)", "")
                            .Replace("✓", "")
                            .Trim();
                        
                        currentQuestion.Options.Add(new CreateOptionDTO { Content = optionContent });
                        
                        // If this option is correct, add its index to correctAnswers
                        if (isCorrect)
                        {
                            currentQuestion.CorrectAnswers.Add(currentQuestion.Options.Count - 1);
                        }
                    }
                    // Additional content for current question
                    else if (currentQuestion != null)
                    {
                        // Append to question content if it seems like part of the question
                        currentQuestion.Content += " " + line.Trim();
                    }
                }
                
                // Add the last question if there is one
                if (currentQuestion != null)
                {
                    questions.Add(currentQuestion);
                }
                
                // If we managed to extract at least one question, return them
                if (questions.Count > 0)
                {
                    return questions;
                }
                
                // If extraction failed, return a single fallback question
                return CreateFallbackQuestions(response, questionType);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in text-based extraction: {ex.Message}");
                return CreateFallbackQuestions(response, questionType);
            }
        }

        private List<CreateQuestionDTO> CreateFallbackQuestions(string response, string questionType)
        {
            // Try to create at least one meaningful question from the response
            string questionContent = "Câu hỏi không thể phân tích được từ AI. Hãy thử lại với cách diễn đạt khác.";
            
            // If there's any content that might be usable, use it as the question
            if (!string.IsNullOrWhiteSpace(response) && response.Length > 20)
            {
                var sentences = response.Split(new[] { '.', '?', '!' }, StringSplitOptions.RemoveEmptyEntries);
                if (sentences.Length > 0)
                {
                    var potentialQuestion = sentences[0].Trim();
                    if (potentialQuestion.Length > 10 && !potentialQuestion.Contains("error"))
                    {
                        questionContent = potentialQuestion + "?";
                    }
                }
            }
            
            return new List<CreateQuestionDTO>
            {
                new CreateQuestionDTO
                {
                    Content = questionContent,
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

        public async Task<string> AnalyzeStudentWeaknessesAsync(List<WrongAnswerDTO> wrongAnswers, List<EssayAnswerDTO> essayAnswers)
        {
            try
            {
                if ((wrongAnswers == null || wrongAnswers.Count == 0) && (essayAnswers == null || essayAnswers.Count == 0))
                {
                    return "Not enough data to analyze weaknesses. Complete more exams to receive personalized analysis.";
                }

                // Create a structured prompt for Gemini
                var structuredPrompt = CreateWeaknessAnalysisPrompt(wrongAnswers, essayAnswers);
                
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
                        temperature = 0.2,
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
                var analysisText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                
                if (string.IsNullOrEmpty(analysisText))
                {
                    return "Unable to generate weakness analysis. Please try again later.";
                }
                
                return analysisText;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error analyzing student weaknesses with Gemini: {ex.Message}");
                return "An error occurred while analyzing your performance. Please try again later.";
            }
        }

        private string CreateWeaknessAnalysisPrompt(List<WrongAnswerDTO> wrongAnswers, List<EssayAnswerDTO> essayAnswers)
        {
            var prompt = new StringBuilder();
            
            prompt.AppendLine("As an educational AI tutor, analyze the following student's exam performance:");
            prompt.AppendLine("\nWrong Answers:");
            
            if (wrongAnswers != null && wrongAnswers.Count > 0)
            {
                foreach (var answer in wrongAnswers)
                {
                    prompt.AppendLine($"Question: {answer.QuestionText}");
                    prompt.AppendLine($"Correct Answer: {answer.CorrectAnswerText}");
                    prompt.AppendLine($"Student's Answer: {answer.StudentAnswerText}");
                    prompt.AppendLine();
                }
            }
            else
            {
                prompt.AppendLine("No wrong answers recorded.");
            }
            
            prompt.AppendLine("\nEssay Answers:");
            
            if (essayAnswers != null && essayAnswers.Count > 0)
            {
                foreach (var essay in essayAnswers)
                {
                    prompt.AppendLine($"Question: {essay.QuestionText}");
                    prompt.AppendLine($"Student's Answer: {essay.StudentAnswer}");
                    prompt.AppendLine();
                }
            }
            else
            {
                prompt.AppendLine("No essay answers recorded.");
            }
            
            prompt.AppendLine("\nPlease provide:");
            prompt.AppendLine("1. Analysis of the student's weaknesses based on their wrong answers and essay responses");
            prompt.AppendLine("2. Identification of knowledge gaps or misunderstandings");
            prompt.AppendLine("3. Specific suggestions for improvement in each identified weak area");
            prompt.AppendLine("4. Recommended study resources or learning strategies");
            prompt.AppendLine("\nIMPORTANT: Your response MUST be entirely in Vietnamese language.");
            prompt.AppendLine("\nKeep your response focused, specific, and actionable. Provide detailed recommendations that will help the student improve.");
            
            return prompt.ToString();
        }

        public async Task<List<WeaknessCategoryDTO>> AnalyzeWeaknessCategoriesAsync(List<WrongAnswerDTO> wrongAnswers)
        {
            try
            {
                if (wrongAnswers == null || wrongAnswers.Count == 0)
                {
                    return new List<WeaknessCategoryDTO>();
                }

                // Create a structured prompt for Gemini
                var structuredPrompt = CreateWeaknessCategoriesPrompt(wrongAnswers);
                
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
                        temperature = 0.2,
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
                var categoriesText = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;
                
                if (string.IsNullOrEmpty(categoriesText))
                {
                    return new List<WeaknessCategoryDTO>();
                }
                
                // Try to parse the JSON response
                try
                {
                    if (categoriesText.Contains("[") && categoriesText.Contains("]"))
                    {
                        var startIdx = categoriesText.IndexOf("[");
                        var endIdx = categoriesText.LastIndexOf("]") + 1;
                        var jsonPart = categoriesText.Substring(startIdx, endIdx - startIdx);
                        
                        var categories = JsonSerializer.Deserialize<List<WeaknessCategoryDTO>>(jsonPart, _jsonOptions);
                        return categories ?? new List<WeaknessCategoryDTO>();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error parsing weakness categories: {ex.Message}");
                }
                
                // Fallback: Create a basic category
                return new List<WeaknessCategoryDTO>
                {
                    new WeaknessCategoryDTO
                    {
                        Name = "General Knowledge Gaps",
                        PercentCorrect = 0,
                        Description = "Various knowledge gaps detected in your answers.",
                        Recommendations = "Review the material and focus on understanding core concepts."
                    }
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error analyzing weakness categories with Gemini: {ex.Message}");
                return new List<WeaknessCategoryDTO>();
            }
        }

        private string CreateWeaknessCategoriesPrompt(List<WrongAnswerDTO> wrongAnswers)
        {
            var prompt = new StringBuilder();
            
            prompt.AppendLine("As an educational AI tutor, analyze the following student's wrong answers and identify specific weakness categories:");
            
            foreach (var answer in wrongAnswers)
            {
                prompt.AppendLine($"Question: {answer.QuestionText}");
                prompt.AppendLine($"Correct Answer: {answer.CorrectAnswerText}");
                prompt.AppendLine($"Student's Answer: {answer.StudentAnswerText}");
                prompt.AppendLine();
            }
            
            prompt.AppendLine("Based on these wrong answers, identify 3-5 specific categories of weaknesses.");
            prompt.AppendLine("Return your analysis as a JSON array with the following format:");
            prompt.AppendLine(@"[
  {
    ""name"": ""Category Name"",
    ""percentCorrect"": 25,
    ""description"": ""Brief description of the weakness"",
    ""recommendations"": ""Specific recommendations for improvement""
  }
]");
            
            prompt.AppendLine("IMPORTANT: The content in fields 'name', 'description', and 'recommendations' MUST be in Vietnamese language.");
            prompt.AppendLine("Only return the JSON array, no other text. Ensure the percentCorrect is an integer between 0 and 100.");
            
            return prompt.ToString();
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