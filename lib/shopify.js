const Shopify = require('shopify-api-node');
require('dotenv').config();

var shopify = {};

shopify.init = async function init() {
  console.log('Shopify init() started');
  shopify.store = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_PASSWORD
  });

  // Return true if the init was successful
  if (shopify.store != null) {
    let orders = await shopify.store.order.list({ status: 'any', limit: 5 })
      console.log(`Shopify found ${orders.length} orders during init()`)
      if (orders.length > 0) {
        // Put SHOP in front of the order number
        return `SHOP#${orders[0].order_number}`;
      }
      return 'ERR (no orders?)'
  }
    
  console.error('Shopify init() failed');
  return 'ERR (init failed)';
}

// API function to get orders since a certain date
shopify.getOrdersSince = async function getOrdersSince(sinceId) {
  console.log(`Shopify getOrdersSince(${sinceId}) called`);
  var options = {
    status: 'any'
  }
  if (sinceId != null) {
    options.created_at_min = sinceId;
  }
  return await shopify.store.order.list(options);
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
