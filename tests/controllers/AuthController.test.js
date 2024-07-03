const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');
const AuthController = require('./authController');
const DBClient = require('../utils/db');
const RedisClient = require('../utils/redis');

const { expect } = chai;

chai.use(chaiHttp);

describe('AuthController', () => {
  describe('getConnect', () => {
    it('should return a token if valid credentials are provided', async () => {
      // Mocked request with Authorization header
      const request = {
        header: (headerName) => {
          if (headerName === 'Authorization') {
            return 'Basic dXNlcm5hbWU6cGFzc3dvcmQ='; // Base64-encoded "username:password"
          }
          return null;
        },
      };
      // Mocked response object
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(200);
          return {
            send: (data) => {
              expect(data).to.have.property('token').to.be.a('string');
          };
        },
      };

      // Stubbing DBClient.db.collection('users').findOne method
      sinon.stub(DBClient.db.collection('users'), 'findOne').resolves({ _id: 'user_id' });
      // Stubbing RedisClient.set method
      sinon.stub(RedisClient, 'set').resolves('OK');

      // Call AuthController.getConnect method
      await AuthController.getConnect(request, response);

      // Restore the stubbed methods
      DBClient.db.collection('users').findOne.restore();
      RedisClient.set.restore();
    });

    it('should return an Unauthorized error if invalid credentials are provided', async () => {
      // Mocked request without Authorization header
      const request = {
        header: () => null,
      };
      // Mocked response object
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(401); // Expecting status code 401 for Unauthorized
          return {
            send: (error) => {
              expect(error).to.have.property('error').to.equal('Unauthorized');
            },
          };
        },
      };

      // Call AuthController.getConnect method
      await AuthController.getConnect(request, response);
    });
  });

  describe('getDisconnect', () => {
    it('should disconnect and return a 204 status if a valid token is provided', async () => {
      // Mocked request with X-Token header
      const request = {
        header: (headerName) => {
          if (headerName === 'X-Token') {
            return 'valid_token';
          }
          return null;
        },
      };
      // Mocked response object
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(204); // Expecting status code 204 for successful disconnect
          return {
            send: () => {},
          };
        },
      };

      // Stubbing RedisClient.get method
      sinon.stub(RedisClient, 'get').resolves('user_id');
      // Stubbing RedisClient.del method
      sinon.stub(RedisClient, 'del').resolves('OK');

      // Call AuthController.getDisconnect method
      await AuthController.getDisconnect(request, response);

      // Restore the stubbed methods
      RedisClient.get.restore();
      RedisClient.del.restore();
    });

    it('should return an Unauthorized error if an invalid token is provided', async () => {
      // Mocked request without X-Token header
      const request = {
        header: () => null,
      };
      // Mocked response object
      const response = {
        status: (statusCode) => {
          expect(statusCode).to.equal(401); // Expecting status code 401 for Unauthorized
          return {
            send: (error) => {
              expect(error).to.have.property('error').to.equal('Unauthorized');
            },
          };
        },
      };

      // Call AuthController.getDisconnect method
      await AuthController.getDisconnect(request, response);
    });
  });
});
