const assert = require('assert');
const mws = require('../lib/mws.js');

describe('Amazon Marketplace Web Service API', function() {
  it('initializes mws library', function(done) {
    var initResult = mws.init();
    assert(initResult, 'Failed Amazon MWS Connection.');
    done();
  })
});
