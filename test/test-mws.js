const assert = require('assert');
const mws = require('../lib/mws.js');

describe('Amazon Marketplace Web Service API', function() {
  this.timeout(30000);

  it('initializes mws library', function(done) {
    var initResult = mws.init();
    assert(initResult, 'Failed Amazon MWS Connection.');
    done();
  });

  it('lists orders', function(done) {
    var testDate = new Date(2016,1,1);
    mws.listOrders(testDate)
      .then(function(result, metadata) {
        console.log('There are ' + result.result.length + ' orders.');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  })
});
