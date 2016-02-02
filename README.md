NodeJS bitcoin.de API
===========

NodeJS Client Library for the [bitcoin.de](https://www.bitcoin.de/de) Trading API

Example Usage:

```javascript
var BitcoindeClient = require('bitcoinde-api');
var bitcoinde = new BitcoindeClient('api_key', 'api_secret');

// Orderbook
bitcoinde.get('orders', { type: 'sell' }, function(error, result) {
    if(error) {
        console.log(error);
    } else {
        console.log(result.orders);
    }
});

// Account Info
bitcoinde.get('account', null, function(error, result) {
    if(error) {
        console.log(error);
    } else {
        console.log(result.data);
    }
});
```
