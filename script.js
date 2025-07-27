// FusionMail - Email Client JavaScript

class FusionMail {
    constructor() {
        // Enable demo mode when no iRedMail server is available
        this.client = new IRedMailClient('http://localhost:3001/api', true);
        this.currentFolder = 'inbox';
        this.selectedEmails = new Set();
        this.emails = [];
        this.currentEmail = null;
        
        this.init();
    }
    
    async init() {
        // In demo mode, auto-login for development
        if (this.client.demoMode && !this.client.isAuthenticated()) {
            try {
                await this.client.login('demo@fusionmail.com', 'demo123');
            } catch (error) {
                console.error('Demo login failed:', error);
                window.location.href = 'login.html';
                return;
            }
        } else if (!this.client.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        this.bindEvents();
        await this.loadEmails();
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
        
        // Logout functionality
        this.addLogoutButton();
    }
    
    addLogoutButton() {
        const headerRight = document.querySelector('.header-right');
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'header-btn';
        logoutBtn.title = 'Logout';
        logoutBtn.innerHTML = '<span class="material-icons">logout</span>';
        logoutBtn.addEventListener('click', () => this.logout());
        headerRight.insertBefore(logoutBtn, headerRight.firstChild);
    }
    
    async logout() {
        try {
            await this.client.logout();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            window.location.href = 'login.html';
        }
    }
    
    async loadEmails() {
        try {
            this.showLoading();
            const response = await this.client.getEmails(this.currentFolder.toUpperCase());
            this.emails = response.emails || [];
            this.renderEmailList();
        } catch (error) {
            console.error('Failed to load emails:', error);
            this.showError('Failed to load emails. Please try again.');
        }
    }
    
    showLoading() {
        const emailListContent = document.getElementById('emailListContent');
        emailListContent.innerHTML = '<div class="loading"></div>';
    }
    
    showError(message) {
        const emailListContent = document.getElementById('emailListContent');
        emailListContent.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #5f6368;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
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
    
    async openEmail(emailId) {
        try {
            // Fetch full email content from API
            const email = await this.client.getEmail(emailId);
            if (!email || !email.email) {
                console.error('Email data is incomplete:', email);
                this.showNotification('Failed to load email content');
                return;
            }
        
            this.currentEmail = email;
        
            // Mark as read
            if (email.unread) {
                await this.client.markAsRead(emailId);
                email.unread = false;
                this.updateEmailCount();
            }
        } catch (error) {
            console.error('Failed to open email:', error);
            this.showNotification('Failed to load email content');
            return;
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
    
    async toggleEmailStar(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            const newStarred = !email.starred;
            try {
                await this.client.toggleStar(emailId, newStarred);
                email.starred = newStarred;
            } catch (error) {
                console.error('Failed to toggle star:', error);
                this.showNotification('Failed to update star status');
                return;
            }
            this.renderEmailList();
        }
    }
    
    async switchFolder(folder) {
        this.currentFolder = folder;
        this.selectedEmails.clear();
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-folder="${folder}"]`).classList.add('active');
        
        await this.loadEmails();
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
    
    async sendEmail(e) {
        e.preventDefault();
        
        const to = document.getElementById('composeTo').value;
        const cc = document.getElementById('composeCc').value;
        const bcc = document.getElementById('composeBcc').value;
        const subject = document.getElementById('composeSubject').value;
        const body = document.getElementById('composeBody').value;
        
        if (!to || !subject) {
            alert('Please fill in the required fields (To and Subject)');
            return;
        }
        
        try {
            // Show sending state
            const sendBtn = document.querySelector('.send-btn');
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="material-icons">hourglass_empty</span> Sending...';
            
            await this.client.sendEmail({ to, cc, bcc, subject, body });
            
            this.showNotification('Email sent successfully!');
            this.closeCompose();
            
            // Refresh email list if we're in sent folder
            if (this.currentFolder === 'sent') {
                await this.loadEmails();
            }
            
        } catch (error) {
            console.error('Failed to send email:', error);
            this.showNotification('Failed to send email. Please try again.');
        } finally {
            // Reset send button
            const sendBtn = document.querySelector('.send-btn');
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="material-icons">send</span> Send';
        }
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