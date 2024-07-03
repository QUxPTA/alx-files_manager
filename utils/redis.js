const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor () {
    this.client = redis.createClient();
    this.client.on('error', (err) => {
      console.error(`Redis client error: ${err}`);
    });

    // Promisify Redis methods for easier async/await use
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive () {
    return this.client.connected;
  }

  async get (key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (error) {
      console.error(`Redis get error: ${error}`);
      return null;
    }
  }

  async set (key, value, duration) {
    try {
      await this.setAsync(key, value, 'EX', duration);
    } catch (error) {
      console.error(`Redis set error: ${error}`);
    }
  }

  async del (key) {
    try {
      await this.delAsync(key);
    } catch (error) {
      console.error(`Redis del error: ${error}`);
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
