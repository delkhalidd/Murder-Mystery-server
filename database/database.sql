DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS teacher_input;
DROP TABLE IF EXISTS briefs;
DROP TABLE IF EXISTS accepted_invites;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
   id INT GENERATED ALWAYS AS IDENTITY,
   firstname VARCHAR(30) NOT NULL,
   surnames VARCHAR(30) NOT NULL,
   username VARCHAR(30) UNIQUE NOT NULL,
   email VARCHAR(50) UNIQUE NOT NULL,
   password CHAR(60) NOT NULL,
   account_type INT NOT NULL,
   PRIMARY KEY (id)
);

CREATE TABLE cases (
   id INT GENERATED ALWAYS AS IDENTITY,
   created_at TIMESTAMP NOT NULL,
   created_by INT NOT NULL,
   title VARCHAR(50) NOT NULL,
   description TEXT,
   invite_token VARCHAR(64) NOT NULL,
   PRIMARY KEY (id),
   FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE accepted_invites (
    id INT GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMP NOT NULL,
    case_id INT NOT NULL,
    user_id INT NOT NULL,
    date_started DATE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE briefs (
    id INT GENERATED ALWAYS AS IDENTITY,
    case_id INT NOT NULL,
    body TEXT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE teacher_input (
    id INT GENERATED ALWAYS AS IDENTITY,
    case_id INT NOT NULL,
    body TEXT NOT NULL,
    answer TEXT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE questions (
    id INT GENERATED ALWAYS AS IDENTITY,
    input_id INT NOT NULL,
    body TEXT NOT NULL,
    answer TEXT NOT NULL,
    case_id INT NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (input_id) REFERENCES teacher_input(id),
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

CREATE TABLE answers (
    id INT GENERATED ALWAYS AS IDENTITY,
    case_id INT NOT NULL,
    question_id INT NOT NULL,
    user_id INT NOT NULL,
    correct BOOLEAN NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- test users, john is a teacher, jane is a student. password test_user

INSERT INTO users(firstname, surnames, username, email, password, account_type)
VALUES ('John', 'Doe', 'john_doe', 'john@example.com', '$2a$10$PydrbiNDTPfJJPi.NxDNeOXIGWv2p5.uA76FCkvWogsjkTVFFZRra', 0);

INSERT INTO users(firstname, surnames, username, email, password, account_type)
VALUES ('Jane', 'Doe', 'jane_doe', 'jane@example.com', '$2a$10$PydrbiNDTPfJJPi.NxDNeOXIGWv2p5.uA76FCkvWogsjkTVFFZRra', 1);
