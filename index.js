var util        = require('util');
var events      = require('events');
var crypto      = require('crypto');
var request     = require('request');
var querystring = require('querystring');

/**
 * BitcoindeClient connects to the bitcoin.de API
 * @param {String} key    API Key
 * @param {String} secret API Secret
 */
function BitcoindeClient(key, secret) {
    var self = this;

    var config = {
        url: 'https://api.bitcoin.de',
        version: 'v2',
        agent: 'Bitcoin.de NodeJS API Client',
        key: key,
        secret: secret,
        timeoutMS: 20000
    };

    /**
     * Initialize necessary properties from EventEmitter
     */
     events.EventEmitter.call(self);

    /**
     * Perform GET API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @param  {Function} callback A callback function to be executed when the request is complete
     * @return {Object}            The request object
     */
    self.get = function(method, params, callback) {
        var url = config.url+'/'+config.version+'/'+method;
        return rawRequest('get', url, params, callback);
    };

    /**
     * Perform POST API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @param  {Function} callback A callback function to be executed when the request is complete
     * @return {Object}            The request object
     */
    self.post = function(method, params, callback) {
        var url = config.url+'/'+config.version+'/'+method;
        return rawRequest('post', url, params, callback);
    };

    /**
     * Perform DELETE API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @param  {Function} callback A callback function to be executed when the request is complete
     * @return {Object}            The request object
     */
    self.delete = function(method, params, callback) {
        var url = config.url+'/'+config.version+'/'+method;
        return rawRequest('del', url, params, callback);
    };

    /**
     * Send the actual HTTP request
     * @param  {String}   method   HTTP method
     * @param  {String}   url      URL to request
     * @param  {Object}   params   POST body
     * @param  {Function} callback A callback function to call when the request is complete
     * @return {Object}            The request object
     */
    var rawRequest = function(method, url, params, callback) {

        var nonce    = noncer.generate();
            md5Query = 'd41d8cd98f00b204e9800998ecf8427e', // empty string hash
            options  = {
                url: url,
                timeout: config.timeoutMS
            };

        if(params) {
            switch(method) {
                case 'post':
                    var queryParams = {};
                    Object.keys(params).sort().forEach(function(idx) { queryParams[idx] = params[idx]; });
                    md5Query = crypto.createHash('md5').update(querystring.stringify(queryParams)).digest('hex');
                    options.form = queryParams;
                    break;
                case 'get':
                case 'del':
                    options.url += '?'+querystring.stringify(params);
                    break;
                default:
                    var err = new Error(method+' not defined');
                    self.emit('error', err);
                    return (typeof callback === 'function'? callback.call(self, err, null) : null);
            }
        }

        var signature = crypto.createHmac('sha256', config.secret).update(
            (method == 'del'? 'DELETE' : method.toUpperCase())+'#'+options.url+'#'+config.key+'#'+nonce+'#'+md5Query
        ).digest('hex');

        options.headers = {
            'User-Agent': config.agent,
            'X-API-KEY': config.key,
            'X-API-NONCE': nonce,
            'X-API-SIGNATURE': signature
        };

        var req = request[method](options, function(error, response, body) {
            if(typeof callback === 'function') {
                var data, err;

                if(error) {
                    err = new Error('Error in server response: '+JSON.stringify(error));
                    self.emit('error', err);
                    return callback.call(self, err, null);
                }

                try {
                    data = JSON.parse(body);
                } catch(e) {
                    err = new Error('Could not understand response from server: '+body);
                    self.emit('error', err);
                    return callback.call(self, err, null);
                }

                if(data.errors && data.errors.length) {
                    err = new Error('Bitcoin.de API returned error: '+data.errors[0].message);
                    self.emit('error', err);
                    return callback.call(self, err, data.errors);
                } else {
                    return callback.call(self, null, data);
                }
            }
        });

        return req;
    };

    /**
     * Nonce generator
     */
    var noncer = new (function() {

        // if you call Date.now() to fast it will generate
        // the same ms, helper to make sure the nonce is
        // truly unique (supports up to 999 calls per ms).
        this.generate = function() {

            var now = Date.now();

            this.counter = (now === this.last? this.counter + 1 : 0);
            this.last    = now;

            // add padding to nonce
            var padding =
                this.counter < 10 ? '000' :
                    this.counter < 100 ? '00' :
                        this.counter < 1000 ?  '0' : '';

            return now+padding+this.counter;
        };
    })();
};

util.inherits(BitcoindeClient, events.EventEmitter);

module.exports = BitcoindeClient;
