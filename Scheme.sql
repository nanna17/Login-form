-- ============================================================
--  Vault App  —  Database Schema
--  Run once to create the database and table manually if needed
-- ============================================================

CREATE DATABASE IF NOT EXISTS vault_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE vault_app;

CREATE TABLE IF NOT EXISTS users (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify
DESCRIBE users;