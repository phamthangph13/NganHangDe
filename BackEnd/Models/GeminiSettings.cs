namespace BackEnd.Models
{
    public class GeminiSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string ModelName { get; set; } = "gemini-1.5-pro";
        public double Temperature { get; set; } = 0.7;
        public int MaxOutputTokens { get; set; } = 2048;
    }
} 