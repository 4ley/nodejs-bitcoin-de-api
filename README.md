# NodeJS bitcoin.de API

NodeJS Client Library for the [bitcoin.de](https://www.bitcoin.de/de) Trading API

## Installation

```
npm install bitcoinde-api
```

## Example Usage

```javascript
var BitcoindeClient = require('bitcoinde-api');
var bitcoinde = new BitcoindeClient({
  key: 'api_key',
  secret: 'api_secret'
});

// Orderbook
bitcoinde.get('orders', { type: 'sell' })
	.then((result) => {
        console.log(result.orders);
	})
	.catch((error) => {
        console.error(error);
    });

// Account Info
bitcoinde.get('account', null)
	.then((result) => {
        console.log(result.data);
	})
	.catch((error) => {
        console.error(error);
	});

// Catch Error Event
bitcoinde.on('error', function(error) {
    console.error(error);
});
```

**Note**

> ... if an 'error' event handler is not provided, the error will be thrown, causing the Node.js process to report an unhandled exception and crash ...

Read on [NodeJS: Error Propagation and Interception](https://nodejs.org/api/errors.html#errors_error_propagation_and_interception)
