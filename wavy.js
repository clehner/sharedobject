(function () {

var wavy = new SharedObject();

var bufferLevel = 0;

wavy.bufferStart = function () {
	if (0 == bufferLevel++) {
		wavy.set("buffering", true, wavy);
	}
};

wavy.bufferEnd = function () {
	if (--bufferLevel == 0) {
		wavy.set("buffering", false, wavy);
	}
};

wavy.bufferFn = function (fn, context) {
	var newBuffer = !bufferLevel && wavy.bufferStart();
	fn.call(context);
	newBuffer && wavy.bufferEnd();
};

wavy.flushBuffer = function () {
	wavy.bufferEnd();
	wavy.bufferStart();
};

wavy.bind("buffering", function (buffering) {
	bufferLevel = ~~!!buffering;
}, wavy);

/** @constructor */
function WaveStateSharedObject(waveState) {
	SharedObject.call(this);

	var buffer = {};
	this.bind(function onUpdateValue(key, value) {
		if (bufferLevel == 0) {
			waveState.submitValue(key, value);
		} else {
			buffer[key] = value;
		}
	});
	
	wavy.bind("buffering", function (isBuffering, wasBuffering) {
		if (!isBuffering && wasBuffering) {
			waveState.submitDelta(buffer);
			buffer = {};
		}
	});

	var rawState = {};
	this._onStateUpdate = function onStateUpdate() {
		var newRawState = waveState.state_;
		
		// get deleted keys
		for (var key in rawState) {
			if (!(key in newRawState || rawState[key] == null)) {
				delete rawState[key];
				this.set(key, null, this);
			}
		}
		
		// get changed keys
		for (var key in newRawState) {
			var value = newRawState[key];
			if (value !== rawState[key]) {
				rawState[key] = value;
				this.set(key, value, this);
			}
		}
	};
	return this;
}
WaveStateSharedObject.prototype = new SharedObject();

/** @constructor */
function ParticipantsSharedObject() {
	SharedObject.call(this);

	var participants = {}; //wave.Participant
	
	// properties of wave.Participants mapped to state object properties
	var properties = {
		"id_": "id",
		"displayName_": "displayName",
		"thumbnailUrl_": "thumbnailUrl"
	};
	
	this._updateParticipants = function updateParticipants(newParticipants) {
		// check for removed participants
		for (var id in participants) {
			if (!(id in newParticipants)) {
				this.set(id, null, this);
			}
		}
		
		// check for new or updated participants
		for (var id in newParticipants) {
			var newParticipant = newParticipants[id]; // wave.Participant
			var oldParticipant = participants[id]; // wave.Participant
			var part; // SharedObject
			
			// check if the participant is new
			if (!oldParticipant) {
				part = new SharedObject();
				// get all its properties
				for (var prop in properties) {
					part.set(properties[prop], newParticipant[prop]);
				}
				this.set(id, part, this);
				continue;
			}
			
			// check for changed properties
			part = this.get(id);
			for (var prop in properties) {
				if (newParticipant[prop] != oldParticipant[prop]) {
					// property changed
					part.set(properties[prop], newParticipant[prop]);
				}
			}
		}
		participants = newParticipants;
	};
}
ParticipantsSharedObject.prototype = new SharedObject();

// Set up Wave callbacks
window.gadgets && gadgets.util.registerOnLoadHandler(function onLoad() {
	if (window.wave && wave.isInWaveContainer()) {
		wave.setParticipantCallback(function () {
			var parts = new ParticipantsSharedObject();
			wave.setParticipantCallback(function () {
				parts._updateParticipants(wave.participantMap_);
				var viewer = wave.getViewer();
				wavy.set("viewer", viewer && parts.get(viewer.getId()));
				var host = wave.getHost();
				wavy.set("host", host && parts.get(host.getId()));
			});
			wavy.set("participants", parts);
		});
		wave.setStateCallback(function (state) {
			var obj = new WaveStateSharedObject(state);
			wave.setStateCallback(obj._onStateUpdate, obj);
			wavy.set("state", obj);
		});
		if (wave.setPrivateStateCallback) {
			wave.setPrivateStateCallback(function (state) {
				var obj = new WaveStateSharedObject(state);
				wave.setPrivateStateCallback(obj._onStateUpdate, obj);
				wavy.set("private_state", obj);
			});
		}
		wave.setModeCallback(function (mode) {
			wavy.set("mode",
				mode == wave.Mode.VIEW ? "view" :
				mode == wave.Mode.EDIT ? "edit" :
				mode == wave.Mode.PLAYBACK ? "playback" :
				mode == wave.Mode.DIFF_ON_OPEN ? "diff_on_open" :
				mode == wave.Mode.UNKNOWN ? "unknown" : mode
			);
		});
	}
});

window["wavy"] = wavy;

})();
