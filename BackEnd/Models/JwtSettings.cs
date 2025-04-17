namespace BackEnd.Models
{
    public class JwtSettings
    {
        public string Secret { get; set; } = string.Empty;
        public int ExpiryDays { get; set; } = 7;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
    }
} 