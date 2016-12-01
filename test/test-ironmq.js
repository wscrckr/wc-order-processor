const assert = require('assert');
const ironmq = require('../lib/ironmq.js');

var queueName = 'testQueue';
var testMessage = 'Test time is ' + Date.now();
var messageId = null;

describe('Iron MQ API', function() {
  it('initializes iron_mq library', function(done) {
    var initResult = ironmq.init();
    assert(initResult, 'Failed Iron MQ Connection.');
    done();
  });

  it('writes a message to a test queue', function(done) {
    ironmq.post(queueName, testMessage, function(err, body) {
      assert.ifError(err);
      messageId = body;
      done();
    });
  });

  it('reads the message from the test queue', function(done) {
    ironmq.peek(queueName, function(err, body) {
      assert.ifError(err);
      assert.equal(body.id, messageId);
      assert.equal(body.body, testMessage);
      done();
    });
  });

  it('deletes the message from the test queue', function(done) {
    ironmq.del(queueName, messageId, function(err, body) {
      assert.ifError(err);
      done();
    });
  });
});
