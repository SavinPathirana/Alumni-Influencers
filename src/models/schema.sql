--Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expiry DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--Profiles Table 
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    bio TEXT,
    profile_image_url VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

--Degrees Table 
CREATE TABLE degrees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    institution VARCHAR(255) NOT NULL,
    degree_name VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

--Certifications Table
CREATE TABLE certifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE,
    expiration_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(255),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

--Licences Table
CREATE TABLE licences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE,
    expiration_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(255),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

--Short Courses Table
CREATE TABLE short_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    institution VARCHAR(255) NOT NULL,
    completion_date DATE,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

--Employment History Table
CREATE TABLE employment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    description TEXT,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

--Blind Bidding System Table
CREATE TABLE bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_date DATE NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'won', 'lost') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Required to determine who bid first in a tie
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);