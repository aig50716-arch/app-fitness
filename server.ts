import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("fitness.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER,
    calories INTEGER
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER,
    name TEXT NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    FOREIGN KEY(workout_id) REFERENCES workouts(id)
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT DEFAULT 'User',
    weight REAL,
    height REAL,
    goal TEXT
  );

  INSERT OR IGNORE INTO user_profile (id, name, weight, height, goal) VALUES (1, 'Atleta', 75, 175, 'Ganhar massa muscular');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/profile", (req, res) => {
    const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get();
    res.json(profile);
  });

  app.post("/api/profile", (req, res) => {
    const { name, weight, height, goal } = req.body;
    db.prepare("UPDATE user_profile SET name = ?, weight = ?, height = ?, goal = ? WHERE id = 1")
      .run(name, weight, height, goal);
    res.json({ success: true });
  });

  app.get("/api/workouts", (req, res) => {
    const workouts = db.prepare("SELECT * FROM workouts ORDER BY date DESC").all();
    res.json(workouts);
  });

  app.post("/api/workouts", (req, res) => {
    const { name, date, duration, calories, exercises } = req.body;
    const info = db.prepare("INSERT INTO workouts (name, date, duration, calories) VALUES (?, ?, ?, ?)")
      .run(name, date, duration, calories);
    
    const workoutId = info.lastInsertRowid;

    if (exercises && Array.isArray(exercises)) {
      const insertExercise = db.prepare("INSERT INTO exercises (workout_id, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)");
      for (const ex of exercises) {
        insertExercise.run(workoutId, ex.name, ex.sets, ex.reps, ex.weight);
      }
    }

    res.json({ id: workoutId });
  });

  app.get("/api/stats", (req, res) => {
    const last7Days = db.prepare(`
      SELECT date, SUM(calories) as calories 
      FROM workouts 
      WHERE date >= date('now', '-7 days') 
      GROUP BY date 
      ORDER BY date ASC
    `).all();
    res.json(last7Days);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
