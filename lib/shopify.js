const Shopify = require('shopify-api-node');

var shopify = {};

shopify.init = function init() {
  // console.log('Shopify init() started');
  require('dotenv').config()
  shopify.store = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_PASSWORD
  });

  // Return true if the init was successful
  if (shopify.store != null) {
    // console.log('Shopify init() successful');
    return true;
  }
  console.error('Shopify init() failed');
  return false;
}

// API function to get orders since a certain date
shopify.getOrdersSince = function getOrdersSince(sinceId) {
  // console.log('Shopify getOrders() called');
  var options = {
    status: 'any'
  }
  if (sinceId != null) {
    options.since_id = sinceId;
  }
  return shopify.store.order.list(options);
}

// API function to get a specific order (returns an array anyway)
shopify.getOrders = function getOrders(orderNum) {
  var options = {
    status: 'any',
    name: orderNum
  }
  return shopify.store.order.list(options);
}

module.exports = shopify;
