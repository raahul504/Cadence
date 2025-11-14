const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to database
const db = new sqlite3.Database("./calendar.db");

// Create the table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    time TEXT,
    description TEXT
    color TEXT
  )
`);

// Get all events
app.get("/events", (req, res) => {
  db.all("SELECT * FROM events", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add new event
app.post("/events", (req, res) => {
  const { title, date, time, description, color } = req.body;
  db.run(
    "INSERT INTO events (title, date, time, description, color) VALUES (?, ?, ?, ?, ?)",
    [title, date, time, description, color],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Delete an event
app.delete("/events/:id", (req, res) => {
  db.run("DELETE FROM events WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Update an existing event
app.put("/events/:id", (req, res) => {
  const id = req.params.id;
  const { title, date, time, description, color } = req.body;

  db.run(
    "UPDATE events SET title = ?, date = ?, time = ?, description = ?, color = ? WHERE id = ?",
    [title, date, time, description, color, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
