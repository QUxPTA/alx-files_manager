/* eslint-disable import/no-named-as-default */
import dbClient from '../../utils/db';

describe('+ AppController', () => {
  // Before running tests, clear database collections
  before(function (done) {
    this.timeout(10000); 
    Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
      .then(([usersCollection, filesCollection]) => {
        Promise.all([
          usersCollection.deleteMany({}),
          filesCollection.deleteMany({}),
        ])
          .then(() => done()) // Proceed with tests after cleanup
          .catch((deleteErr) => done(deleteErr));
      })
      .catch((connectErr) => done(connectErr));

  // Test case for GET /status endpoint
  describe('+ GET: /status', () => {
    it('+ Services are online', function (done) {
      request
        .get('/status')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ redis: true, db: true });
          done();
        });
    });
  });

  // Test cases for GET /stats endpoint
  describe('+ GET: /stats', () => {
    // Test case for checking initial empty database statistics
    it('+ Correct statistics about db collections', function (done) {
      request
        .get('/stats')
        .expect(200)
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          expect(res.body).to.deep.eql({ users: 0, files: 0 });
          done();
        });
    });

    // Test case for checking database statistics after data insertion
    it('+ Correct statistics about db collections [alt]', function (done) {
      this.timeout(10000);
      Promise.all([dbClient.usersCollection(), dbClient.filesCollection()])
        .then(([usersCollection, filesCollection]) => {
          Promise.all([
            usersCollection.insertMany([{ email: 'john@mail.com' }]),
            filesCollection.insertMany([
              { name: 'foo.txt', type: 'file' },
              { name: 'pic.png', type: 'image' },
            ]),
          ])
            .then(() => {
              request
                .get('/stats')
                .expect(200)
                .end((err, res) => {
                  if (err) {
                    return done(err);
                  }
                  expect(res.body).to.deep.eql({ users: 1, files: 2 });
                  done();
                });
            })
            .catch((insertErr) => done(insertErr)); // Handle insertion errors
        })
        .catch((connectErr) => done(connectErr)); // Handle database connection errors
    });
  });
});
