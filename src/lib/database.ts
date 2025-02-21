import Database from 'better-sqlite3';

// Open database
const db = new Database('database.sqlite');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE
  )
`);

// Insert data
const insert = db.prepare(`INSERT INTO users (name, email) VALUES (?, ?)`);
insert.run('Bob', 'bob@example.com');

// Query data
const users = db.prepare(`SELECT * FROM users`).all();
console.log('Users:', users);

// Close database
db.close();
