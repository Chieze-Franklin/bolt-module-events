var config = require("bolt-internal-config");
var utils = require("bolt-internal-utils");
var models = require("bolt-internal-models");

var superagent = require('superagent');

module.exports = {
	getInfo: function(request, response){
		//accepts a token and returns publisher, event name, subscriber, hook
	},
	postEvent: function(request, response){
		var evnt = {};
		evnt.body = request.body.body || {};
		evnt.name = utils.String.trim(request.params.name.toLowerCase());
		evnt.publisher = request.appName;
		//if(!utils.Misc.isNullOrUndefined(request.body.subscribers)) { evnt.subscribers = request.body.subscribers; }
		evnt.time = new Date();
		//TODO: event ID, type??

		var criteria = { 
			$or: [{publisher: evnt.publisher}, {publisher: "*"}],
			$or: [{event: evnt.name}, {event: "*"}]
		};
		if(!utils.Misc.isNullOrUndefined(request.body.subscribers)) {
			criteria = { 
				$or: [{publisher: evnt.publisher}, {publisher: "*"}],
				$or: [{event: evnt.name}, {event: "*"}],
				subscriber: { $in: request.body.subscribers } 
			};
		}
		models.hook.find(criteria, function(error, hooks){
			if (!utils.Misc.isNullOrUndefined(hooks)) {
				hooks.forEach(function(hook){
					//TODO: generate evnt.token for each app/subscriber (note that multiple hooks can have the same subscriber)

					//start the subscriber server
					superagent
						.post(config.getProtocol() + '://' + config.getHost() + ':' + config.getPort() + '/api/apps/start')
						.send({ name: hook.subscriber })
						.end(function(appstartError, appstartResponse){
							var context = appstartResponse.body.body;

							//POST the event
							if (!utils.Misc.isNullOrUndefined(context) && !utils.Misc.isNullOrUndefined(context.port)) {
								superagent
									.post(config.getProtocol() + '://' + config.getHost() + ':' + context.port + ("/" + utils.String.trimStart(hook.route, "/")))
									.send(evnt)
									.end(function(evntError, evntResponse){});
							}
						});
				});
			}
		});
		//send event to socket.io so dt it can send it to clients
		//sent event to an event emitter so ppl can do something like BoltEventEmitter.on("bolt/user-login", callback)
			//do this only if no other component can make BoltEventEmitter to emit the event
			
		//send a response back
	},
	postSub: function(request, response){
		//
	},
	postUnsub: function(request, response){
		//
	}
};
