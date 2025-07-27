const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

class IRedMailConnector {
    constructor(config) {
        this.config = {
            database: {
                host: config.db_host || 'localhost',
                port: config.db_port || 3306,
                user: config.db_user || 'vmail',
                password: config.db_password,
                database: config.db_name || 'vmail'
            },
            smtp: {
                host: config.smtp_host || 'localhost',
                port: config.smtp_port || 587,
                secure: false,
                auth: {
                    user: config.smtp_user,
                    pass: config.smtp_pass
                }
            },
            imap: {
                host: config.imap_host || 'localhost',
                port: config.imap_port || 143,
                secure: false
            },
            jwt_secret: config.jwt_secret || 'your-secret-key'
        };
        
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Authentication middleware
        this.app.use('/api/protected', this.authenticateToken.bind(this));
    }
    
    async getDbConnection() {
        return await mysql.createConnection(this.config.database);
    }
    
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }
        
        jwt.verify(token, this.config.jwt_secret, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    }
    
    setupRoutes() {
        // Authentication routes
        this.app.post('/api/auth/login', this.login.bind(this));
        this.app.post('/api/auth/logout', this.logout.bind(this));
        
        // Protected routes
        this.app.get('/api/protected/emails', this.getEmails.bind(this));
        this.app.get('/api/protected/emails/:id', this.getEmail.bind(this));
        this.app.post('/api/protected/emails/send', this.sendEmail.bind(this));
        this.app.put('/api/protected/emails/:id/read', this.markAsRead.bind(this));
        this.app.put('/api/protected/emails/:id/star', this.toggleStar.bind(this));
        this.app.delete('/api/protected/emails/:id', this.deleteEmail.bind(this));
        this.app.get('/api/protected/folders', this.getFolders.bind(this));
        this.app.get('/api/protected/user/info', this.getUserInfo.bind(this));
    }
    
    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password required' });
            }
            
            const connection = await this.getDbConnection();
            
            // Query user from iRedMail mailbox table
            const [rows] = await connection.execute(
                'SELECT username, password, name, domain, active FROM mailbox WHERE username = ? AND active = 1',
                [email]
            );
            
            await connection.end();
            
            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const user = rows[0];
            
            // Verify password (iRedMail uses various schemes, this is simplified)
            const isValidPassword = await this.verifyPassword(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { 
                    username: user.username,
                    name: user.name,
                    domain: user.domain
                },
                this.config.jwt_secret,
                { expiresIn: '24h' }
            );
            
            res.json({
                token,
                user: {
                    username: user.username,
                    name: user.name,
                    domain: user.domain
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    async verifyPassword(plainPassword, hashedPassword) {
        // iRedMail supports multiple password schemes
        // This is a simplified version - you may need to handle SSHA, SSHA512, etc.
        try {
            if (hashedPassword.startsWith('{SSHA512}')) {
                // Handle SSHA512 scheme
                const hash = hashedPassword.substring(9);
                // Implement SSHA512 verification
                return false; // Placeholder
            } else if (hashedPassword.startsWith('{SSHA}')) {
                // Handle SSHA scheme
                const hash = hashedPassword.substring(6);
                // Implement SSHA verification
                return false; // Placeholder
            } else {
                // Fallback to bcrypt
                return await bcrypt.compare(plainPassword, hashedPassword);
            }
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }
    
    async logout(req, res) {
        // In a real implementation, you might want to blacklist the token
        res.json({ message: 'Logged out successfully' });
    }
    
    async getEmails(req, res) {
        try {
            const { folder = 'INBOX', limit = 50, offset = 0 } = req.query;
            const username = req.user.username;
            
            // This is a simplified implementation
            // In reality, you'd need to connect to the IMAP server or parse maildir
            const emails = await this.fetchEmailsFromMaildir(username, folder, limit, offset);
            
            res.json({
                emails,
                total: emails.length,
                folder
            });
            
        } catch (error) {
            console.error('Get emails error:', error);
            res.status(500).json({ error: 'Failed to fetch emails' });
        }
    }
    
    async fetchEmailsFromMaildir(username, folder, limit, offset) {
        // Placeholder implementation
        // In a real scenario, you'd parse the maildir structure
        // or use an IMAP library to fetch emails
        
        return [
            {
                id: 1,
                sender: 'System Admin',
                email: 'admin@' + req.user.domain,
                subject: 'Welcome to iRedMail',
                snippet: 'Your email account has been successfully configured.',
                date: new Date().toISOString(),
                unread: true,
                starred: false,
                folder: 'INBOX'
            }
        ];
    }
    
    async getEmail(req, res) {
        try {
            const emailId = req.params.id;
            const username = req.user.username;
            
            // Fetch specific email content
            const email = await this.fetchEmailContent(username, emailId);
            
            if (!email) {
                return res.status(404).json({ error: 'Email not found' });
            }
            
            res.json(email);
            
        } catch (error) {
            console.error('Get email error:', error);
            res.status(500).json({ error: 'Failed to fetch email' });
        }
    }
    
    async fetchEmailContent(username, emailId) {
        // Placeholder - implement actual email content fetching
        return {
            id: emailId,
            sender: 'System Admin',
            email: 'admin@example.com',
            subject: 'Welcome to iRedMail',
            body: 'Your email account has been successfully configured with iRedMail.',
            date: new Date().toISOString(),
            unread: false,
            starred: false,
            folder: 'INBOX'
        };
    }
    
    async sendEmail(req, res) {
        try {
            const { to, cc, bcc, subject, body } = req.body;
            const from = req.user.username;
            
            if (!to || !subject) {
                return res.status(400).json({ error: 'To and subject are required' });
            }
            
            // Create SMTP transporter
            const transporter = nodemailer.createTransporter({
                host: this.config.smtp.host,
                port: this.config.smtp.port,
                secure: this.config.smtp.secure,
                auth: {
                    user: from,
                    pass: req.headers['x-email-password'] // Pass through user's password
                }
            });
            
            // Send email
            const info = await transporter.sendMail({
                from,
                to,
                cc,
                bcc,
                subject,
                text: body,
                html: body.replace(/\n/g, '<br>')
            });
            
            res.json({
                message: 'Email sent successfully',
                messageId: info.messageId
            });
            
        } catch (error) {
            console.error('Send email error:', error);
            res.status(500).json({ error: 'Failed to send email' });
        }
    }
    
    async markAsRead(req, res) {
        try {
            const emailId = req.params.id;
            const username = req.user.username;
            
            // Mark email as read in maildir or IMAP
            await this.updateEmailFlag(username, emailId, 'read', true);
            
            res.json({ message: 'Email marked as read' });
            
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({ error: 'Failed to mark email as read' });
        }
    }
    
    async toggleStar(req, res) {
        try {
            const emailId = req.params.id;
            const username = req.user.username;
            const { starred } = req.body;
            
            await this.updateEmailFlag(username, emailId, 'starred', starred);
            
            res.json({ message: 'Email star status updated' });
            
        } catch (error) {
            console.error('Toggle star error:', error);
            res.status(500).json({ error: 'Failed to update star status' });
        }
    }
    
    async updateEmailFlag(username, emailId, flag, value) {
        // Placeholder - implement actual flag updating
        console.log(`Updating ${flag} to ${value} for email ${emailId} of user ${username}`);
    }
    
    async deleteEmail(req, res) {
        try {
            const emailId = req.params.id;
            const username = req.user.username;
            
            // Move email to trash or delete permanently
            await this.moveEmailToTrash(username, emailId);
            
            res.json({ message: 'Email deleted successfully' });
            
        } catch (error) {
            console.error('Delete email error:', error);
            res.status(500).json({ error: 'Failed to delete email' });
        }
    }
    
    async moveEmailToTrash(username, emailId) {
        // Placeholder - implement actual email deletion/moving
        console.log(`Moving email ${emailId} to trash for user ${username}`);
    }
    
    async getFolders(req, res) {
        try {
            const username = req.user.username;
            
            // Get available folders for the user
            const folders = await this.getUserFolders(username);
            
            res.json({ folders });
            
        } catch (error) {
            console.error('Get folders error:', error);
            res.status(500).json({ error: 'Failed to fetch folders' });
        }
    }
    
    async getUserFolders(username) {
        // Standard IMAP folders
        return [
            { name: 'INBOX', displayName: 'Inbox', count: 5 },
            { name: 'Sent', displayName: 'Sent', count: 0 },
            { name: 'Drafts', displayName: 'Drafts', count: 0 },
            { name: 'Trash', displayName: 'Trash', count: 0 },
            { name: 'Junk', displayName: 'Spam', count: 0 }
        ];
    }
    
    async getUserInfo(req, res) {
        try {
            const username = req.user.username;
            const connection = await this.getDbConnection();
            
            const [rows] = await connection.execute(
                'SELECT username, name, domain, quota, created FROM mailbox WHERE username = ?',
                [username]
            );
            
            await connection.end();
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = rows[0];
            res.json({
                username: user.username,
                name: user.name,
                domain: user.domain,
                quota: user.quota,
                created: user.created
            });
            
        } catch (error) {
            console.error('Get user info error:', error);
            res.status(500).json({ error: 'Failed to fetch user info' });
        }
    }
    
    start(port = 3001) {
        this.app.listen(port, () => {
            console.log(`iRedMail Connector API running on port ${port}`);
        });
    }
}

module.exports = IRedMailConnector;