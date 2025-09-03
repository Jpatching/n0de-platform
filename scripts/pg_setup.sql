-- PostgreSQL setup commands
CREATE DATABASE IF NOT EXISTS n0de_production;
ALTER USER postgres PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE n0de_production TO postgres;