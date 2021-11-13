const { Invoice, LineItem, Contact } = require('xero-node');
const shopify = require('./shopify');
const xeroWrapper = require('./xero');

var runSync = async function(sinceId) {
  const orders = await shopify.getOrdersSince(sinceId);
  let newInvoices = [];
  
  // Process the orders
  for (var i=0; i < orders.length; i++) {
    var shopifyOrder = orders[i];

    // First either find or add the customer
    const contactId = await getOrAddCustomer(shopifyOrder);

    // Make the invoice
    const newInvoice = await makeInvoice(shopifyOrder, contactId);
    newInvoices.push(newInvoice);
  }

  // Create the new invoices
  await xeroWrapper.addInvoices(newInvoices);
  return newInvoices;
}

var getOrAddCustomer = async function(shopifyOrder) {
  var shopifyCustomer = shopifyOrder.customer;
  var customerName = '';
  
  // Null checks
  if (shopifyCustomer.first_name != null) {
    customerName = shopifyCustomer.first_name.trim();
  }
  if (shopifyCustomer.last_name != null) {
    customerName += ' ' + shopifyCustomer.last_name.trim();
  }
  
  // If they only have a last name we'll trim the leading space
  customerName = customerName.trim();
  console.log('Processing Order: ' + shopifyOrder.order_number + ' (' + customerName + ')');
  
  let contacts = await xeroWrapper.getContacts(customerName);
  if (contacts.length == 0) {
    contacts = await xeroWrapper.addContact(customerName, shopifyOrder.email);
  }
  
  return contacts[0].contactID;
}

var makeLineItems = function(shopifyOrder) {
  let lineItems = [];

  // Add the line items to the invoice
  for(var i=0; i < shopifyOrder.line_items.length; i++) {
    var shopifyItem = shopifyOrder.line_items[i];
    var xeroLineItem = makeShopifyLineItem(shopifyItem, shopifyOrder.order_number);
    lineItems.push(xeroLineItem);
  }
  return lineItems;
}

var makeShopifyLineItem = function makeShopifyLineItem(item, invoice) {
  if (item.sku.startsWith('WCCUST')) {
    var orderQty = item.quantity;
    var skuQty = item.sku.substring(item.sku.indexOf('-') + 1);
    var newQty = orderQty * skuQty;
    var newSku = item.sku.substring(0, item.sku.indexOf('-'));
    var newPrice = item.price / newQty;
    console.log('- Old sku: ' + item.sku + ' and qty: ' + item.quantity + ' and price: ' + item.price);
    item.sku = newSku;
    item.quantity = newQty;
    item.price = newPrice;
    console.log('- New sku: ' + item.sku + ' and qty: ' + item.quantity + ' and price: ' + item.price);
  }
  var lineItem = new LineItem();
  lineItem.description = item.name;
  lineItem.quantity = item.quantity;
  lineItem.unitAmount = item.price;
  lineItem.itemCode = item.sku;
  lineItem.taxType = getTaxType(item, invoice);
  lineItem.accountCode = '400';
  return lineItem;
}

var makeInvoice = function(shopifyOrder, contactID) {
  const lineItems = makeLineItems(shopifyOrder);
  let contact = new Contact();
  contact.contactID = contactID;

  let newInvoice = new Invoice();
  newInvoice.lineItems= lineItems;
  newInvoice.contact= contact;
  newInvoice.date= shopifyOrder.processed_at.substring(0, 10);
  newInvoice.dueDate= shopifyOrder.processed_at.substring(0, 10);
  newInvoice.invoiceNumber= `SHOP#${shopifyOrder.order_number}`;
  newInvoice.reference= shopifyOrder.id.toString();
  newInvoice.type= Invoice.TypeEnum.ACCREC;

  return newInvoice;
}

// Helper function to figure out the correct TAX code
// TAX002 (8.75% State + County)
// TAX003 (6.00% State + County)
// TAX004 (7.00% State + County)
// TAX005 (7.50% State only)
// TAX006 (8.00% State + County)
var getTaxType = function getTaxType(item, orderNumber) {
  var taxType = 'NONE';

  // No tax on these
  if (item.sku.substring(0,3) == 'ADG') {
    return 'NONE';
  }

  // Figure out the correct taxType
  // 1 line = state only, 2 lines = state + county
  if (item.tax_lines.count == 1) {
    if (item.tax_lines[0].title == 'CA State Tax') {
      taxType = 'TAX005';
    } else {
      console.error('** Need to fix state tax for ' + orderNumber);
    }
  } else if (item.tax_lines.count == 2) {
    var taxRate = item.tax_lines[0].rate + item.tax_lines[1].rate;
    if (taxRate == 0.06) {
      taxType = 'TAX003';
    } else if (taxRate == 0.07) {
      taxType = 'TAX004';
    } else if (taxRate == 0.08) {
      taxType = 'TAX006'
    } else if (taxRate == 0.0875) {
      taxType = 'TAX002';
    } else {
      console.error('*** Need to fix state + county tax for ' + orderNumber);
    }
  }
  return taxType;
}

module.exports = {
  runSync
};