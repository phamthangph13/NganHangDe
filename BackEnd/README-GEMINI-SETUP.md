# Setting Up Gemini API for Question Generation

This application uses Google's Gemini AI model to generate questions for your question sets. To use this feature, you'll need to set up a Google Cloud account and get an API key for the Gemini API.

## Steps to Get a Gemini API Key

1. **Create a Google Cloud Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign in with your Google account or create a new one

2. **Create a New Project**
   - In the Google Cloud Console, click on the project dropdown at the top of the page
   - Click "New Project" and give it a name
   - Click "Create"

3. **Enable the Gemini API**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with the same Google account
   - Click on "Get API key"
   - Create a new API key by clicking on "Create API key"
   - Copy the generated API key

4. **Configure Your Application**
   - Open `appsettings.json` in the BackEnd folder
   - Locate the `GeminiSettings` section
   - Replace "YOUR_GEMINI_API_KEY" with your actual API key
   ```json
   "GeminiSettings": {
     "ApiKey": "YOUR_ACTUAL_API_KEY_HERE",
     "ModelName": "gemini-1.5-pro",
     "Temperature": 0.7,
     "MaxOutputTokens": 2048
   }
   ```

5. **Restart Your Application**
   - Restart your backend service for the changes to take effect

## Important Security Notes

- **Never commit your API key to version control**. Consider using user secrets or environment variables for production environments.
- The API key has associated usage limits and costs. Check the [Google AI pricing page](https://cloud.google.com/vertex-ai/pricing) for current rates.
- Monitor your usage to avoid unexpected charges.

## Troubleshooting

If you encounter issues with the AI question generation:

1. Verify your API key is correctly set in `appsettings.json`
2. Check that your API key is active and has the correct permissions
3. Inspect application logs for specific error messages
4. Make sure your Google Cloud account has billing enabled for API usage

For additional help, refer to the [Google Gemini API documentation](https://ai.google.dev/docs). 