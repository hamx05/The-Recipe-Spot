const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")
const bodyParser = require("body-parser")
const jwt = require("jsonwebtoken")
const path = require("path")
const { registerUser, loginUser } = require("./auth")
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const SECRET_KEY = process.env.SECRET_KEY;

const app = express()
const PORT = 5000

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: "50mb" })) // Increased limit for image uploads
app.use(express.static(path.join(__dirname, "public")))
app.use(express.static(path.join(__dirname, "views")))

// Connect to SQLite Databases
const usersDb = new sqlite3.Database(path.join(__dirname, '..', "data", "users.db"), (err) => {
  if (err) console.error("Error opening users database:", err)
  else console.log("Connected to users SQLite database.")
})

const recipesDb = new sqlite3.Database(path.join(__dirname, '..', "data", "recipes.db"), (err) => {
  if (err) console.error("Error opening recipes database:", err)
  else {
    console.log("Connected to recipes SQLite database.")

    // Create recipes table if it doesn't exist
    recipesDb.run(
      `
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                image TEXT,
                prepTime INTEGER,
                cookTime INTEGER,
                servings INTEGER,
                calories INTEGER,
                difficulty TEXT,
                ingredients TEXT NOT NULL,
                method TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `,
      (err) => {
        if (err) console.error("Error creating recipes table:", err)
        else console.log("Recipes table ready")
      },
    )

    // Create comments table if it doesn't exist
    recipesDb.run(
      `
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipeId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                username TEXT NOT NULL,
                text TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
            )
        `,
      (err) => {
        if (err) console.error("Error creating comments table:", err)
        else console.log("Comments table ready")
      },
    )

    // Create likes table to track which users liked which recipes
    recipesDb.run(
      `
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipeId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(recipeId, userId),
                FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
            )
        `,
      (err) => {
        if (err) console.error("Error creating likes table:", err)
        else console.log("Likes table ready")
      },
    )

    // Create ratings table
    recipesDb.run(
      `
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipeId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(recipeId, userId),
                FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE
            )
        `,
      (err) => {
        if (err) console.error("Error creating ratings table:", err)
        else console.log("Ratings table ready")
      },
    )
  }
})

// Create users table if it doesn't exist
usersDb.run(
  `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT,
        lastName TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`,
  (err) => {
    if (err) console.error("Error creating users table:", err)
    else console.log("Users table ready")
  },
)

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) return res.status(401).json({ error: "Access denied. No token provided." })

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token." })
    req.user = user
    next()
  })
}

// **Signup Route**
app.post("/signup", (req, res) => {
  const { username, password, firstName, lastName } = req.body

  console.log("Signup request received:", { username, firstName, lastName })

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." })
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters with one uppercase letter and one number.",
    })
  }

  registerUser(username, password, firstName, lastName, (err, user) => {
    if (err) {
      console.error("Registration error:", err)

      if (err.code === "SQLITE_CONSTRAINT") {
        return res.status(400).json({ error: "Username already exists." })
      }
      return res.status(500).json({ error: "Error registering user: " + err.message })
    }
    res.json({ message: "User registered successfully.", user })
  })
})

// **Signin Route**
app.post("/signin", (req, res) => {
  const { username, password } = req.body

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." })
  }

  loginUser(username, password, (err, user) => {
    if (err || user.error) {
      return res.status(400).json({ error: "Invalid username or password." })
    }

    // Generate JWT token with userId
    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET_KEY, { expiresIn: "24h" })

    // Fixed: Removed duplicate response
    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username },
    })
  })
})

// **Get User's Recipes**
app.get("/recipes", authenticateToken, (req, res) => {
  const userId = req.user.userId

  recipesDb.all(
    `
        SELECT 
            r.*,
            (SELECT COUNT(*) FROM likes WHERE recipeId = r.id) AS likesCount,
            (SELECT COUNT(*) FROM comments WHERE recipeId = r.id) AS commentsCount,
            (SELECT AVG(rating) FROM ratings WHERE recipeId = r.id) AS avgRating
        FROM recipes r
        WHERE r.userId = ?
        ORDER BY r.createdAt DESC
    `,
    [userId],
    (err, recipes) => {
      if (err) {
        console.error("Error fetching recipes:", err)
        return res.status(500).json({ error: "Error fetching recipes." })
      }

      // Parse JSON strings back to arrays
      const formattedRecipes = recipes.map((recipe) => ({
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients),
        method: JSON.parse(recipe.method),
      }))

      res.json(formattedRecipes)
    },
  )
})

// **Create Recipe** - Fixed version
app.post("/recipes", authenticateToken, (req, res) => {
  const { title, description, image, prepTime, cookTime, servings, calories, difficulty, ingredients, method } =
    req.body

  const userId = req.user.userId
  const username = req.user.username

  console.log("Creating recipe for user:", userId, username)
  console.log("Recipe data:", { title, description, ingredients: ingredients.length, method: method.length })

  // Validate required fields
  if (!title || !description || !ingredients || !method) {
    return res.status(400).json({ error: "Title, description, ingredients, and method are required." })
  }

  // Convert arrays to JSON strings for storage
  const ingredientsJson = JSON.stringify(ingredients)
  const methodJson = JSON.stringify(method)

  recipesDb.run(
    `INSERT INTO recipes (
            userId, username, title, description, image, prepTime, cookTime, 
            servings, calories, difficulty, ingredients, method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      username,
      title,
      description,
      image,
      prepTime,
      cookTime,
      servings,
      calories,
      difficulty,
      ingredientsJson,
      methodJson,
    ],
    function (err) {
      if (err) {
        console.error("Error creating recipe:", err)
        return res.status(500).json({ error: "Error creating recipe: " + err.message })
      }

      console.log(`Recipe created with ID: ${this.lastID}`)

      return res.status(201).json({
        message: "Recipe created successfully.",
        recipeId: this.lastID,
      })
    },
  )
})

app.delete("/recipes/:id", authenticateToken, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.userId;

  // First check if the recipe exists and belongs to the user
  recipesDb.get(
    "SELECT * FROM recipes WHERE id = ? AND userId = ?",
    [recipeId, userId],
    (err, recipe) => {
      if (err) {
        return res.status(500).json({ error: "Error checking recipe." });
      }

      if (!recipe) {
        return res.status(404).json({
          error: "Recipe not found or you don't have permission to delete it."
        });
      }

      // Delete the recipe
      recipesDb.run(
        "DELETE FROM recipes WHERE id = ? AND userId = ?",
        [recipeId, userId],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "Error deleting recipe." });
          }

          res.json({ message: "Recipe deleted successfully." });
        }
      );
    }
  );
});

// **Get All Recipes (for home page)**
app.get("/recipes/all", authenticateToken, (req, res) => {
  const page = Number.parseInt(req.query.page) || 1
  const limit = Number.parseInt(req.query.limit) || 9
  const offset = (page - 1) * limit
  const difficulty = req.query.difficulty
  const search = req.query.search
  const liked = req.query.liked === "true"
  const userId = req.user.userId

  // Build the query based on filters
  let query = `
      SELECT 
          r.*,
          (SELECT COUNT(*) FROM likes WHERE recipeId = r.id) AS likesCount,
          (SELECT COUNT(*) FROM comments WHERE recipeId = r.id) AS commentsCount,
          (SELECT AVG(rating) FROM ratings WHERE recipeId = r.id) AS avgRating,
          (SELECT COUNT(*) FROM likes WHERE recipeId = r.id AND userId = ?) AS userLiked
      FROM recipes r
  `

  let countQuery = "SELECT COUNT(*) as total FROM recipes"
  const queryParams = [userId]
  const countQueryParams = []

  // Add WHERE clause if filters are applied
  let whereClause = ""

  // Filter by liked recipes if requested
  if (liked) {
    whereClause += whereClause ? " AND " : " WHERE "
    whereClause += "r.id IN (SELECT recipeId FROM likes WHERE userId = ?)"
    queryParams.push(userId)
    countQueryParams.push(userId)

    // Update count query for liked recipes
    countQuery = "SELECT COUNT(*) as total FROM recipes WHERE id IN (SELECT recipeId FROM likes WHERE userId = ?)"
  }

  if (difficulty) {
    whereClause += whereClause ? " AND " : " WHERE "
    whereClause += "r.difficulty = ?"
    queryParams.push(difficulty)
    countQueryParams.push(difficulty)
  }

  if (search) {
    whereClause += whereClause ? " AND " : " WHERE "
    whereClause += "(r.title LIKE ? OR r.description LIKE ?)"
    const searchTerm = `%${search}%`
    queryParams.push(searchTerm, searchTerm)
    countQueryParams.push(searchTerm, searchTerm)
  }

  // Add WHERE clause to queries
  query += whereClause
  if (whereClause && !liked) {
    countQuery += whereClause.replace("r.", "")
  }

  // Add ORDER BY and LIMIT
  query += " ORDER BY r.createdAt DESC LIMIT ? OFFSET ?"
  queryParams.push(limit, offset)

  // Execute query
  recipesDb.all(query, queryParams, (err, recipes) => {
    if (err) {
      console.error("Error fetching recipes:", err)
      return res.status(500).json({ error: "Error fetching recipes." })
    }

    // Get total count for pagination
    recipesDb.get(countQuery, countQueryParams, (err, result) => {
      if (err) {
        console.error("Error counting recipes:", err)
        return res.status(500).json({ error: "Error counting recipes." })
      }

      const total = result.total
      const hasMore = offset + recipes.length < total

      // Parse JSON strings back to arrays
      const formattedRecipes = recipes.map((recipe) => ({
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients),
        method: JSON.parse(recipe.method),
        userLiked: !!recipe.userLiked,
      }))

      res.json({
        recipes: formattedRecipes,
        page,
        limit,
        total,
        hasMore,
      })
    })
  })
})

// **Get Recipe by ID**
app.get("/recipes/:id", authenticateToken, (req, res) => {
  const recipeId = req.params.id

  recipesDb.get(
    `
        SELECT 
            r.*,
            (SELECT COUNT(*) FROM likes WHERE recipeId = r.id) AS likesCount,
            (SELECT COUNT(*) FROM comments WHERE recipeId = r.id) AS commentsCount,
            (SELECT AVG(rating) FROM ratings WHERE recipeId = r.id) AS avgRating
        FROM recipes r
        WHERE r.id = ?
    `,
    [recipeId],
    (err, recipe) => {
      if (err) {
        return res.status(500).json({ error: "Error fetching recipe." })
      }

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found." })
      }

      // Parse JSON strings back to arrays
      recipe.ingredients = JSON.parse(recipe.ingredients)
      recipe.method = JSON.parse(recipe.method)

      // Get comments for this recipe
      recipesDb.all(
        "SELECT * FROM comments WHERE recipeId = ? ORDER BY createdAt DESC",
        [recipeId],
        (err, comments) => {
          if (err) {
            return res.status(500).json({ error: "Error fetching comments." })
          }

          recipe.comments = comments
          res.json(recipe)
        },
      )
    },
  )
})

// **Like Recipe**
app.post("/recipes/:id/like", authenticateToken, (req, res) => {
  const recipeId = req.params.id
  const userId = req.user.userId

  // Check if user already liked this recipe
  recipesDb.get("SELECT * FROM likes WHERE recipeId = ? AND userId = ?", [recipeId, userId], (err, like) => {
    if (err) {
      return res.status(500).json({ error: "Error checking like status." })
    }

    if (like) {
      // User already liked this recipe, remove the like
      recipesDb.run("DELETE FROM likes WHERE recipeId = ? AND userId = ?", [recipeId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: "Error removing like." })
        }

        res.json({ message: "Like removed successfully." })
      })
    } else {
      // User hasn't liked this recipe yet, add a like
      recipesDb.run("INSERT INTO likes (recipeId, userId) VALUES (?, ?)", [recipeId, userId], (err) => {
        if (err) {
          return res.status(500).json({ error: "Error adding like." })
        }

        res.json({ message: "Recipe liked successfully." })
      })
    }
  })
})

// **Add Comment**
app.post("/recipes/:id/comment", authenticateToken, (req, res) => {
  const recipeId = req.params.id
  const userId = req.user.userId
  const username = req.user.username
  const { text } = req.body

  if (!text) {
    return res.status(400).json({ error: "Comment text is required." })
  }

  recipesDb.run(
    "INSERT INTO comments (recipeId, userId, username, text) VALUES (?, ?, ?, ?)",
    [recipeId, userId, username, text],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Error adding comment." })
      }

      const commentId = this.lastID

      // Get the newly created comment
      recipesDb.get("SELECT * FROM comments WHERE id = ?", [commentId], (err, comment) => {
        if (err) {
          return res.status(500).json({ error: "Error fetching comment." })
        }

        res.status(201).json({
          message: "Comment added successfully.",
          comment,
        })
      })
    },
  )
})

// **Rate Recipe**
app.post("/recipes/:id/rate", authenticateToken, (req, res) => {
  const recipeId = req.params.id
  const userId = req.user.userId
  const { rating } = req.body

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." })
  }

  // Check if user already rated this recipe
  recipesDb.get(
    "SELECT * FROM ratings WHERE recipeId = ? AND userId = ?",
    [recipeId, userId],
    (err, existingRating) => {
      if (err) {
        return res.status(500).json({ error: "Error checking rating status." })
      }

      if (existingRating) {
        // Update existing rating
        recipesDb.run(
          "UPDATE ratings SET rating = ? WHERE recipeId = ? AND userId = ?",
          [rating, recipeId, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: "Error updating rating." })
            }

            res.json({ message: "Rating updated successfully." })
          },
        )
      } else {
        // Add new rating
        recipesDb.run(
          "INSERT INTO ratings (recipeId, userId, rating) VALUES (?, ?, ?)",
          [recipeId, userId, rating],
          (err) => {
            if (err) {
              return res.status(500).json({ error: "Error adding rating." })
            }

            res.json({ message: "Recipe rated successfully." })
          },
        )
      }
    },
  )
})

// **Get User Activity Counts**
app.get("/user/activity", authenticateToken, (req, res) => {
  const userId = req.user.userId

  // Create a promise for each count query
  const recipesCountPromise = new Promise((resolve, reject) => {
    recipesDb.get("SELECT COUNT(*) as count FROM recipes WHERE userId = ?", [userId], (err, result) => {
      if (err) reject(err)
      else resolve(result ? result.count : 0)
    })
  })

  const commentsCountPromise = new Promise((resolve, reject) => {
    recipesDb.get("SELECT COUNT(*) as count FROM comments WHERE userId = ?", [userId], (err, result) => {
      if (err) reject(err)
      else resolve(result ? result.count : 0)
    })
  })

  const likesCountPromise = new Promise((resolve, reject) => {
    recipesDb.get("SELECT COUNT(*) as count FROM likes WHERE userId = ?", [userId], (err, result) => {
      if (err) reject(err)
      else resolve(result ? result.count : 0)
    })
  })

  // Execute all promises in parallel
  Promise.all([recipesCountPromise, commentsCountPromise, likesCountPromise])
    .then(([recipesCount, commentsCount, likesCount]) => {
      res.json({
        recipesCount,
        commentsCount,
        likesCount,
      })
    })
    .catch((error) => {
      console.error("Error fetching user activity:", error)
      res.status(500).json({ error: "Failed to fetch user activity counts" })
    })
})

// **Get User's Profile and Recipes**
app.get("/users/:username/recipes", authenticateToken, (req, res) => {
  const username = req.params.username

  // First, check if the user exists
  usersDb.get("SELECT id FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      console.error("Error checking user:", err)
      return res.status(500).json({ error: "Error checking user." })
    }

    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }

    // Get all recipes by this user
    recipesDb.all(
      `
      SELECT 
          r.*,
          (SELECT COUNT(*) FROM likes WHERE recipeId = r.id) AS likesCount,
          (SELECT COUNT(*) FROM comments WHERE recipeId = r.id) AS commentsCount,
          (SELECT AVG(rating) FROM ratings WHERE recipeId = r.id) AS avgRating
      FROM recipes r
      WHERE r.username = ?
      ORDER BY r.createdAt DESC
      `,
      [username],
      (err, recipes) => {
        if (err) {
          console.error("Error fetching user's recipes:", err)
          return res.status(500).json({ error: "Error fetching user's recipes." })
        }

        // Parse JSON strings back to arrays
        const formattedRecipes = recipes.map((recipe) => ({
          ...recipe,
          ingredients: JSON.parse(recipe.ingredients),
          method: JSON.parse(recipe.method),
        }))

        res.json({
          username,
          recipes: formattedRecipes,
        })
      },
    )
  })
})

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))