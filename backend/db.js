const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool instead of a single connection
// This handles reconnects and multiple queries better
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convert pool to use promises for async/await functionality
const promisePool = pool.promise();

// Test the connection immediately
pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }
        console.error('DB Config Used:', {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            database: process.env.DB_NAME
        });
        console.error('Error Completo:', err.message);
    } else {
        console.log('Successfully connected to MySQL database on', process.env.DB_HOST);
        connection.release();
    }
});

module.exports = promisePool;
