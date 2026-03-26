-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles Table (1-to-1)
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    bio TEXT,
    linkedin_url VARCHAR(255),
    monthly_appearance_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Degrees Table (1-to-Many for 3NF compliance)
CREATE TABLE degrees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    official_url VARCHAR(255) NOT NULL,
    completion_date DATE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);