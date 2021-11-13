const { XeroClient, Contact, Contacts, Invoices } = require('xero-node');
const jwtDecode = require('jwt-decode');
require('dotenv').config();

const xeroClient = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.REDIRECT_URI],
  scopes: 'offline_access openid profile email accounting.settings accounting.attachments accounting.contacts accounting.transactions'.split(" "),
});
var tenantId = '';

var getConsentUrl = async function() {
  const consentUrl = await xeroClient.buildConsentUrl();
  console.log(`Got the consent URL from Xero`);
  return consentUrl;
}

var handleCallback = async function(req) {
  const tokenSet = await xeroClient.apiCallback(req.url);
  await xeroClient.updateTenants();
  
  const decodedIdToken = jwtDecode(tokenSet.id_token);
  const decodedAccessToken = jwtDecode(tokenSet.access_token);
  
  req.session.decodedIdToken = decodedIdToken;
  req.session.decodedAccessToken = decodedAccessToken;
  req.session.tokenSet = tokenSet;
  req.session.allTenants = xeroClient.tenants;
  // XeroClient is sorting tenants behind the scenes so that most recent / active connection is at index 0
  req.session.activeTenant = xeroClient.tenants[0];
  tenantId = xeroClient.tenants[0].tenantId;
  
  // Try to get the invoices list
  invoices = await getInvoices();
  console.log(`There are this many invoices: ${invoices.length}`);
  if (invoices.length > 0) {
    return invoices[0];
  }
  return null;
}

var getContacts = async function(customerName) {
  const where = `Name=="${customerName}"`;
  const contacts = await xeroClient.accountingApi.getContacts(tenantId, null, where)
  return contacts.body.contacts;
}

var addContact = async function(customerName, email) {
  // Create the contact details
  let newContact = new Contact();
  newContact.name = customerName;
  newContact.emailAddress = email;

  let newContacts = new Contacts();
  newContacts.contacts = [newContact];

  const createdContacts = await xeroClient.accountingApi.createContacts(tenantId, newContacts);
  return createdContacts.body.contacts;
}

var addInvoices = async function(invoices) {
  let newInvoices = new Invoices();
  newInvoices.invoices = invoices;
  console.log(newInvoices);
  return await xeroClient.accountingApi.createInvoices(tenantId, newInvoices);
}

var getInvoices = async function() {

  const where = 'Type=="ACCREC" AND InvoiceNumber.StartsWith("SHOP")';
  const order = 'InvoiceNumber DESC';

  // Just get 1 page of invoices
  const invoices = await xeroClient.accountingApi.getInvoices(tenantId, null, where, order, null, null, null, null, 1);
  return invoices.body.invoices;
}

module.exports = {
  handleCallback,
  getConsentUrl,
  getContacts,
  addContact,
  addInvoices,
  getInvoices,
};