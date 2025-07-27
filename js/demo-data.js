// Demo data for FusionMail (standalone mode)
class DemoDataProvider {
    constructor() {
        this.currentUser = {
            username: 'demo@fusionmail.com',
            name: 'Demo User',
            domain: 'fusionmail.com'
        };
        
        this.emails = this.generateDemoEmails();
        this.folders = this.generateDemoFolders();
    }
    
    generateDemoEmails() {
        const senders = [
            { name: 'John Smith', email: 'john@company.com' },
            { name: 'Sarah Johnson', email: 'sarah@startup.io' },
            { name: 'GitHub', email: 'noreply@github.com' },
            { name: 'LinkedIn', email: 'notifications@linkedin.com' },
            { name: 'Amazon', email: 'orders@amazon.com' },
            { name: 'Netflix', email: 'info@netflix.com' },
            { name: 'Team Lead', email: 'lead@company.com' },
            { name: 'HR Department', email: 'hr@company.com' },
            { name: 'Support Team', email: 'support@service.com' },
            { name: 'Newsletter', email: 'news@techblog.com' }
        ];
        
        const subjects = [
            'Weekly Team Meeting Notes',
            'Project Update - Q4 Goals',
            'Your order has been shipped',
            'Security Alert: New login detected',
            'Welcome to our platform!',
            'Invoice #12345 - Payment Due',
            'Meeting Reminder: Tomorrow 2PM',
            'New features available now',
            'Password reset request',
            'Monthly Newsletter - Tech Updates',
            'Vacation Request Approved',
            'System Maintenance Scheduled',
            'New comment on your post',
            'Quarterly Review Meeting',
            'Software Update Available'
        ];
        
        const snippets = [
            'Hi there! I wanted to follow up on our conversation from yesterday...',
            'Please find attached the documents you requested. Let me know if you need...',
            'Thank you for your recent purchase. Your order is being processed and will...',
            'We noticed a new login to your account from an unrecognized device...',
            'Welcome aboard! We\'re excited to have you join our community...',
            'Your monthly invoice is ready. Please review the charges and submit...',
            'Just a friendly reminder about our meeting scheduled for tomorrow...',
            'We\'ve just released some exciting new features that we think you\'ll love...',
            'Someone requested a password reset for your account. If this wasn\'t you...',
            'Here\'s what\'s been happening in the tech world this month...',
            'Great news! Your vacation request has been approved by management...',
            'We\'ll be performing scheduled maintenance on our servers this weekend...',
            'John Smith commented on your recent post about project management...',
            'It\'s time for your quarterly performance review. Please schedule a meeting...',
            'A new software update is available for download. This update includes...'
        ];
        
        const emails = [];
        
        for (let i = 0; i < 50; i++) {
            const sender = senders[Math.floor(Math.random() * senders.length)];
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const snippet = snippets[Math.floor(Math.random() * snippets.length)];
            
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            date.setHours(Math.floor(Math.random() * 24));
            date.setMinutes(Math.floor(Math.random() * 60));
            
            const folders = ['inbox', 'sent', 'drafts', 'spam', 'trash'];
            const folder = i < 35 ? 'inbox' : folders[Math.floor(Math.random() * folders.length)];
            
            emails.push({
                id: i + 1,
                sender: sender.name,
                email: sender.email,
                subject: subject,
                snippet: snippet,
                body: this.generateEmailBody(snippet),
                date: date,
                unread: Math.random() > 0.6,
                starred: Math.random() > 0.8,
                folder: folder,
                labels: this.generateRandomLabels()
            });
        }
        
        return emails.sort((a, b) => b.date - a.date);
    }
    
    generateEmailBody(snippet) {
        const bodies = [
            `${snippet}

I hope this email finds you well. I wanted to reach out regarding the upcoming project deadlines and discuss how we can best move forward.

Key points to consider:
• Timeline adjustments may be necessary
• Resource allocation needs review
• Stakeholder communication is crucial

Please let me know your thoughts on this matter. I'm available for a call this week if you'd like to discuss further.

Best regards,
Team Lead`,
            
            `${snippet}

Thank you for your continued partnership with our organization. We value your business and want to ensure you have the best possible experience.

This month's highlights:
- New feature releases
- Performance improvements
- Enhanced security measures

If you have any questions or concerns, please don't hesitate to reach out to our support team.

Sincerely,
Customer Success Team`,
            
            `${snippet}

I'm writing to provide you with an update on the current status of your request. We've made significant progress and wanted to keep you informed.

Current status:
✓ Initial review completed
✓ Documentation gathered
⏳ Final approval pending
⏳ Implementation scheduled

We expect to have everything completed by the end of this week. Thank you for your patience.

Best,
Project Manager`
        ];
        
        return bodies[Math.floor(Math.random() * bodies.length)];
    }
    
    generateRandomLabels() {
        const allLabels = ['Work', 'Personal', 'Important', 'Travel', 'Finance'];
        const numLabels = Math.floor(Math.random() * 3);
        const labels = [];
        
        for (let i = 0; i < numLabels; i++) {
            const label = allLabels[Math.floor(Math.random() * allLabels.length)];
            if (!labels.includes(label)) {
                labels.push(label);
            }
        }
        
        return labels;
    }
    
    generateDemoFolders() {
        return [
            { name: 'inbox', displayName: 'Inbox', count: this.emails.filter(e => e.folder === 'inbox' && e.unread).length },
            { name: 'starred', displayName: 'Starred', count: this.emails.filter(e => e.starred).length },
            { name: 'sent', displayName: 'Sent', count: this.emails.filter(e => e.folder === 'sent').length },
            { name: 'drafts', displayName: 'Drafts', count: this.emails.filter(e => e.folder === 'drafts').length },
            { name: 'spam', displayName: 'Spam', count: this.emails.filter(e => e.folder === 'spam').length },
            { name: 'trash', displayName: 'Trash', count: this.emails.filter(e => e.folder === 'trash').length }
        ];
    }
    
    // Simulate API calls with promises
    async login(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email && password) {
                    const token = 'demo-jwt-token-' + Date.now();
                    resolve({
                        token,
                        user: this.currentUser
                    });
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1000);
        });
    }
    
    async getEmails(folder = 'inbox', limit = 50, offset = 0) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let filteredEmails = this.emails;
                
                if (folder === 'starred') {
                    filteredEmails = this.emails.filter(e => e.starred);
                } else if (folder !== 'all') {
                    filteredEmails = this.emails.filter(e => e.folder === folder);
                }
                
                const paginatedEmails = filteredEmails.slice(offset, offset + limit);
                
                resolve({
                    emails: paginatedEmails,
                    total: filteredEmails.length,
                    folder
                });
            }, 500);
        });
    }
    
    async getEmail(emailId) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const email = this.emails.find(e => e.id === parseInt(emailId));
                if (email) {
                    resolve(email);
                } else {
                    reject(new Error('Email not found'));
                }
            }, 300);
        });
    }
    
    async sendEmail(emailData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newEmail = {
                    id: this.emails.length + 1,
                    sender: this.currentUser.name,
                    email: this.currentUser.username,
                    subject: emailData.subject,
                    snippet: emailData.body.substring(0, 100),
                    body: emailData.body,
                    date: new Date(),
                    unread: false,
                    starred: false,
                    folder: 'sent',
                    labels: []
                };
                
                this.emails.unshift(newEmail);
                resolve({ message: 'Email sent successfully', messageId: newEmail.id });
            }, 1000);
        });
    }
    
    async markAsRead(emailId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const email = this.emails.find(e => e.id === parseInt(emailId));
                if (email) {
                    email.unread = false;
                }
                resolve({ message: 'Email marked as read' });
            }, 200);
        });
    }
    
    async toggleStar(emailId, starred) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const email = this.emails.find(e => e.id === parseInt(emailId));
                if (email) {
                    email.starred = starred;
                }
                resolve({ message: 'Star status updated' });
            }, 200);
        });
    }
    
    async deleteEmail(emailId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const emailIndex = this.emails.findIndex(e => e.id === parseInt(emailId));
                if (emailIndex !== -1) {
                    this.emails[emailIndex].folder = 'trash';
                }
                resolve({ message: 'Email moved to trash' });
            }, 300);
        });
    }
    
    async getFolders() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ folders: this.folders });
            }, 200);
        });
    }
    
    async getUserInfo() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.currentUser);
            }, 200);
        });
    }
}

// Export for use in other modules
window.DemoDataProvider = DemoDataProvider;