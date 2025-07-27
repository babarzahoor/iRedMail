const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IRedMailConnector {
    constructor(config) {
        this.config = {
            database: {
                host: config.db_host || 'localhost',
                port: config.db_port || 3306,
                user: config.db_user || 'vmailadmin',
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
        
        // iRedMail specific paths
        this.iredmail_paths = {
            storage_base: config.storage_base || '/var/vmail/vmail1',
            dovecot_deliver: config.dovecot_deliver || '/usr/libexec/dovecot/deliver',
            postfix_queue: config.postfix_queue || '/var/spool/postfix'
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
                'SELECT username, password, name, domain, active, enablesmtp, enableimap, enablepop3 FROM mailbox WHERE username = ? AND active = 1',
                [email]
            );
            
            await connection.end();
            
            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const user = rows[0];
            
            // Check if user has email services enabled
            if (!user.enablesmtp || !user.enableimap) {
                return res.status(401).json({ error: 'Email services not enabled for this account' });
            }
            
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
        // iRedMail password scheme verification
        try {
            // Remove any leading/trailing whitespace
            hashedPassword = hashedPassword.trim();
            
            if (hashedPassword.startsWith('{SSHA512}')) {
                return this.verifySSSHA512(plainPassword, hashedPassword);
            } else if (hashedPassword.startsWith('{SSHA}')) {
                return this.verifySSHA(plainPassword, hashedPassword);
            } else if (hashedPassword.startsWith('{PLAIN}')) {
                return plainPassword === hashedPassword.substring(7);
            } else if (hashedPassword.startsWith('{MD5}')) {
                const hash = crypto.createHash('md5').update(plainPassword).digest('hex');
                return hash === hashedPassword.substring(5);
            } else if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$')) {
                // BCRYPT - use doveadm for verification
                return this.verifyWithDoveadm(plainPassword, hashedPassword);
            } else {
                // Try as plain text or use doveadm
                return this.verifyWithDoveadm(plainPassword, hashedPassword);
            }
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }
    
    verifySSSHA512(plainPassword, hashedPassword) {
        try {
            const hash = hashedPassword.substring(9); // Remove {SSHA512}
            const decoded = Buffer.from(hash, 'base64');
            const salt = decoded.slice(64); // SHA512 produces 64 bytes
            const storedHash = decoded.slice(0, 64);
            
            const computed = crypto.createHash('sha512').update(plainPassword + salt).digest();
            return computed.equals(storedHash);
        } catch (error) {
            return false;
        }
    }
    
    verifySSHA(plainPassword, hashedPassword) {
        try {
            const hash = hashedPassword.substring(6); // Remove {SSHA}
            const decoded = Buffer.from(hash, 'base64');
            const salt = decoded.slice(20); // SHA1 produces 20 bytes
            const storedHash = decoded.slice(0, 20);
            
            const computed = crypto.createHash('sha1').update(plainPassword + salt).digest();
            return computed.equals(storedHash);
        } catch (error) {
            return false;
        }
    }
    
    verifyWithDoveadm(plainPassword, hashedPassword) {
        try {
            // Use doveadm to verify password (requires doveadm to be installed)
            const result = execSync(`echo "${plainPassword}" | doveadm pw -t "${hashedPassword}"`, 
                { encoding: 'utf8', timeout: 5000 });
            return result.trim() === hashedPassword;
        } catch (error) {
            // Fallback: try direct comparison for plain passwords
            return plainPassword === hashedPassword;
        }
    }
    
    async getMaildirPath(username) {
        // Get maildir path from database
        const connection = await this.getDbConnection();
        const [rows] = await connection.execute(
            'SELECT storagebasedirectory, storagenode, maildir FROM mailbox WHERE username = ?',
            [username]
        );
        await connection.end();
        
        if (rows.length === 0) {
            throw new Error('User maildir not found');
        }
        
        const user = rows[0];
        const maildirPath = path.join(
            user.storagebasedirectory || this.iredmail_paths.storage_base,
            user.storagenode || '',
            user.maildir || ''
        );
        
        return maildirPath;
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
        try {
            const maildirPath = await this.getMaildirPath(username);
            const folderPath = path.join(maildirPath, 'Maildir', folder === 'INBOX' ? '' : `.${folder}`, 'cur');
            
            if (!fs.existsSync(folderPath)) {
                return [];
            }
            
            const files = fs.readdirSync(folderPath)
                .filter(file => file.includes(':'))
                .sort((a, b) => {
                    const statA = fs.statSync(path.join(folderPath, a));
                    const statB = fs.statSync(path.join(folderPath, b));
                    return statB.mtime - statA.mtime;
                })
                .slice(offset, offset + limit);
            
            const emails = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = path.join(folderPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Parse email headers
                const email = this.parseEmailHeaders(content, i + 1);
                email.unread = !file.includes('S'); // 'S' flag means seen
                email.starred = file.includes('F'); // 'F' flag means flagged
                email.folder = folder.toLowerCase();
                
                emails.push(email);
            }
            
            return emails;
        } catch (error) {
            console.error('Error fetching emails from maildir:', error);
            return [];
        }
    }
    
    parseEmailHeaders(content, id) {
        const lines = content.split('\n');
        let sender = 'Unknown';
        let subject = 'No Subject';
        let date = new Date();
        let body = '';
        
        let inHeaders = true;
        let bodyLines = [];
        
        for (const line of lines) {
            if (inHeaders) {
                if (line.trim() === '') {
                    inHeaders = false;
                    continue;
                }
                
                if (line.toLowerCase().startsWith('from:')) {
                    sender = line.substring(5).trim().replace(/[<>]/g, '');
                } else if (line.toLowerCase().startsWith('subject:')) {
                    subject = line.substring(8).trim();
                } else if (line.toLowerCase().startsWith('date:')) {
                    try {
                        date = new Date(line.substring(5).trim());
                    } catch (e) {
                        date = new Date();
                    }
                }
            } else {
                bodyLines.push(line);
            }
        }
        
        body = bodyLines.join('\n').trim();
        const snippet = body.substring(0, 100).replace(/\s+/g, ' ');
        
        return {
            id: id,
            sender: sender.split('<')[0].trim() || sender,
            email: sender.includes('<') ? sender.split('<')[1].replace('>', '') : sender,
            subject: subject,
            snippet: snippet,
            date: date.toISOString(),
            body: body,
            labels: [],
            unread: false,
            starred: false,
            folder: 'inbox'
        };
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
            
            // Use iRedMail's SMTP with proper authentication
            const transporter = nodemailer.createTransporter({
                host: this.config.smtp.host,
                port: this.config.smtp.port,
                secure: false, // Use STARTTLS
                requireTLS: true,
                auth: {
                    user: from,
                    pass: req.headers['x-email-password'] || this.config.smtp.auth.pass
                },
                tls: {
                    rejectUnauthorized: false // For self-signed certificates
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
            
            // Log to iRedMail if possible
            try {
                const connection = await this.getDbConnection();
                await connection.execute(
                    'INSERT INTO log (event, loglevel, msg, admin, ip, timestamp) VALUES (?, ?, ?, ?, ?, NOW())',
                    ['email_sent', 'info', `Email sent from ${from} to ${to}`, from, req.ip || '127.0.0.1']
                );
                await connection.end();
            } catch (logError) {
                // Log error is not critical
                console.warn('Failed to log email send event:', logError);
            }
            
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
        try {
            const maildirPath = await this.getMaildirPath(username);
            const maildirRoot = path.join(maildirPath, 'Maildir');
            
            const folders = [
                { name: 'INBOX', displayName: 'Inbox', count: 0 }
            ];
            
            if (fs.existsSync(maildirRoot)) {
                const items = fs.readdirSync(maildirRoot);
                
                for (const item of items) {
                    if (item.startsWith('.') && fs.statSync(path.join(maildirRoot, item)).isDirectory()) {
                        const folderName = item.substring(1); // Remove leading dot
                        const curPath = path.join(maildirRoot, item, 'cur');
                        
                        let count = 0;
                        if (fs.existsSync(curPath)) {
                            const files = fs.readdirSync(curPath);
                            count = files.filter(file => !file.includes('S')).length; // Unread count
                        }
                        
                        folders.push({
                            name: folderName,
                            displayName: this.getFolderDisplayName(folderName),
                            count: count
                        });
                    }
                }
            }
            
            return folders;
        } catch (error) {
            console.error('Error getting user folders:', error);
            // Return default folders if maildir access fails
            return [
                { name: 'INBOX', displayName: 'Inbox', count: 0 },
                { name: 'Sent', displayName: 'Sent', count: 0 },
                { name: 'Drafts', displayName: 'Drafts', count: 0 },
                { name: 'Trash', displayName: 'Trash', count: 0 },
                { name: 'Junk', displayName: 'Spam', count: 0 }
            ];
        }
    }
    
    getFolderDisplayName(folderName) {
        const displayNames = {
            'Sent': 'Sent',
            'Drafts': 'Drafts', 
            'Trash': 'Trash',
            'Junk': 'Spam',
            'Spam': 'Spam',
            'INBOX.Sent': 'Sent',
            'INBOX.Drafts': 'Drafts',
            'INBOX.Trash': 'Trash',
            'INBOX.Junk': 'Spam'
        };
        
        return displayNames[folderName] || folderName;
    }
    
    async getUserInfo(req, res) {
        try {
            const username = req.user.username;
            const connection = await this.getDbConnection();
            
            const [rows] = await connection.execute(
                'SELECT username, name, domain, quota, created, storagebasedirectory, storagenode FROM mailbox WHERE username = ?',
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
                created: user.created,
                storage_info: {
                    base: user.storagebasedirectory,
                    node: user.storagenode
                }
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