'use strict';
const util           = require('util');
const events         = require('events');
const crypto         = require('crypto');
const extend         = require('util-extend');
const requestPromise = require('request-promise-native');
const querystring    = require('querystring');

/**
 * BitcoindeClient connects to the bitcoin.de API
 * @param {object} settings Object required keys "key" and "secret"
 */
function BitcoindeClient(settings) {
	var self = this;

	let config_default = {
		url: 'https://api.bitcoin.de',
		version: 'v2',
		agent: 'Bitcoin.de NodeJS API Client',
		timeoutMS: 20000
	};
	let config = extend(config_default, settings);
	if (!config.key) self.emit('error', new Error('required settings "key" is missing'));
	if (!config.secret) self.emit('error', new Error('required settings "secret" is missing'));

    /**
     * Initialize necessary properties from EventEmitter
     */
	events.EventEmitter.call(self);

    /**
     * Perform GET API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @return {Object}            The request object
     */
	self.get = function(method, params) {
		var url = config.url+'/'+config.version+'/'+method;
		return rawRequest('get', url, params);
	};

    /**
     * Perform POST API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @return {Object}            The request object
     */
    self.post = function(method, params) {
        var url = config.url+'/'+config.version+'/'+method;
        return rawRequest('post', url, params);
    };

    /**
     * Perform DELETE API request
     * @param  {String}   method   API method
     * @param  {Object}   params   Arguments to pass to the api call
     * @return {Object}            The request object
     */
    self.delete = function(method, params) {
        var url = config.url+'/'+config.version+'/'+method;
        return rawRequest('delete', url, params);
    };

    /**
     * Send the actual HTTP request
     * @param  {String}   method   HTTP method
     * @param  {String}   url      URL to request
     * @param  {Object}   params   POST body
     * @return {Object}            The request object
     */
	var rawRequest = function(method, url, params) {

		let nonce    = noncer.generate();
		let md5Query = 'd41d8cd98f00b204e9800998ecf8427e'; // empty string hash
		let options  = {
			url: url,
			timeout: config.timeoutMS,
			json: true
		};

        if(params) {
            switch(method) {
                case 'post':
                    var queryParams = {};
                    Object.keys(params).sort().forEach(function(idx) { queryParams[idx] = params[idx]; });
                    md5Query = crypto.createHash('md5').update(querystring.stringify(queryParams)).digest('hex');
                    options.form = queryParams;
					options.method = 'POST';
                    break;
                case 'get':
                    options.url += '?'+querystring.stringify(params);
                    break;
                case 'delete':
                    options.url += '?'+querystring.stringify(params);
					options.method = 'DELETE';
                    break;
                default:
                    var err = new Error('Method ' +method+ ' not defined');
                    self.emit('error', err);
					return new Promise((resolve, reject) => {
						reject(err)
					});
            }
        }

        var signature = crypto.createHmac('sha256', config.secret).update(
            method.toUpperCase()+'#'+options.url+'#'+config.key+'#'+nonce+'#'+md5Query
        ).digest('hex');

        options.headers = {
            'User-Agent': config.agent,
            'X-API-KEY': config.key,
            'X-API-NONCE': nonce,
            'X-API-SIGNATURE': signature
        };

		return new Promise((resolve, reject) => {
			requestPromise(options)
				.then((data) => {
					if(data.errors && data.errors.length) {
						// can we do something better with data.errors?
						err = new Error('Bitcoin.de API returned error: '+data.errors[0].message);
						self.emit('error', err);
						reject(err)
					} else {
						resolve(data)
					}
				})
				.catch((error) => {
					err = new Error('Error in server response: '+JSON.stringify(error));
					self.emit('error', err);
					reject(err)
				});

		});
    }; // rawRequest

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
