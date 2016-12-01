const assert = require('assert');
const xero = require('../lib/xero.js');

describe('Xero API', function() {
  it('initializes xero library', function(done) {
    var initResult = xero.init();
    assert(initResult, 'Failed Xero Connection.');
    done();
  })
});
