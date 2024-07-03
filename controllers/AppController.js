const RedisClient = require('../utils/redis');
const DBClient = require('../utils/db');

class AppController {
  static async getStatus(req, res) {
    // Check if Redis and DB are alive
    const redisStatus = RedisClient.isAlive();
    const dbStatus = DBClient.isAlive();

    // Return the status as JSON
    return res.status(200).json({ redis: redisStatus, db: dbStatus });
  }

  static async getStats(req, res) {
    // Get the number of users and files
    const nbUsers = await DBClient.nbUsers();
    const nbFiles = await DBClient.nbFiles();

    // Return the stats as JSON
    return res.status(200).json({ users: nbUsers, files: nbFiles });
  }
}

module.exports = AppController;
