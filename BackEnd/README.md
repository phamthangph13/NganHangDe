# ASP.NET Core Authentication API

This project is an ASP.NET Core Web API that provides authentication functionality including registration, login, email verification, and password reset.

## Features

- User registration with email verification
- Role-based authentication (Student and Teacher roles)
- Login with JWT token authentication
- Forgot password with email reset link
- MongoDB as the database backend

## Prerequisites

- .NET 9.0 SDK
- MongoDB (local installation or MongoDB Atlas)
- SMTP server for sending emails

## Configuration

Update the `appsettings.json` file with your configuration:

```json
{
  "MongoDB": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "AuthAPIDb",
    "UsersCollection": "Users"
  },
  "JwtSettings": {
    "Secret": "your_super_secure_secret_key_here_at_least_32_characters",
    "ExpiryDays": 7,
    "Issuer": "AuthAPI",
    "Audience": "AuthAPI"
  },
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your-email@example.com",
    "SenderName": "Auth System",
    "Username": "your-email@example.com",
    "Password": "your-password-or-app-password",
    "UseSsl": true,
    "BaseUrl": "http://localhost:5000"
  }
}
```

## Running the Application

```bash
cd AuthAPI
dotnet run
```

The API will be available at `https://localhost:5001` and `http://localhost:5000`.

## API Endpoints

### Authentication

- **POST /api/auth/register**
  - Register a new user
  - Requires: email, password, firstName, lastName, role

- **POST /api/auth/login**
  - Login a user
  - Requires: email, password
  - Returns: JWT token

- **POST /api/auth/forgot-password**
  - Send a password reset email
  - Requires: email

- **POST /api/auth/reset-password**
  - Reset a user's password using a token
  - Requires: email, token, password

- **GET /api/auth/verify-email**
  - Verify a user's email address
  - Query Parameters: email, token

- **GET /api/auth/me**
  - Get current user information
  - Requires: Authorization header with JWT token

## Swagger Documentation

Swagger documentation is available at `/swagger` when running in development mode.

## Security Notes

- Update the JWT secret key in production
- Use HTTPS in production
- Use environment variables for sensitive configuration in production
- If using Gmail for sending emails, you'll need to use an App Password 