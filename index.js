'use strict';
const util           = require('util');
const events         = require('events');
const crypto         = require('crypto');
const extend         = require('util-extend');
const requestPromise = require('request-promise-native');
const querystring    = require('query-string'); // sorts keys during stringify

/**
 * BitcoindeClient connects to the bitcoin.de API
 * @param {object} settings Object required keys "key" and "secret"
 */
function BitcoindeClient(settings) {
	var self = this;

	let config_default = {
		url:       'https://api.bitcoin.de',
		version:   'v2',
		agent:     'Bitcoin.de NodeJS API Client',
		timeoutMS: 20000
	};
	let config = extend(config_default, settings);
	if (!config.key)    self.emit('error', new Error('required settings "key" is missing'));
	if (!config.secret) self.emit('error', new Error('required settings "secret" is missing'));

	/**
	 * Initialize necessary properties from EventEmitter
	 */
	events.EventEmitter.call(self);

	/**
	 * Perform GET API request
	 * @param  {String}   action   API action
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @return {Object}            The request object
	 */
	self.get = function(action, params) {
		let url = config.url+'/'+config.version+'/'+action;
		return rawRequest('get', url, params);
	};

	/**
	 * Perform POST API request
	 * @param  {String}   action   API action
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @return {Object}            The request object
	 */
	self.post = function(action, params) {
		let url = config.url+'/'+config.version+'/'+action;
		return rawRequest('post', url, params);
	};

	/**
	 * Perform DELETE API request
	 * @param  {String}   action   API action
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @return {Object}            The request object
	 */
	self.delete = function(action, params) {
		let url = config.url+'/'+config.version+'/'+action;
		return rawRequest('delete', url, params);
	};

	/**
	 * Send the actual HTTP request
	 * @param  {String}   method   HTTP method
	 * @param  {String}   url      URL to request
	 * @param  {Object}   params   POST body or Querystring
	 * @return {Object}            The request object
	 */
	let rawRequest = function(method, url, params) {

		let nonce    = noncer.generate();
		let md5Query = 'd41d8cd98f00b204e9800998ecf8427e'; // empty string hash
		let options  = {
			url: url,
			timeout: config.timeoutMS,
			json: true
		};
		let queryParams = querystring.stringify(params);
		
		if (params) {
			switch(method) {
				case 'post':
					md5Query = crypto.createHash('md5')
						.update(queryParams)
						.digest('hex');
					options.form = queryParams;
					options.method = 'POST';
					break;
				case 'get':
					options.url += '?'+queryParams;
					break;
				case 'delete':
					options.url += '?'+queryParams;
					options.method = 'DELETE';
					break;
				default:
					return new Promise((resolve, reject) => {
						let err = new Error('Method ' + method + ' not defined');
						self.emit('error', err);
						reject(err);
					});
			}
		}

		let signature = crypto.createHmac('sha256', config.secret)
			.update([method.toUpperCase(), options.url, config.key, nonce, md5Query].join('#'))
			.digest('hex');

		options.headers = {
			'User-Agent'     : config.agent,
			'X-API-KEY'      : config.key,
			'X-API-NONCE'    : nonce,
			'X-API-SIGNATURE': signature
		};

		return new Promise((resolve, reject) => {
			requestPromise(options)
				.then((data) => {
					if(data.errors && data.errors.length) {
						// can we do something better with data.errors?
						let err = new Error('bitcoin.de API returned error: ' + data.errors[0].message);
						self.emit('error', err);
						reject(err);
					} else {
						resolve(data);
					}
				})
				.catch((error) => {
					let err = new Error('Error in server response: ' + JSON.stringify(error));
					self.emit('error', err);
					reject(err);
				});

		});
	}; // rawRequest

	/**
	 * Nonce generator
	 */
	let noncer = new (function() {

		// if you call Date.now() too fast it will generate
		// the same ms, helper to make sure the nonce is
		// truly unique (supports up to 999 calls per ms).
		this.generate = function() {

			let now = Date.now();

			this.counter = (now === this.last? this.counter + 1 : 0);
			this.last    = now;

			// add padding to nonce
			let padding =
				this.counter < 10 ? '000' :
					this.counter < 100 ? '00' :
						this.counter < 1000 ?  '0' : '';

			return now + padding + this.counter;
		};
	})();
}

util.inherits(BitcoindeClient, events.EventEmitter);

module.exports = BitcoindeClient;
