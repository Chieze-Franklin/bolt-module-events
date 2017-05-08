var config = require("bolt-internal-config");
var utils = require("bolt-internal-utils");
var models = require("bolt-internal-models");
var sockets = require("bolt-internal-sockets");

var superagent = require('superagent');

module.exports = {
	postEvent: function(request, response){
		var evnt = {};
		evnt.body = request.body.body || {};
		evnt.name = utils.String.trim(request.params.name.toLowerCase());
		evnt.publisher = request.appName;
		//if(!utils.Misc.isNullOrUndefined(request.body.subscribers)) { evnt.subscribers = request.body.subscribers; }
		evnt.time = new Date();

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
					//start the subscriber server
					superagent
						.post(process.env.BOLT_ADDRESS + '/api/apps/start')
						.send({ name: hook.subscriber })
						.end(function(appstartError, appstartResponse){
							var context = appstartResponse.body.body;

							//POST the event
							if (!utils.Misc.isNullOrUndefined(context)) {
								var event = evnt;
								event.token = request.genAppToken(context.name); //set the event token to equal he app token

								if (!utils.Misc.isNullOrUndefined(context.port)) {
									superagent
										.post(context.protocol + '://' + context.host + ':' + context.port + ("/" + utils.String.trimStart(hook.route, "/")))
										.send(event)
										.end(function(evntError, evntResponse){});
								}
								else if (context.app.system) {
									superagent
										.post(process.env.BOLT_ADDRESS + "/x/" + context.name + ("/" + utils.String.trimStart(hook.route, "/")))
										.send(event)
										.end(function(evntError, evntResponse){});
								}
									
								/*//send event to socket for the app
								var socket = sockets.getSocket(context.name); //socket will always be undefined if context is running on another process
								if (!utils.Misc.isNullOrUndefined(socket)) 
									//socket.send(JSON.stringify(event));
									socket.broadcast.to(context.name).emit("message", JSON.stringify(event));*/
							}
						});
				});
			}
		});

		//send event to socket for bolt
		var socket = sockets.getSocket("bolt");
		if (!utils.Misc.isNullOrUndefined(socket)) {
			var event = evnt;
			event.token = request.genAppToken("bolt"); //set the event token to equal he app token

			//socket.send(JSON.stringify(event));
			socket.broadcast.to("bolt").emit("message", JSON.stringify(event));
		}
		
		//send event to an event emitter so ppl can do something like BoltEventEmitter.on("bolt/user-login", callback)
			//do this only if no other component can make BoltEventEmitter to emit the event
			//I dont feel like doing this since everybody will get the event irrespective of the "subscribers" specified by the publisher
			
		//send a response back
		response.send();
	}
};
