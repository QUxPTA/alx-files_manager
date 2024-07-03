const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const AppController = require('../../controllers/AppController');
const RedisClient = require('../../utils/redis');
const DBClient = require('../../utils/db');

const { expect } = chai;

chai.use(chaiHttp);

describe('AppController', () => {
  describe('getStatus', () => {
    it('should return status with redis and db information', async () => {
      // Mock RedisClient.isAlive() to return true
      sinon.stub(RedisClient, 'isAlive').returns(true);
      // Mock DBClient.isAlive() to return true
      sinon.stub(DBClient, 'isAlive').returns(true);

      // Mock request and response objects
      const request = {};
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(200);
          return {
            send: (status) => {
              expect(status).to.deep.equal({
                redis: true,
                db: true,
              }); // Check if response body matches expected object
            },
          };
        },
      };

      // Call the getStatus method from AppController
      await AppController.getStatus(request, response);

      // Restore the original methods
      RedisClient.isAlive.restore();
      DBClient.isAlive.restore();
    });
  });

  describe('getStats', () => {
    it('should return statistics for users and files', async () => {
      // Mock DBClient.nbUsers() to return 42
      sinon.stub(DBClient, 'nbUsers').returns(42);
      // Mock DBClient.nbFiles() to return 100
      sinon.stub(DBClient, 'nbFiles').returns(100);

      // Mock request and response objects
      const request = {};
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(200);
          return {
            send: (stats) => {
              expect(stats).to.deep.equal({
                users: 42,
                files: 100,
              }); // Check if response body matches expected object
            },
          };
        },
      };

      // Call the getStats method from AppController
      await AppController.getStats(request, response);

      // Restore the original methods
      DBClient.nbUsers.restore();
      DBClient.nbFiles.restore();
    });
  });
});
