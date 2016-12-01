const Shopify = require('shopify-api-node');

var shopify = {};

shopify.init = function init() {
  console.log('Shopify init() started');
  this.shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    apiKey: process.env.SHOPIFY_API_KEY,
    password: process.env.SHOPIFY_PASSWORD
  });

  // Return true if the init was successful
  if (this.shopify != null) {
    console.log('Shopify init() successful');
    return true;
  }
  console.error('Shopify init() failed');
  return false;
}

module.exports = shopify;
