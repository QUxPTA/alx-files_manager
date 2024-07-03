import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

class AuthController {
  /**
   * Handles the GET /connect endpoint.
   * Authenticates the user and generates an authentication token.
   * @param {Object} request - The HTTP request object.
   * @param {Object} response - The HTTP response object.
   */
  static async getConnect (request, response) {
    // Retrieve the Authorization header
    const authorization = request.header('Authorization') || null;
    if (!authorization) { return response.status(401).send({ error: 'Unauthorized' }); }

    // Decode the Base64 encoded email and password
    const buff = Buffer.from(authorization.replace('Basic ', ''), 'base64');
    const credentials = {
      email: buff.toString('utf-8').split(':')[0],
      password: buff.toString('utf-8').split(':')[1]
    };

    // Check if email or password is missing
    if (!credentials.email || !credentials.password) { return response.status(401).send({ error: 'Unauthorized' }); }

    // Hash the password using SHA1
    credentials.password = sha1(credentials.password);

    // Check if the user exists in the database
    const userExists = await DBClient.db
      .collection('users')
      .findOne(credentials);
    if (!userExists) { return response.status(401).send({ error: 'Unauthorized' }); }

    // Generate a new token and store it in Redis
    const token = uuidv4();
    const key = `auth_${token}`;
    await RedisClient.set(key, userExists._id.toString(), 86400);

    return response.status(200).send({ token });
  }

  /**
   * Handles the GET /disconnect endpoint.
   * Signs out the user by deleting the authentication token from Redis.
   * @param {Object} request - The HTTP request object.
   * @param {Object} response - The HTTP response object.
   */
  static async getDisconnect (request, response) {
    // Retrieve the X-Token header
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    // Check if the token exists in Redis
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) { return response.status(401).send({ error: 'Unauthorized' }); }

    // Delete the token from Redis
    await RedisClient.del(`auth_${token}`);
    return response.status(204).send();
  }
}

module.exports = AuthController;
