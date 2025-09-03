-- N0DE PostgreSQL Security Hardening

-- Enable SSL
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/etc/postgresql/ssl/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/postgresql/ssl/server.key';

-- Password Security
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.2';

-- Connection Security
ALTER SYSTEM SET listen_addresses = 'localhost';
ALTER SYSTEM SET port = 5432;
ALTER SYSTEM SET max_connections = 200;

-- Logging (Security Audit)
ALTER SYSTEM SET logging_collector = 'on';
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET log_directory = '/var/log/postgresql';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';

-- Security Logging
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create secure backup user
CREATE USER backup_user WITH PASSWORD 'secure_backup_password_2024' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;

SELECT pg_reload_conf();
