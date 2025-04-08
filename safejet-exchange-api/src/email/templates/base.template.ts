export const baseTemplate = (content: string, isDark = true) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Reset styles */
        body {
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            font-family: 'Arial', sans-serif;
        }

        /* Container styles */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: ${isDark ? '#000814' : '#ffffff'};
            color: ${isDark ? '#ffffff' : '#001d3d'};
        }

        /* Header styles */
        .header {
            text-align: center;
            padding: 30px 0;
            background-color: ${isDark ? '#001d3d' : '#f8f9fa'};
            border-radius: 12px;
        }

        .logo {
            width: 120px;
            height: auto;
        }

        /* Content styles */
        .content {
            padding: 30px;
            background-color: ${isDark ? '#001d3d' : '#ffffff'};
            border-radius: 12px;
            margin: 20px 0;
            box-shadow: 0 4px 6px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.1)'};
        }

        /* Button styles */
        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #ffc300;
            color: #000814;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }

        /* Code block styles */
        .code-block {
            background-color: ${isDark ? '#003566' : '#f8f9fa'};
            padding: 20px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 24px;
            letter-spacing: 4px;
            text-align: center;
            margin: 20px 0;
            color: #ffd60a;
        }

        /* Footer styles */
        .footer {
            text-align: center;
            padding: 20px;
            color: ${isDark ? '#6c757d' : '#6c757d'};
            font-size: 12px;
        }

        /* Responsive styles */
        @media screen and (max-width: 600px) {
            .email-container {
                padding: 10px;
            }
            
            .content {
                padding: 20px;
            }
            
            .header {
                padding: 20px 0;
            }
        }

        /* Social media icons */
        .social-links {
            padding: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            color: #ffc300;
            text-decoration: none;
        }

        /* Highlight text */
        .highlight {
            color: #ffd60a;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://safejet.com/logo.png" alt="NadiaPoint Exchange" class="logo">
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">Twitter</a>
                <a href="#" class="social-link">Telegram</a>
                <a href="#" class="social-link">Discord</a>
            </div>
            <p>© ${new Date().getFullYear()} NadiaPoint Exchange. All rights reserved.</p>
            <p>If you didn't request this email, please ignore it.</p>
        </div>
    </div>
</body>
</html>
`;
