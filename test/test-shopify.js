const assert = require('assert');
const shopify = require('../lib/shopify.js');

describe('Shopify API', function() {
  it('initializes shopify library', function(done) {
    var initResult = shopify.init();
    assert(initResult, 'Failed Shopify Connection.');
    done();
  })
});
