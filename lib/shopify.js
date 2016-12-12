const Shopify = require('shopify-api-node');

var shopify = {};

shopify.init = function init() {
  console.log('Shopify init() started');
  shopify.store = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_PASSWORD
  });

  // Return true if the init was successful
  if (shopify.store != null) {
    console.log('Shopify init() successful');
    return true;
  }
  console.error('Shopify init() failed');
  return false;
}

shopify.getOrders = function getOrders(sinceId) {
  console.log('Shopify getOrders() called');
  var options = {
    status: 'any'
  }
  if (sinceId != null) {
    options.since_id = sinceId;
  }
  return shopify.store.order.list(options);
}

module.exports = shopify;
