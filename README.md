# FusionMail - iRedMail Web Client

A modern, Google-style email web client that connects to iRedMail backend infrastructure.

## Features

- 🎨 **Modern UI** - Clean, responsive interface inspired by Gmail
- 🔐 **Secure Authentication** - JWT-based authentication with iRedMail
- 📧 **Full Email Management** - Read, send, organize, and search emails
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- ⚡ **Real-time Updates** - Live email synchronization
- 🏷️ **Smart Organization** - Folders, labels, and search functionality

## Architecture

### Frontend (FusionMail Client)
- **HTML/CSS/JavaScript** - Modern web technologies
- **Material Design** - Google-style interface components
- **Responsive Layout** - Mobile-first design approach
- **API Integration** - RESTful communication with backend

### Backend (iRedMail Connector)
- **Node.js/Express** - RESTful API server
- **MySQL Integration** - Direct connection to iRedMail database
- **SMTP/IMAP Support** - Email sending and receiving
- **JWT Authentication** - Secure token-based auth

## Setup Instructions

### Prerequisites
- iRedMail server running and configured
- Node.js 16+ installed
- Access to iRedMail MySQL database

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Backend
Copy the environment template and configure your iRedMail settings:
```bash
cp api/.env.example api/.env
```

Edit `api/.env` with your iRedMail configuration:
```env
DB_HOST=your-iredmail-server
DB_USER=vmail
DB_PASSWORD=your-vmail-password
DB_NAME=vmail
SMTP_HOST=your-iredmail-server
IMAP_HOST=your-iredmail-server
JWT_SECRET=your-secret-key
```

### 3. Start the Application
```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
npm run api    # Backend API (port 3001)
npm run dev    # Frontend (port 3000)
```

### 4. Access the Application
- Open your browser to `http://localhost:3000`
- You'll be redirected to the login page
- Use your iRedMail email credentials to sign in

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Email Management
- `GET /api/protected/emails` - Get email list
- `GET /api/protected/emails/:id` - Get specific email
- `POST /api/protected/emails/send` - Send new email
- `PUT /api/protected/emails/:id/read` - Mark as read
- `PUT /api/protected/emails/:id/star` - Toggle star
- `DELETE /api/protected/emails/:id` - Delete email

### User & Folders
- `GET /api/protected/folders` - Get folder list
- `GET /api/protected/user/info` - Get user information

## iRedMail Integration

This connector integrates with iRedMail's core components:

### Database Integration
- **vmail.mailbox** - User authentication and account info
- **Mail storage** - Maildir format support
- **Folder structure** - IMAP folder mapping

### SMTP Integration
- **Postfix** - Email sending through iRedMail's SMTP server
- **Authentication** - User credentials for SMTP auth

### IMAP Integration
- **Dovecot** - Email retrieval and folder management
- **Real-time sync** - Live email updates

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Support for iRedMail password schemes
- **CORS Protection** - Cross-origin request security
- **Input Validation** - Server-side validation for all inputs

## Development

### Project Structure
```
fusionmail/
├── api/                    # Backend API
│   ├── iredmail-connector.js  # Main connector class
│   ├── server.js             # API server
│   └── .env.example          # Environment template
├── js/                     # Frontend JavaScript
│   └── iredmail-client.js    # API client
├── index.html              # Main application
├── login.html              # Login page
├── styles.css              # Application styles
├── script.js               # Main application logic
└── package.json            # Dependencies
```

### Extending the Connector

To add new features:

1. **Add API endpoints** in `api/iredmail-connector.js`
2. **Update client methods** in `js/iredmail-client.js`
3. **Implement UI features** in `script.js`

### Database Schema

The connector works with iRedMail's standard database schema:
- `mailbox` - User accounts and settings
- `domain` - Email domains
- `alias` - Email aliases and forwarding
- `forwardings` - Email forwarding rules

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check iRedMail database credentials
   - Ensure MySQL is accessible from the API server
   - Verify firewall settings

2. **SMTP Authentication Failed**
   - Confirm SMTP settings in iRedMail
   - Check user credentials
   - Verify Postfix configuration

3. **IMAP Connection Issues**
   - Ensure Dovecot is running
   - Check IMAP port accessibility
   - Verify SSL/TLS settings

### Logs
- Backend logs: Check console output from `npm run api`
- Frontend logs: Check browser developer console
- iRedMail logs: Check `/var/log/maillog` on your iRedMail server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.