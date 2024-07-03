import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

class AppController {
  /**
   * Handles the GET /status endpoint.
   * Returns the status of Redis and MongoDB connections.
   * @param {Object} request - The HTTP request object.
   * @param {Object} response - The HTTP response object.
   */
  static getStatus (request, response) {
    // Check the connection status of Redis and MongoDB
    const status = {
      redis: RedisClient.isAlive(),
      db: DBClient.isAlive()
    };
    return response.status(200).send(status);
  }

  /**
   * Handles the GET /stats endpoint.
   * Returns the number of users and files in the database.
   * @param {Object} request - The HTTP request object.
   * @param {Object} response - The HTTP response object.
   */
  static async getStats (request, response) {
    const stats = {
      users: await DBClient.nbUsers(),
      files: await DBClient.nbFiles()
    };
    return response.status(200).send(stats);
  }
}

module.exports = AppController;
