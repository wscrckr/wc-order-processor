const assert = require('assert');
const shopify = require('../lib/shopify.js');

describe('Shopify API', function() {
  this.timeout(30000);
  it('initializes shopify library', function(done) {
    var initResult = shopify.init();
    assert(initResult, 'Failed Shopify Connection.');
    done();
  });

  it('gets recent orders', function(done) {
    shopify.getOrders(null)
      .then(function(orders) {
        console.log('We have some orders: ' + orders.length);
        done();
      })
      .catch(function(err) {
        console.error(err);
        done();
      });
  });
});
