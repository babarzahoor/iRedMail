// FusionMail - Email Client JavaScript

class FusionMail {
    constructor() {
        this.currentFolder = 'inbox';
        this.selectedEmails = new Set();
        this.emails = this.generateSampleEmails();
        this.currentEmail = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderEmailList();
        this.updateEmailCount();
    }
    
    bindEvents() {
        // Menu toggle
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Compose button
        document.getElementById('composeBtn').addEventListener('click', () => {
            this.openCompose();
        });
        
        // Close compose
        document.getElementById('closeCompose').addEventListener('click', () => {
            this.closeCompose();
        });
        
        // Compose form
        document.getElementById('composeForm').addEventListener('submit', (e) => {
            this.sendEmail(e);
        });
        
        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showEmailList();
        });
        
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchFolder(item.dataset.folder);
            });
        });
        
        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            this.selectAllEmails(e.target.checked);
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchEmails(e.target.value);
        });
        
        // Overlay click
        document.getElementById('overlay').addEventListener('click', () => {
            this.closeSidebar();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    generateSampleEmails() {
        const sampleEmails = [
            {
                id: 1,
                sender: 'John Doe',
                email: 'john.doe@example.com',
                subject: 'Welcome to FusionMail!',
                snippet: 'Thank you for choosing FusionMail as your email client. We hope you enjoy the experience.',
                body: `Dear User,

Welcome to FusionMail! We're excited to have you on board.

FusionMail is designed to provide you with a clean, efficient, and powerful email experience. Here are some key features:

• Modern, responsive design
• Advanced search capabilities
• Smart organization with labels
• Seamless integration with your workflow

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Best regards,
The FusionMail Team`,
                date: new Date('2024-01-15T10:30:00'),
                unread: true,
                starred: false,
                labels: ['Welcome'],
                folder: 'inbox'
            },
            {
                id: 2,
                sender: 'Sarah Wilson',
                email: 'sarah.wilson@company.com',
                subject: 'Project Update - Q1 2024',
                snippet: 'Here\'s the latest update on our Q1 projects. Please review the attached documents.',
                body: `Hi Team,

I wanted to share the latest updates on our Q1 2024 projects:

Project Alpha:
- Development: 85% complete
- Testing: In progress
- Expected completion: End of January

Project Beta:
- Planning phase completed
- Development starting next week
- Timeline: 6 weeks

Please review the attached documents and let me know if you have any questions.

Best,
Sarah`,
                date: new Date('2024-01-14T14:20:00'),
                unread: true,
                starred: true,
                labels: ['Work', 'Important'],
                folder: 'inbox'
            },
            {
                id: 3,
                sender: 'Netflix',
                email: 'info@netflix.com',
                subject: 'New releases this week',
                snippet: 'Check out the latest movies and TV shows added to Netflix this week.',
                body: `Hello,

This week on Netflix:

New Movies:
• The Latest Blockbuster
• Indie Film Festival Winner
• Classic Movie Remastered

New TV Shows:
• Drama Series Season 2
• Comedy Special
• Documentary Series

Enjoy watching!

The Netflix Team`,
                date: new Date('2024-01-13T09:15:00'),
                unread: false,
                starred: false,
                labels: ['Entertainment'],
                folder: 'inbox'
            },
            {
                id: 4,
                sender: 'Bank of America',
                email: 'alerts@bankofamerica.com',
                subject: 'Your monthly statement is ready',
                snippet: 'Your January 2024 statement is now available for download.',
                body: `Dear Customer,

Your monthly statement for January 2024 is now available.

Account Summary:
- Beginning Balance: $2,450.00
- Deposits: $3,200.00
- Withdrawals: $1,890.00
- Ending Balance: $3,760.00

You can download your statement by logging into your online banking account.

Thank you for banking with us.

Bank of America`,
                date: new Date('2024-01-12T16:45:00'),
                unread: false,
                starred: false,
                labels: ['Finance'],
                folder: 'inbox'
            },
            {
                id: 5,
                sender: 'GitHub',
                email: 'noreply@github.com',
                subject: '[GitHub] Security alert: New sign-in',
                snippet: 'A new sign-in to your account was detected from a new device.',
                body: `Hi there,

We detected a new sign-in to your GitHub account from:

Device: Chrome on macOS
Location: San Francisco, CA
Time: January 11, 2024 at 2:30 PM PST

If this was you, you can safely ignore this email. If this wasn't you, please secure your account immediately.

GitHub Security Team`,
                date: new Date('2024-01-11T14:30:00'),
                unread: false,
                starred: false,
                labels: ['Security'],
                folder: 'inbox'
            }
        ];
        
        return sampleEmails;
    }
    
    renderEmailList() {
        const emailListContent = document.getElementById('emailListContent');
        const filteredEmails = this.emails.filter(email => email.folder === this.currentFolder);
        
        if (filteredEmails.length === 0) {
            emailListContent.innerHTML = `
                <div class="loading">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📧</div>
                        <div>No emails in ${this.currentFolder}</div>
                    </div>
                </div>
            `;
            return;
        }
        
        emailListContent.innerHTML = filteredEmails.map(email => `
            <div class="email-item ${email.unread ? 'unread' : ''} ${this.selectedEmails.has(email.id) ? 'selected' : ''}" 
                 data-email-id="${email.id}">
                <label class="checkbox-container email-checkbox">
                    <input type="checkbox" ${this.selectedEmails.has(email.id) ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                
                <button class="email-star ${email.starred ? 'starred' : ''}" data-email-id="${email.id}">
                    <span class="material-icons">${email.starred ? 'star' : 'star_border'}</span>
                </button>
                
                <div class="email-sender">${email.sender}</div>
                
                <div class="email-subject">
                    ${email.subject}
                    <span class="email-snippet">- ${email.snippet}</span>
                </div>
                
                <div class="email-labels">
                    ${email.labels.map(label => `<span class="email-label">${label}</span>`).join('')}
                </div>
                
                <div class="email-date">${this.formatDate(email.date)}</div>
            </div>
        `).join('');
        
        // Bind email item events
        this.bindEmailItemEvents();
    }
    
    bindEmailItemEvents() {
        // Email item clicks
        document.querySelectorAll('.email-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.email-checkbox') || e.target.closest('.email-star')) {
                    return;
                }
                
                const emailId = parseInt(item.dataset.emailId);
                this.openEmail(emailId);
            });
        });
        
        // Checkbox clicks
        document.querySelectorAll('.email-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const emailId = parseInt(e.target.closest('.email-item').dataset.emailId);
                this.toggleEmailSelection(emailId, e.target.checked);
            });
        });
        
        // Star clicks
        document.querySelectorAll('.email-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const emailId = parseInt(star.dataset.emailId);
                this.toggleEmailStar(emailId);
            });
        });
    }
    
    openEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (!email) return;
        
        this.currentEmail = email;
        
        // Mark as read
        if (email.unread) {
            email.unread = false;
            this.updateEmailCount();
        }
        
        // Render email content
        document.getElementById('emailContent').innerHTML = `
            <div class="email-meta">
                <h1 class="email-subject-line">${email.subject}</h1>
                <div class="email-from">
                    <div class="sender-avatar">${email.sender.charAt(0).toUpperCase()}</div>
                    <div class="sender-info">
                        <div class="sender-name">${email.sender}</div>
                        <div class="sender-email">&lt;${email.email}&gt;</div>
                    </div>
                    <div class="email-date-full">${this.formatFullDate(email.date)}</div>
                </div>
            </div>
            <div class="email-body">${email.body}</div>
        `;
        
        // Show email view
        this.showEmailView();
    }
    
    showEmailView() {
        document.getElementById('emailList').style.display = 'none';
        document.getElementById('emailView').style.display = 'flex';
    }
    
    showEmailList() {
        document.getElementById('emailView').style.display = 'none';
        document.getElementById('emailList').style.display = 'flex';
        this.renderEmailList();
    }
    
    toggleEmailSelection(emailId, selected) {
        if (selected) {
            this.selectedEmails.add(emailId);
        } else {
            this.selectedEmails.delete(emailId);
        }
        
        this.updateSelectAllCheckbox();
        this.renderEmailList();
    }
    
    selectAllEmails(selectAll) {
        const visibleEmails = this.emails.filter(email => email.folder === this.currentFolder);
        
        if (selectAll) {
            visibleEmails.forEach(email => this.selectedEmails.add(email.id));
        } else {
            visibleEmails.forEach(email => this.selectedEmails.delete(email.id));
        }
        
        this.renderEmailList();
    }
    
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAll');
        const visibleEmails = this.emails.filter(email => email.folder === this.currentFolder);
        const selectedVisibleEmails = visibleEmails.filter(email => this.selectedEmails.has(email.id));
        
        if (selectedVisibleEmails.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedVisibleEmails.length === visibleEmails.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
    
    toggleEmailStar(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.starred = !email.starred;
            this.renderEmailList();
        }
    }
    
    switchFolder(folder) {
        this.currentFolder = folder;
        this.selectedEmails.clear();
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folder}"]`).classList.add('active');
        
        this.renderEmailList();
        this.showEmailList();
    }
    
    updateEmailCount() {
        const unreadCount = this.emails.filter(email => 
            email.folder === 'inbox' && email.unread
        ).length;
        
        const countElement = document.querySelector('[data-folder="inbox"] .count');
        if (countElement) {
            countElement.textContent = unreadCount;
            countElement.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    }
    
    searchEmails(query) {
        if (!query.trim()) {
            this.renderEmailList();
            return;
        }
        
        const emailListContent = document.getElementById('emailListContent');
        const filteredEmails = this.emails.filter(email => {
            return email.folder === this.currentFolder && (
                email.sender.toLowerCase().includes(query.toLowerCase()) ||
                email.subject.toLowerCase().includes(query.toLowerCase()) ||
                email.snippet.toLowerCase().includes(query.toLowerCase()) ||
                email.body.toLowerCase().includes(query.toLowerCase())
            );
        });
        
        emailListContent.innerHTML = filteredEmails.map(email => `
            <div class="email-item ${email.unread ? 'unread' : ''}" data-email-id="${email.id}">
                <label class="checkbox-container email-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                </label>
                
                <button class="email-star ${email.starred ? 'starred' : ''}" data-email-id="${email.id}">
                    <span class="material-icons">${email.starred ? 'star' : 'star_border'}</span>
                </button>
                
                <div class="email-sender">${email.sender}</div>
                
                <div class="email-subject">
                    ${email.subject}
                    <span class="email-snippet">- ${email.snippet}</span>
                </div>
                
                <div class="email-labels">
                    ${email.labels.map(label => `<span class="email-label">${label}</span>`).join('')}
                </div>
                
                <div class="email-date">${this.formatDate(email.date)}</div>
            </div>
        `).join('');
        
        this.bindEmailItemEvents();
    }
    
    openCompose() {
        const composeModal = document.getElementById('composeModal');
        const overlay = document.getElementById('overlay');
        
        composeModal.classList.add('open');
        overlay.classList.add('active');
        
        // Focus on the "To" field
        setTimeout(() => {
            document.getElementById('composeTo').focus();
        }, 300);
    }
    
    closeCompose() {
        const composeModal = document.getElementById('composeModal');
        const overlay = document.getElementById('overlay');
        
        composeModal.classList.remove('open');
        overlay.classList.remove('active');
        
        // Clear form
        document.getElementById('composeForm').reset();
    }
    
    sendEmail(e) {
        e.preventDefault();
        
        const to = document.getElementById('composeTo').value;
        const subject = document.getElementById('composeSubject').value;
        const body = document.getElementById('composeBody').value;
        
        if (!to || !subject) {
            alert('Please fill in the required fields (To and Subject)');
            return;
        }
        
        // Simulate sending email
        console.log('Sending email:', { to, subject, body });
        
        // Show success message
        this.showNotification('Email sent successfully!');
        
        // Close compose modal
        this.closeCompose();
        
        // Add to sent folder (simulation)
        const newEmail = {
            id: Date.now(),
            sender: 'You',
            email: 'you@fusionmail.com',
            subject: subject,
            snippet: body.substring(0, 100) + '...',
            body: body,
            date: new Date(),
            unread: false,
            starred: false,
            labels: [],
            folder: 'sent'
        };
        
        this.emails.unshift(newEmail);
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
    
    handleKeyboardShortcuts(e) {
        // Compose (C)
        if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !this.isTyping()) {
            e.preventDefault();
            this.openCompose();
        }
        
        // Escape key
        if (e.key === 'Escape') {
            if (document.getElementById('composeModal').classList.contains('open')) {
                this.closeCompose();
            } else if (document.getElementById('emailView').style.display === 'flex') {
                this.showEmailList();
            }
        }
        
        // Search (/)
        if (e.key === '/' && !this.isTyping()) {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    }
    
    isTyping() {
        const activeElement = document.activeElement;
        return activeElement.tagName === 'INPUT' || 
               activeElement.tagName === 'TEXTAREA' || 
               activeElement.contentEditable === 'true';
    }
    
    handleResize() {
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    }
    
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: #323232;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
    
    formatFullDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new FusionMail();
});