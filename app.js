
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

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

    const result = await db.get(
      "SELECT COUNT(*) AS count FROM book"
    );

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
    console.error("Database initialization failed:", error.message);
    process.exit(1);
  }
};

// GET: Retrieve books with search, sorting, filtering and pagination
app.get("/books", async (request, response) => {
  try {
    const {
      search_q = "",
      order_by = "id",
      order = "ASC",
      limit = "10",
      offset = "0",
      min_price,
      max_price,
    } = request.query;

    const allowedColumns = ["id", "title", "author", "price", "pages"];

    if (!allowedColumns.includes(order_by)) {
      return response.status(400).json({
        message: "Invalid sorting column",
      });
    }

    if (
      typeof order !== "string" ||
      !["ASC", "DESC"].includes(order.toUpperCase())
    ) {
      return response.status(400).json({
        message: "Order must be ASC or DESC",
      });
    }

    const pageLimit = Number(limit);
    const pageOffset = Number(offset);

    if (
      !Number.isInteger(pageLimit) ||
      pageLimit <= 0 ||
      !Number.isInteger(pageOffset) ||
      pageOffset < 0
    ) {
      return response.status(400).json({
        message: "Invalid limit or offset",
      });
    }

    const conditions = [];
    const values = [];

    if (typeof search_q !== "string") {
      return response.status(400).json({
        message: "Invalid search query",
      });
    }

    if (search_q.trim()) {
      conditions.push("title LIKE ?");
      values.push(`%${search_q.trim()}%`);
    }

    if (min_price !== undefined) {
      if (
        String(min_price).trim() === "" ||
        !Number.isFinite(Number(min_price)) ||
        Number(min_price) < 0
      ) {
        return response.status(400).json({
          message: "Invalid minimum price",
        });
      }

      conditions.push("price >= ?");
      values.push(Number(min_price));
    }

    if (max_price !== undefined) {
      if (
        String(max_price).trim() === "" ||
        !Number.isFinite(Number(max_price)) ||
        Number(max_price) < 0
      ) {
        return response.status(400).json({
          message: "Invalid maximum price",
        });
      }

      conditions.push("price <= ?");
      values.push(Number(max_price));
    }

    if (
      min_price !== undefined &&
      max_price !== undefined &&
      Number(min_price) > Number(max_price)
    ) {
      return response.status(400).json({
        message: "Minimum price cannot exceed maximum price",
      });
    }

    let sql = "SELECT * FROM book";

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += ` ORDER BY ${order_by} ${order.toUpperCase()}`;
    sql += " LIMIT ? OFFSET ?";

    values.push(pageLimit, pageOffset);

    const books = await db.all(sql, values);

    response.status(200).json(books);
  } catch (error) {
    response.status(500).json({
      message: "Unable to retrieve books",
    });
  }
});

// GET: Retrieve a single book by ID
app.get("/books/:bookId", async (request, response) => {
  try {
    const bookId = Number(request.params.bookId);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return response.status(400).json({
        message: "Invalid book ID",
      });
    }

    const book = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [bookId]
    );

    if (!book) {
      return response.status(404).json({
        message: "Book not found",
      });
    }

    response.status(200).json(book);
  } catch (error) {
    response.status(500).json({
      message: "Unable to retrieve book",
    });
  }
});

// POST: Add a new book
app.post("/books", async (request, response) => {
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
        message: "Provide a valid title, author, price and pages",
      });
    }

    const result = await db.run(
      `INSERT INTO book (title, author, price, pages)
       VALUES (?, ?, ?, ?)`,
      [title.trim(), author.trim(), price, pages]
    );

    const newBook = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [result.lastID]
    );

    response.status(201).json(newBook);
  } catch (error) {
    response.status(500).json({
      message: "Unable to add book",
    });
  }
});

// PUT: Update a book by ID
app.put("/books/:bookId", async (request, response) => {
  try {
    const bookId = Number(request.params.bookId);
    const { title, author, price, pages } = request.body;

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return response.status(400).json({
        message: "Invalid book ID",
      });
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
        message: "Provide a valid title, author, price and pages",
      });
    }

    const existingBook = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [bookId]
    );

    if (!existingBook) {
      return response.status(404).json({
        message: "Book not found",
      });
    }

    await db.run(
      `UPDATE book
       SET title = ?, author = ?, price = ?, pages = ?
       WHERE id = ?`,
      [title.trim(), author.trim(), price, pages, bookId]
    );

    const updatedBook = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [bookId]
    );

    response.status(200).json(updatedBook);
  } catch (error) {
    response.status(500).json({
      message: "Unable to update book",
    });
  }
});

// DELETE: Delete a book by ID
app.delete("/books/:bookId", async (request, response) => {
  try {
    const bookId = Number(request.params.bookId);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return response.status(400).json({
        message: "Invalid book ID",
      });
    }

    const existingBook = await db.get(
      "SELECT * FROM book WHERE id = ?",
      [bookId]
    );

    if (!existingBook) {
      return response.status(404).json({
        message: "Book not found",
      });
    }

    await db.run(
      "DELETE FROM book WHERE id = ?",
      [bookId]
    );

    response.status(200).json({
      message: "Book deleted successfully",
      deletedBook: existingBook,
    });
  } catch (error) {
    response.status(500).json({
      message: "Unable to delete book",
    });
  }
});

initializeDBAndServer();
