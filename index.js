const express = require('express');
const session = require('express-session');
const morgan = require('morgan')

const shopify = require('./lib/shopify');
const sync = require('./lib/sync');
const xeroWrapper = require('./lib/xero');

require('dotenv').config();

const app = express();
app.use(morgan('tiny'));

app.use(session({
	secret: process.env.EXPRESS_SECRET,
	resave: false,
	saveUninitialized: true,
	cookie: { secure: false },
}));

const port = 3000;
let shopifyStatus = 'unknown';
let xeroStatus = 'unknown';
let xeroLatest = null;
let sinceId = new Date();
let orderDiff = 0;
let newInvoices = [];

function getHeader() {
  let syncedList = '';
  if (newInvoices.length > 0) {
    syncedList += newInvoices[0].invoiceNumber;
    for (let i=1; i < newInvoices.length; i++) {
      syncedList += `, ${newInvoices[0].invoiceNumber}`;
    }
  } else {
    syncedList = 'None Yet';
  }
  const html = `
    <html><body><center>
    <h1>WC Order Processor</h1>
    <table width=50%>
    <tr><th align="left">Shopify Status</th><td>${shopifyStatus}</td></tr>
    <tr><th align="left">Xero Status</th><td>${xeroStatus}</td></tr>
    <tr><th align="left">Order Diff</th><td>${orderDiff}</td></tr>
    <tr><th align="left">Synced Orders</th><td>${syncedList}</td></tr>
    </table>
  `;
  return html;
}

app.get('/', async (req, res) => {
  res.send(`
    ${getHeader()}
    <a href='/connect'>Connect to Xero</a>
  `);
});

app.get('/connect', async(req, res) => {
  try {
    const consentUrl = await xeroWrapper.getConsentUrl();
    res.redirect(consentUrl);  
  } catch (err) {
    console.error(err);
    res.send('Problem fetching consent URL');
  }
});

app.get('/callback', async (req, res) => {
  try {
    xeroLatest = await xeroWrapper.handleCallback(req);
    if (xeroLatest !== null) {
      xeroStatus = xeroLatest.invoiceNumber;
      sinceId = xeroLatest.date.toISOString();
      console.log(`Set sinceId to ${sinceId}`);
    }

    if (xeroStatus.includes('#') && shopifyStatus.includes('#')) {
      shopNum = shopifyStatus.substr(5);
      xeroNum = xeroStatus.substr(5);
      console.log(`shopNum="${shopNum}" and xeroNum="${xeroNum}"`);
      orderDiff = shopNum - xeroNum;
    }
    res.send(`
    ${getHeader()}
      <a href='/sync'>Run The Sync</a>
    `);
	} catch (err) {
    console.error(err);
		res.send('Problem with Xero callback');
	}
});

app.get('/sync', async (req, res) => {
  try {
    newInvoices = await sync.runSync(sinceId);
    res.send(`
      ${getHeader()}
      Sync Done
    `)
  } catch (err) {
    console.error(err);
    res.send(`Problem with order sync`);
  }
});

app.listen(port, async() => {
  shopifyStatus = await shopify.init();
  console.log(`WC Order Processor listening at http://localhost:${port}`)
})