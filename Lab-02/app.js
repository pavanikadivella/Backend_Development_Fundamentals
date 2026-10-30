const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());
app.get("/", (request, response) => {
  response.send("Welcome to the Book Management API!");
});


const PORT = process.env.PORT || 3000;

let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: "./books.db",
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL,
        pages INTEGER NOT NULL
      );
    `);

    // Insert sample books only when the table is empty.
    const result = await db.get("SELECT COUNT(*) AS count FROM book");

    if (result.count === 0) {
      const books = [
        ["Wings of Fire", "A.P.J. Abdul Kalam", 250, 180],
        ["The Alchemist", "Paulo Coelho", 300, 208],
        ["Atomic Habits", "James Clear", 450, 320],
        ["Rich Dad Poor Dad", "Robert Kiyosaki", 350, 336],
        ["The Power of Now", "Eckhart Tolle", 280, 236],
        ["Ikigai", "Hector Garcia", 200, 194],
        ["Deep Work", "Cal Newport", 400, 304],
        ["Think Like a Monk", "Jay Shetty", 320, 288],
        ["The Psychology of Money", "Morgan Housel", 350, 256],
        ["Zero to One", "Peter Thiel", 300, 210],
      ];

      for (const book of books) {
        await db.run(
          `INSERT INTO book (title, author, price, pages)
           VALUES (?, ?, ?, ?)`,
          book
        );
      }
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    process.exit(1);
  }
};

// GET: Retrieve all books
app.get("/books/", async (request, response) => {
  try {
    const books = await db.all("SELECT * FROM book ORDER BY id");
    response.status(200).json(books);
  } catch (error) {
    response.status(500).json({ error: "Unable to retrieve books" });
  }
});

// GET: Retrieve a single book
app.get("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return response.status(400).json({ error: "Invalid book ID" });
    }

    const book = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);

    if (!book) {
      return response.status(404).json({ error: "Book not found" });
    }

    response.status(200).json(book);
  } catch (error) {
    response.status(500).json({ error: "Unable to retrieve the book" });
  }
});

// POST: Add a new book
app.post("/books/", async (request, response) => {
  try {
    const { title, author, price, pages } = request.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim() ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      !Number.isSafeInteger(pages) ||
      pages <= 0
    ) {
      return response.status(400).json({
        error: "Provide a title, author, non-negative integer price, and positive integer pages",
      });
    }

    const result = await db.run(
      `INSERT INTO book (title, author, price, pages)
       VALUES (?, ?, ?, ?)`,
      [title.trim(), author.trim(), price, pages]
    );

    const newBook = await db.get("SELECT * FROM book WHERE id = ?", [
      result.lastID,
    ]);

    response.status(201).json(newBook);
  } catch (error) {
    response.status(500).json({ error: "Unable to add the book" });
  }
});

// PUT: Update an existing book
app.put("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;
    const { title, author, price, pages } = request.body;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return response.status(400).json({ error: "Invalid book ID" });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim() ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      !Number.isSafeInteger(pages) ||
      pages <= 0
    ) {
      return response.status(400).json({
        error: "Provide a title, author, non-negative integer price, and positive integer pages",
      });
    }

    const existingBook = await db.get("SELECT * FROM book WHERE id = ?", [
      bookId,
    ]);

    if (!existingBook) {
      return response.status(404).json({ error: "Book not found" });
    }

    await db.run(
      `UPDATE book
       SET title = ?, author = ?, price = ?, pages = ?
       WHERE id = ?`,
      [title.trim(), author.trim(), price, pages, bookId]
    );

    const updatedBook = await db.get("SELECT * FROM book WHERE id = ?", [
      bookId,
    ]);

    response.status(200).json(updatedBook);
  } catch (error) {
    response.status(500).json({ error: "Unable to update the book" });
  }
});

// DELETE: Remove a book
app.delete("/books/:bookId/", async (request, response) => {
  try {
    const { bookId } = request.params;

    if (!/^[1-9]\d*$/.test(bookId)) {
      return response.status(400).json({ error: "Invalid book ID" });
    }

    const existingBook = await db.get("SELECT * FROM book WHERE id = ?", [
      bookId,
    ]);

    if (!existingBook) {
      return response.status(404).json({ error: "Book not found" });
    }

    await db.run("DELETE FROM book WHERE id = ?", [bookId]);

    response.status(200).json({
      message: "Book deleted successfully",
      deletedBook: existingBook,
    });
  } catch (error) {
    response.status(500).json({ error: "Unable to delete the book" });
  }
});

initializeDBAndServer();
