// iRedMail API Client for FusionMail
class IRedMailClient {
    constructor(apiBaseUrl = 'http://localhost:3001/api', demoMode = false) {
        this.apiBaseUrl = apiBaseUrl;
        this.demoMode = demoMode;
        this.token = localStorage.getItem('fusionmail_token');
        this.user = JSON.parse(localStorage.getItem('fusionmail_user') || 'null');
        
        // Initialize demo provider if in demo mode
        if (this.demoMode) {
            this.demoProvider = new DemoDataProvider();
        }
    }
    
    // Authentication methods
    async login(email, password) {
        if (this.demoMode) {
            const data = await this.demoProvider.login(email, password);
            this.token = data.token;
            this.user = data.user;
            localStorage.setItem('fusionmail_token', this.token);
            localStorage.setItem('fusionmail_user', JSON.stringify(this.user));
            return data;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            this.token = data.token;
            this.user = data.user;
            
            // Store in localStorage
            localStorage.setItem('fusionmail_token', this.token);
            localStorage.setItem('fusionmail_user', JSON.stringify(this.user));
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    
    async logout() {
        try {
            if (this.token) {
                await fetch(`${this.apiBaseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.token = null;
            this.user = null;
            localStorage.removeItem('fusionmail_token');
            localStorage.removeItem('fusionmail_user');
        }
    }
    
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }
    
    // Email methods
    async getEmails(folder = 'INBOX', limit = 50, offset = 0) {
        if (this.demoMode) {
            return await this.demoProvider.getEmails(folder.toLowerCase(), limit, offset);
        }
        
        try {
            const params = new URLSearchParams({
                folder,
                limit: limit.toString(),
                offset: offset.toString()
            });
            
            const response = await fetch(`${this.apiBaseUrl}/protected/emails?${params}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch emails');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Get emails error:', error);
            throw error;
        }
    }
    
    async getEmail(emailId) {
        if (this.demoMode) {
            return await this.demoProvider.getEmail(emailId);
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/emails/${emailId}`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch email');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Get email error:', error);
            throw error;
        }
    }
    
    async sendEmail(emailData) {
        if (this.demoMode) {
            return await this.demoProvider.sendEmail(emailData);
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/emails/send`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(emailData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send email');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Send email error:', error);
            throw error;
        }
    }
    
    async markAsRead(emailId) {
        if (this.demoMode) {
            return await this.demoProvider.markAsRead(emailId);
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/emails/${emailId}/read`, {
                method: 'PUT',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark email as read');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Mark as read error:', error);
            throw error;
        }
    }
    
    async toggleStar(emailId, starred) {
        if (this.demoMode) {
            return await this.demoProvider.toggleStar(emailId, starred);
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/emails/${emailId}/star`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ starred })
            });
            
            if (!response.ok) {
                throw new Error('Failed to toggle star');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Toggle star error:', error);
            throw error;
        }
    }
    
    async deleteEmail(emailId) {
        if (this.demoMode) {
            return await this.demoProvider.deleteEmail(emailId);
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/emails/${emailId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete email');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Delete email error:', error);
            throw error;
        }
    }
    
    async getFolders() {
        if (this.demoMode) {
            return await this.demoProvider.getFolders();
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/folders`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch folders');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Get folders error:', error);
            throw error;
        }
    }
    
    async getUserInfo() {
        if (this.demoMode) {
            return await this.demoProvider.getUserInfo();
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/protected/user/info`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Get user info error:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.IRedMailClient = IRedMailClient;