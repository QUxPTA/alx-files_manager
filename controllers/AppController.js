const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const AppController = {
  async getStatus (req, res) {
    try {
      const redisAlive = await redisClient.isAlive();
      const dbAlive = await dbClient.isAlive();

      res.status(200).json({ redis: redisAlive, db: dbAlive });
    } catch (error) {
      console.error(`Error in getStatus: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getStats (req, res) {
    try {
      const numUsers = await dbClient.nbUsers();
      const numFiles = await dbClient.nbFiles();

      res.status(200).json({ users: numUsers, files: numFiles });
    } catch (error) {
      console.error(`Error in getStats: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = AppController;
