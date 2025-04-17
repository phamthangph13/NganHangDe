using BackEnd.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BackEnd.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string to, string subject, string body, bool isHtml = true);
        Task SendVerificationEmailAsync(string email, string token);
        Task SendPasswordResetEmailAsync(string email, string token);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        public async Task SendEmailAsync(string to, string subject, string body, bool isHtml = true)
        {
            try
            {
                _logger.LogInformation($"Attempting to send email to {to} with subject '{subject}'");
                
                var email = new MimeMessage();
                
                email.From.Add(new MailboxAddress(_emailSettings.SenderName, _emailSettings.SenderEmail));
                email.To.Add(MailboxAddress.Parse(to));
                email.Subject = subject;

                var builder = new BodyBuilder();
                if (isHtml)
                {
                    builder.HtmlBody = body;
                }
                else
                {
                    builder.TextBody = body;
                }

                email.Body = builder.ToMessageBody();

                using var smtp = new SmtpClient();
                
                _logger.LogInformation($"Connecting to SMTP server {_emailSettings.SmtpServer}:{_emailSettings.SmtpPort}");
                await smtp.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, SecureSocketOptions.StartTls);
                
                _logger.LogInformation($"Authenticating with username: {_emailSettings.Username}");
                await smtp.AuthenticateAsync(_emailSettings.Username, _emailSettings.Password);
                
                _logger.LogInformation("Sending email...");
                await smtp.SendAsync(email);
                
                await smtp.DisconnectAsync(true);
                _logger.LogInformation("Email sent successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending email: {ex.Message}");
                throw;
            }
        }

        private string GetEmailTemplate(string title, string content, string buttonText, string buttonUrl)
        {
            return $@"
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>{title}</title>
                <style>
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f9f9f9;
                    }}
                    .container {{
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #ffffff;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
                    }}
                    .header {{
                        background-color: #4a6bdf;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                        border-top-left-radius: 8px;
                        border-top-right-radius: 8px;
                        margin-bottom: 20px;
                    }}
                    .content {{
                        padding: 20px;
                    }}
                    .button {{
                        display: inline-block;
                        background-color: #4a6bdf;
                        color: #ffffff !important;
                        text-decoration: none;
                        padding: 12px 25px;
                        border-radius: 4px;
                        margin: 20px 0;
                        font-weight: bold;
                        text-align: center;
                        transition: background-color 0.3s;
                    }}
                    .button:hover {{
                        background-color: #3a5bc5;
                    }}
                    .footer {{
                        margin-top: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #999;
                    }}
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>{title}</h1>
                    </div>
                    <div class='content'>
                        {content}
                        <div style='text-align: center;'>
                            <a href='{buttonUrl}' class='button'>{buttonText}</a>
                        </div>
                        <p>Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; {DateTime.Now.Year} Ngân hàng đề thi. Tất cả các quyền được bảo lưu.</p>
                    </div>
                </div>
            </body>
            </html>";
        }

        public async Task SendVerificationEmailAsync(string email, string token)
        {
            string verificationLink = $"{_emailSettings.BaseUrl}/api/auth/verify-email?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
            
            string title = "Xác minh tài khoản";
            string content = @"
                <p>Cảm ơn bạn đã đăng ký!</p>
                <p>Để hoàn tất quá trình đăng ký tài khoản, vui lòng nhấp vào nút bên dưới để xác minh địa chỉ email của bạn.</p>
                <p>Lưu ý: Liên kết này sẽ hết hạn sau 24 giờ.</p>
            ";
            
            string body = GetEmailTemplate(title, content, "Xác minh tài khoản", verificationLink);

            await SendEmailAsync(email, title, body);
        }

        public async Task SendPasswordResetEmailAsync(string email, string token)
        {
            string resetLink = $"{_emailSettings.BaseUrl}/reset-password.html?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
            
            string title = "Đặt lại mật khẩu";
            string content = @"
                <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Để đặt lại mật khẩu, vui lòng nhấp vào nút bên dưới. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Lưu ý: Liên kết này sẽ hết hạn sau 1 giờ.</p>
            ";
            
            string body = GetEmailTemplate(title, content, "Đặt lại mật khẩu", resetLink);

            await SendEmailAsync(email, title, body);
        }
    }
} 