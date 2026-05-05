const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'kavin@2008',
      database: 'smart_task_manager'
    });
    
    const [rows] = await connection.execute('SELECT email FROM users LIMIT 1');
    console.log("USER:", rows[0]?.email);
    await connection.end();
  } catch (e) {
    console.error(e);
  }
})();
