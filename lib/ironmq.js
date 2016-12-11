const iron_mq = require('iron_mq');

// Define the initial library
var ironmq = {};

ironmq.init = function init() {
  console.log('Iron MQ init() started');
  var iron_properties = {
    token:  process.env.IRON_TOKEN,
    project_id: process.env.IRON_PROJECT_ID
  }
  this.imq = new iron_mq.Client(iron_properties);

  if (this.imq != null) {
    console.log('Iron MQ init() successful');
    return true;
  }
  console.error('Iron MQ init() failed');
  return false;
}

ironmq.post = function post(queueName, message, cb) {
  if (this.imq == null) {
    ironmq.init();
  }
  var q = this.imq.queue(queueName);
  q.post(message, cb);
}

ironmq.peek = function peek(queueName, cb) {
  if (this.imq == null) {
    ironmq.init();
  }
  var q = this.imq.queue(queueName);
  q.peek({n:1}, cb);
}

ironmq.del = function del(queueName, messageId, cb) {
  if (this.imq == null) {
    ironmq.init();
  }
  var q = this.imq.queue(queueName);
  q.del(messageId, {}, cb);
}

module.exports = ironmq;
