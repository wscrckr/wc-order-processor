const MWSClient = require('mws-api');

var mws = {};

mws.init = function init() {
  console.log('MWS init() started');
  this.store = new MWSClient({
    accessKeyId: process.env.MWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MWS_SECRET_ACCESS_KEY,
    merchantId: process.env.MWS_MERCHANT_ID,
    meta: {
      retry: true, // retry requests when throttled
      next: true, // auto-paginate
      limit: Infinity // only get this number of items (NOT the same as MaxRequestsPerPage)
    }
  });

  // Return true if the init was successful
  if (this.store != null) {
    console.log('MWS init() successful');
    return true;
  }
  console.error('MWS init() failed');
  return false;
}

mws.listOrders = function listOrders(afterDate) {
  var options = {
    MarketplaceId: process.env.MWS_MARKETPLACE_ID,
    CreatedAfter: afterDate
  }
  return mws.store.Orders.ListOrders(options);
}

mws.getOrder = function getOrder(mwsId) {
  var options = {
    AmazonOrderId: mwsId
  }
  return mws.store.Orders.GetOrder(options);
}

mws.getItems = function getItems(mwsId) {
  var options = {
    AmazonOrderId: mwsId
  }
  return mws.store.Orders.ListOrderItems(options);
}

module.exports = mws;
