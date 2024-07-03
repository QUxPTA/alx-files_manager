const chai = require('chai');
const sinon = require('sinon');
const redis = require('redis');
const RedisClient = require('../../utils/redis');

const { expect } = chai;

describe('RedisClient', () => {
  let mockClient;

  beforeEach(() => {
    // Mock the createClient function from the redis package
    mockClient = sinon.createStubInstance(redis.RedisClient);
    sinon.stub(redis, 'createClient').returns(mockClient);
  });

  afterEach(() => {
    // Restore the original createClient function after each test
    sinon.restore();
  });

  describe('isAlive', () => {
    it('should return true if the client is connected', () => {
      // Set connected status to true for the mock client
      mockClient.connected = true;
      const client = new RedisClient();
      const alive = client.isAlive();
      expect(alive).to.be.true;
    });

    it('should return false if the client is not connected', () => {
      // Set connected status to false for the mock client
      mockClient.connected = false;
      const client = new RedisClient();
      const alive = client.isAlive();
      expect(alive).to.be.false;
    });
  });

  describe('get', () => {
    it('should call GET method with the provided key', async () => {
      // Stub the GET method and resolve with a value
      const key = 'test_key';
      const value = 'test_value';
      const getAsyncStub = sinon.stub().resolves(value);
      mockClient.GET = getAsyncStub;

      const client = new RedisClient();
      const result = await client.get(key);

      // Assert that the GET method was called with the correct key and returned the expected value
      expect(result).to.equal(value);
      expect(getAsyncStub.calledOnceWithExactly(key)).to.be.true;
    });
  });

  describe('set', () => {
    it('should call SET method with the provided key, value, and time', async () => {
      // Stub the SET method and resolve with 'OK'
      const key = 'test_key';
      const value = 'test_value';
      const time = 60;
      const setAsyncStub = sinon.stub().resolves('OK');
      mockClient.SET = setAsyncStub;

      const client = new RedisClient();
      const result = await client.set(key, value, time);

      // Assert that the SET method was called with the correct arguments and returned 'OK'
      expect(result).to.equal('OK');
      expect(setAsyncStub.calledOnceWithExactly(key, value, 'EX', time)).to.be
        .true;
    });
  });

  describe('del', () => {
    it('should call DEL method with the provided key', async () => {
      // Stub the DEL method and resolve with 1 (indicating one key was deleted)
      const key = 'test_key';
      const delAsyncStub = sinon.stub().resolves(1);
      mockClient.DEL = delAsyncStub;

      const client = new RedisClient();
      const result = await client.del(key);

      // Assert that the DEL method was called with the correct key and returned 1
      expect(result).to.equal(1);
      expect(delAsyncStub.calledOnceWithExactly(key)).to.be.true;
    });
  });
});
