const IRedMailConnector = require('./iredmail-connector');

// Configuration - Update these values for your iRedMail setup
const config = {
    // Database configuration (iRedMail vmail database)
    db_host: process.env.DB_HOST || 'localhost',
    db_port: process.env.DB_PORT || 3306,
    db_user: process.env.DB_USER || 'vmailadmin',
    db_password: process.env.DB_PASSWORD || 'your_vmailadmin_password',
    db_name: process.env.DB_NAME || 'vmail',
    
    // SMTP configuration (Postfix)
    smtp_host: process.env.SMTP_HOST || 'localhost',
    smtp_port: process.env.SMTP_PORT || 587,
    
    // IMAP configuration (Dovecot)
    imap_host: process.env.IMAP_HOST || 'localhost',
    imap_port: process.env.IMAP_PORT || 143,
    
    // iRedMail specific paths
    storage_base: process.env.STORAGE_BASE || '/var/vmail/vmail1',
    dovecot_deliver: process.env.DOVECOT_DELIVER || '/usr/libexec/dovecot/deliver',
    
    // JWT secret for authentication
    jwt_secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key'
};

// Create and start the connector
const connector = new IRedMailConnector(config);
connector.start(3001);

console.log('iRedMail Backend Connector started');
console.log('API endpoints available at http://localhost:3001/api/');