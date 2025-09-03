-- Create staging tables with _staging suffix
CREATE SCHEMA IF NOT EXISTS staging;

-- Copy main tables to staging schema
CREATE TABLE staging.users AS SELECT * FROM users WHERE false;
CREATE TABLE staging.subscriptions AS SELECT * FROM subscriptions WHERE false;
CREATE TABLE staging.api_keys AS SELECT * FROM api_keys WHERE false;
CREATE TABLE staging.usage_stats AS SELECT * FROM usage_stats WHERE false;

-- Insert test data
INSERT INTO staging.users (email, name, role, "emailVerified") 
VALUES ('staging@n0de.pro', 'Staging User', 'ADMIN', true);

INSERT INTO staging.subscriptions (plan, status, "startDate", "endDate")
VALUES ('ENTERPRISE', 'active', NOW(), NOW() + INTERVAL '1 year');
