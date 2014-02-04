/*
 * QuickBlox VideoChat WebRTC signaling library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */
 
// QB Account params
var QBPARAMS = {
                        app_id      : '92',
                        auth_key    : 'wJHdOcQSxXQGWx5',
                        auth_secret : 'BTFsj7Rtt27DAmT'
}

//Chat params
var CHAT = {
                        server      : 'chat.quickblox.com',
                        bosh_url    : 'http://chat.quickblox.com:5280'
}

var QB_CALL = 'qbvideochat_call';
var QB_ACCEPT = 'qbvideochat_acceptCall';
var QB_REJECT = 'qbvideochat_rejectCall';
var QB_CANDIDATE = 'qbvideochat_candidate';
var QB_STOPCALL = 'qbvideochat_stopCall';

var connection, userJID;

/*
  Public methods:
  	- connect({login: login, password: password})
  	- call(userID, sessionDescription, sessionID)
  	- accept(userID, sessionDescription, sessionID)
  	- reject(userID, sessionID)
  	- sendCandidate(userID, candidate, sessionID)
  	- stop(userID, reason, sessionID)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onCall(fromUserID, sessionDescription)
	- onAccept(fromUserID, sessionDescription)
	- onReject(fromUserID)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */
 
function QBVideoChatSignaling(){

	function xmppConnect(user_id, password) {
		connection = new Strophe.Connection(CHAT.bosh_url);
		connection.rawInput = rawInput;
		connection.rawOutput = rawOutput;
		connection.addHandler(onMessage, null, 'message', QB_CALL, null,  null);
		connection.addHandler(onMessage, null, 'message', QB_ACCEPT, null,  null); 
		connection.addHandler(onMessage, null, 'message', QB_REJECT, null,  null); 
		connection.addHandler(onMessage, null, 'message', QB_CANDIDATE, null,  null);
		connection.addHandler(onMessage, null, 'message', QB_STOPCALL, null,  null); 
 
		traceS(connection);

		userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		traceS('Connecting to Chat: userJID=' + userJID + ', password=' + password);
	
		connection.connect(userJID, password, function (status) {
			switch (status) {
			case Strophe.Status.ERROR:
				traceS('[Connection] Error');
				break;
			case Strophe.Status.CONNECTING:
				traceS('[Connection] Connecting');
				break;
			case Strophe.Status.CONNFAIL:
				onConnectionFailed('[Connection] Failed to connect');
				break;
			case Strophe.Status.AUTHENTICATING:
				traceS('[Connection] Authenticating');
				break;
			case Strophe.Status.AUTHFAIL:
				onConnectionFailed('[Connection] Unauthorized');
				break;
			case Strophe.Status.CONNECTED:
				traceS('[Connection] Connected');
				onConnectionSuccess(user_id);
				break;
			case Strophe.Status.DISCONNECTED:
				traceS('[Connection] Disconnected');
				break;
			case Strophe.Status.DISCONNECTING:
				traceS('[Connection] Disconnecting');
				onConnectionDisconnected();
				break;
			case Strophe.Status.ATTACHED:
				traceS('[Connection] Attached');
				break;
			}
		});
	}
}
 
QBVideoChatSignaling.prototype.login = function (params){
	// Init QB application
	//
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	
	// Create session
	// 
	QB.createSession(params, function(err, result){
		if (err) {
			onConnectionFailed(err.detail);

		} else {
			traceS(result);
		
		    // Login to Chat
		    //
		    this.xmppConnect(result.user_id, params['password']);
		}
	});
}

QBVideoChatSignaling.prototype.call = function(userID, sessionDescription, sessionID) {
	traceS('call ' + userID);
    this.sendMessage(userID, QB_CALL, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.accept = function(userID, sessionDescription, sessionID) {
	traceS('accept ' + userID);
    this.sendMessage(userID, QB_ACCEPT, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.reject = function(userID, sessionID) {
	traceS('reject ' + userID);
    this.sendMessage(userID, QB_REJECT, null, sessionID);
}

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	traceS('sendCandidate ' + userID + ', candidate: ' + candidate);
    this.sendMessage(userID, QB_CANDIDATE, candidate, sessionID);
}

QBVideoChatSignaling.prototype.stop = function(userID, reason, sessionID) {
	traceS('stop ' + userID);
    this.sendMessage(userID, QB_STOPCALL, reason, sessionID);
}




function rawInput(data) {
    traceS('RECV: ' + data);
}

function rawOutput(data) {
    traceS('SENT: ' + data);
}

function onMessage(msg) {
    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');
    var body = Strophe.getText(elems[0]);
         
	traceS('onMessage: from ' + from + ',type: ' + type);
         
	fromUserID = from.split('-')[0];
	
	switch (type) {
	case QB_CALL:
		onCall(fromUserID, body);
		break;
	case QB_ACCEPT:
		onAccept(fromUserID, body);
		break;
	case QB_REJECT:
		onReject(fromUserID);
		break;
	case QB_CANDIDATE:
		onCandidate(fromUserID, body);
		break;
	case QB_STOPCALL:
		onStop(fromUserID, body);
		break;
	}

    // we must return true to keep the handler alive.  
    // returning false would remove it after it finishes.
    return true;
}

/*
 * Helpers 
 */
function sendMessage(userID, type, data, sessionID) {
    var opponentJID = userID + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	var body = data == null ? '' : data;
    
    var reply = $msg({to: opponentJID, 
                     from: userJID, 
                     type: type})
            .cnode(Strophe.xmlElement('body', body));
        
    connection.send(reply);
}

function xmppTextToDictionary(data) {
	try {
		return $.parseJSON(Strophe.unescapeNode(data));
	} catch(err) {
		return Strophe.unescapeNode(data);
	}
}

function xmppDictionaryToText(data) {
	return Strophe.escapeNode(JSON.stringify(data));
}

function traceS(text) {
 	 console.log("[qb_videochat_signalling]: " + text);
}
