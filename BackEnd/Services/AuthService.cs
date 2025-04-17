using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BackEnd.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto model);
        Task<AuthResponseDto> LoginAsync(LoginDto model);
        Task<AuthResponseDto> ForgotPasswordAsync(ForgotPasswordDto model);
        Task<AuthResponseDto> ResetPasswordAsync(ResetPasswordDto model);
        Task<AuthResponseDto> VerifyEmailAsync(string email, string token);
    }

    public class AuthService : IAuthService
    {
        private readonly IUserService _userService;
        private readonly IEmailService _emailService;
        private readonly JwtSettings _jwtSettings;

        public AuthService(
            IUserService userService,
            IEmailService emailService,
            IOptions<JwtSettings> jwtSettings)
        {
            _userService = userService;
            _emailService = emailService;
            _jwtSettings = jwtSettings.Value;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto model)
        {
            // Check if user already exists
            var existingUser = await _userService.GetUserByEmailAsync(model.Email);
            if (existingUser != null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email đã được sử dụng."
                };
            }

            // Normalize role with proper capitalization
            string normalizedRole = "Student"; // Default
            if (!string.IsNullOrEmpty(model.Role))
            {
                string roleLower = model.Role.ToLower();
                if (roleLower == "student")
                    normalizedRole = "Student";
                else if (roleLower == "teacher")
                    normalizedRole = "Teacher";
                else if (roleLower == "admin")
                    normalizedRole = "Admin";
            }

            // Create new user
            var newUser = new User
            {
                Email = model.Email,
                PasswordHash = UserService.HashPassword(model.Password),
                FirstName = model.FirstName,
                LastName = model.LastName,
                Role = normalizedRole,
                EmailConfirmed = false,
                EmailConfirmationToken = UserService.GenerateRandomToken(),
                EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userService.CreateUserAsync(newUser);
            if (!result)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Lỗi khi đăng ký tài khoản."
                };
            }

            // Send verification email
            await _emailService.SendVerificationEmailAsync(newUser.Email, newUser.EmailConfirmationToken);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản."
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto model)
        {
            var user = await _userService.GetUserByEmailAsync(model.Email);
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng."
                };
            }

            if (!UserService.VerifyPassword(model.Password, user.PasswordHash))
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Email hoặc mật khẩu không đúng."
                };
            }

            if (!user.EmailConfirmed)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Tài khoản chưa được xác minh. Vui lòng kiểm tra email của bạn."
                };
            }
            
            // Ensure proper role capitalization
            NormalizeUserRole(user);

            // Update last login
            user.LastLogin = DateTime.UtcNow;
            await _userService.UpdateUserAsync(user);

            // Generate JWT token
            var token = GenerateJwtToken(user);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Đăng nhập thành công.",
                Token = token
            };
        }

        // Helper method to normalize user role with proper capitalization
        private void NormalizeUserRole(User user)
        {
            if (string.IsNullOrEmpty(user.Role)) 
            {
                user.Role = "Student"; // Default
                return;
            }
            
            string roleLower = user.Role.ToLower();
            if (roleLower == "student")
                user.Role = "Student";
            else if (roleLower == "teacher")
                user.Role = "Teacher";
            else if (roleLower == "admin")
                user.Role = "Admin";
        }

        public async Task<AuthResponseDto> ForgotPasswordAsync(ForgotPasswordDto model)
        {
            var user = await _userService.GetUserByEmailAsync(model.Email);
            if (user == null)
            {
                // For security reasons, always return success even if user doesn't exist
                return new AuthResponseDto
                {
                    Success = true,
                    Message = "Nếu địa chỉ email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu."
                };
            }

            // Generate reset token
            user.PasswordResetToken = UserService.GenerateRandomToken();
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
            
            await _userService.UpdateUserAsync(user);
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.PasswordResetToken);

            return new AuthResponseDto
            {
                Success = true,
                Message = "Hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn."
            };
        }

        public async Task<AuthResponseDto> ResetPasswordAsync(ResetPasswordDto model)
        {
            // Validate token
            var isValidToken = await _userService.ValidatePasswordResetTokenAsync(model.Email, model.Token);
            if (!isValidToken)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
                };
            }

            // Update password
            var user = await _userService.GetUserByEmailAsync(model.Email);
            if (user == null)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Không tìm thấy người dùng."
                };
            }

            user.PasswordHash = UserService.HashPassword(model.Password);
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;

            var result = await _userService.UpdateUserAsync(user);
            if (!result)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Lỗi khi đặt lại mật khẩu."
                };
            }

            return new AuthResponseDto
            {
                Success = true,
                Message = "Mật khẩu đã được đặt lại thành công."
            };
        }

        public async Task<AuthResponseDto> VerifyEmailAsync(string email, string token)
        {
            var result = await _userService.VerifyEmailAsync(email, token);
            if (!result)
            {
                return new AuthResponseDto
                {
                    Success = false,
                    Message = "Xác minh email không thành công. Link có thể đã hết hạn hoặc không hợp lệ."
                };
            }

            return new AuthResponseDto
            {
                Success = true,
                Message = "Xác minh email thành công. Bạn có thể đăng nhập ngay bây giờ."
            };
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Secret);
            
            Console.WriteLine($"Generating token for user with role: {user.Role}");
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName),
                // Make sure role is preserved with original capitalization
                new Claim(ClaimTypes.Role, user.Role)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.ExpiryDays),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
} 