// config/db.js — MySQL2 connection pool for Railway
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

// Verify connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✦ MySQL connected to Railway');
    conn.release();
  })
  .catch(err => {
    console.error('✗ MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
