using BackEnd.DTOs;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Reflection;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly EmailSettings _emailSettings;

        public AuthController(
            IAuthService authService, 
            IEmailService emailService,
            IOptions<EmailSettings> emailSettings)
        {
            _authService = authService;
            _emailService = emailService;
            _emailSettings = emailSettings.Value;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.RegisterAsync(model);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(model);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ForgotPasswordAsync(model);
            return Ok(result); // Always return OK for security reasons
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ResetPasswordAsync(model);
            
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string email, [FromQuery] string token)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(token))
            {
                return Redirect("/email-verification-failed.html?message=" + Uri.EscapeDataString("Email và token là bắt buộc."));
            }

            var result = await _authService.VerifyEmailAsync(email, token);
            
            if (!result.Success)
            {
                return Redirect("/email-verification-failed.html?message=" + Uri.EscapeDataString(result.Message));
            }

            return Redirect("/email-verification-success.html");
        }

        [HttpGet("test-email")]
        public async Task<IActionResult> TestEmail([FromQuery] string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest("Email là bắt buộc.");
            }

            try
            {
                // Get the SendVerificationEmailAsync method using reflection
                var method = typeof(IEmailService).GetMethod("SendVerificationEmailAsync");
                if (method != null)
                {
                    // Call the method with a dummy token
                    await (Task)method.Invoke(_emailService, new object[] { email, "test-token-123456" });
                }
                else
                {
                    // Fallback to simple email if reflection fails
                    await _emailService.SendEmailAsync(
                        email,
                        "Email Test",
                        "<h1>Email Test</h1><p>Đây là một email kiểm tra từ hệ thống.</p>");
                }
                
                return Ok(new { Success = true, Message = "Email đã được gửi thành công. Vui lòng kiểm tra hòm thư của bạn." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { 
                    Success = false, 
                    Message = $"Lỗi gửi email: {ex.Message}", 
                    Detail = ex.ToString() 
                });
            }
        }

        [HttpGet("config")]
        public IActionResult GetConfig()
        {
            // Trả về URL cơ sở đang được sử dụng (không trả về thông tin nhạy cảm)
            return Ok(new { 
                BaseUrl = _emailSettings.BaseUrl,
                ServerPort = "5296",
                SmtpServer = _emailSettings.SmtpServer,
                SmtpPort = _emailSettings.SmtpPort,
                SenderEmail = _emailSettings.SenderEmail,
                SenderName = _emailSettings.SenderName
            });
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetCurrentUser()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            var firstName = User.FindFirst(System.Security.Claims.ClaimTypes.GivenName)?.Value;
            var lastName = User.FindFirst(System.Security.Claims.ClaimTypes.Surname)?.Value;
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            // Log the user information for debugging
            Console.WriteLine($"User claims - ID: {userId}, Email: {email}, Role: {role}");

            return Ok(new 
            {
                Id = userId,
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                Role = role  // Preserve the original capitalization
            });
        }
    }
} 