/**
 * server.js — User Registration API
 * Stack : Express · MySQL2 · bcrypt · express-validator · cors · dotenv
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcrypt');
const mysql      = require('mysql2/promise');
const { body, validationResult } = require('express-validator');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Middleware ── */
app.use(cors({ origin: '*' }));          // tighten in production
app.use(express.json());
app.use(express.static(__dirname));      // serves index.html from same folder

/* ── DB pool ── */
let pool;
async function initDB() {
  pool = await mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || '',
    database: process.env.DB_NAME     || 'vault_app',
    waitForConnections: true,
    connectionLimit:    10,
  });

  /* Create table if it doesn't exist */
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id           INT          AUTO_INCREMENT PRIMARY KEY,
      full_name    VARCHAR(120) NOT NULL,
      email        VARCHAR(180) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone        VARCHAR(20)  NOT NULL,
      created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅  Database ready');
}

/* ── Validation rules ── */
const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.')
    .matches(/^\d{7,15}$/).withMessage('Phone must contain only digits (7–15).'),
];

/* ── POST /api/register ── */
app.post('/api/register', registerRules, async (req, res) => {
  /* 1. Collect validation errors */
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map(e => ({
      field:   mapField(e.path),  // translate to frontend field IDs
      message: e.msg,
    }));
    return res.status(422).json({ message: 'Validation failed.', errors });
  }

  const { name, email, password, phone } = req.body;

  try {
    /* 2. Check for duplicate email */
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (rows.length > 0) {
      return res.status(409).json({
        message: 'Email already registered.',
        errors: [{ field: 'email', message: 'This email is already in use.' }],
      });
    }

    /* 3. Hash password */
    const SALT_ROUNDS   = 12;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    /* 4. Insert into DB */
    const [insert] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, phone]
    );

    console.log(`👤 New user registered: ${email} (id=${insert.insertId})`);

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id:    insert.insertId,
        name,
        email,
        phone,
        created_at: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

/* ── Health check ── */
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

/* ── Map express-validator path → frontend field id ── */
function mapField(path) {
  const map = { name: 'name', email: 'email', password: 'password', phone: 'phone' };
  return map[path] || path;
}

/* ── Boot ── */
initDB()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`🚀  Server running on http://localhost:${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌  DB connection failed:', err.message);
    process.exit(1);
  });