const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

// Create a persistent database connection with proper path
const db = new sqlite3.Database(path.join(__dirname, '..', "data", "users.db"), (err) => {
  if (err) {
    console.error("Error connecting to users database:", err.message);
  } else {
    console.log("Connected to the users database.");

    // Ensure the users table exists
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
      } else {
        console.log("Users table ready");
      }
    });
  }
});

// Function to register a new user
const registerUser = (username, password, firstName, lastName, callback) => {
  console.log(`Attempting to register user: ${username}`);

  // Hash password before storing
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error("Error hashing password:", err.message);
      return callback(err, null);
    }

    // Check if username already exists
    db.get("SELECT username FROM users WHERE username = ?", [username], (err, row) => {
      if (err) {
        console.error("Error checking username:", err.message);
        return callback(err, null);
      }

      if (row) {
        // Username already exists
        const error = new Error("Username already exists");
        error.code = "SQLITE_CONSTRAINT";
        return callback(error, null);
      }

      // Insert new user
      db.run(
        "INSERT INTO users (username, password, firstName, lastName) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, firstName || null, lastName || null],
        function (err) {
          if (err) {
            console.error("Error inserting user:", err.message);
            return callback(err, null);
          }
          console.log(`User registered successfully with ID: ${this.lastID}`);
          callback(null, { id: this.lastID, username, firstName, lastName });
        }
      );
    });
  });
};

// Function to authenticate user during login
const loginUser = (username, password, callback) => {
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return callback(err, null);
    if (!user) return callback(null, { error: "User not found" });

    // Compare provided password with stored hash
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return callback(err, null);
      if (!result) return callback(null, { error: "Invalid password" });

      callback(null, {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    });
  });
};

module.exports = { registerUser, loginUser };