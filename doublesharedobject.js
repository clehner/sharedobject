function SharedStorage(storage) {
	SharedObject.call(this);
	if (!storage) { storage = localStorage; }
	this.bind(function (key, value) {
		if (value == null) {
			storage.removeItem(key);
		} else {
			storage.setItem(key, value);
		}
	}, this);
	for (var i = 0; i < storage.length; i++) {
		var key = storage.key(i);
		this.set(key, storage.getItem(key), this);
	}
	var self = this;
	window.addEventListener("storage", function (e) {
		if (storage.getItem(e.key) === e.newValue) {
			self.set(e.key, e.newValue, self);
		}
	}, false);
}
SharedStorage.prototype = new SharedObject();

function SubObject(source, prefix) {
	SharedObject.call(this);
	var self = this;
	var prefixLength = prefix.length;
	self.bind(function (key, value) {
		source.set(prefix + key, value, self);
	}, source);
	source.bind(function (key, value) {
		if (key.indexOf(prefix) == 0) {
			self.set(key.substr(prefixLength), value, source);
		}
	}, this);
}
SubObject.prototype = new SharedObject();




function DoubleSharedObject(source, sources) {
	SharedObject.call(this);
	this._source = source;
	//this._sources = sources || {};
	this._objects = {};
	this.manageObject(this);
	source.bind(this._receiveFlatValue, this);
}
/** @this {DoubleSharedObject} */
DoubleSharedObject.prototype = (function () {
	var KEY_DELIMITER = ".";
	var ID_LENGTH = 2; 
	var REFERENCE_MARKER = "#";
	var STRING_MARKER = " ";
	
	// Random strings are used for ids to minimize collisions.
	// 61^5 = 844596301 permutations
	// 65536^2 = 4294967296
	function generateId() {
		return String.fromCharCode(
			65536 * Math.random(),
			65536 * Math.random()
		);
	}

	this._source = SharedObject.prototype;
	//this._sources = {};
	this._objects = {};
	this._contexts = {};
	
	function makeObject(id) {
		var obj = new SharedObject();
		obj._id = id;
		this.manageObject(obj);
		return obj;
	}
	
	function destroyObject(obj) {
		var context = this._contexts[obj._id];
		obj.unbind(onObjectUpdate, context);
		obj.unbind(updateRefs, this);
		for (var key in obj.valueOf()) {
			obj.set(key, null);
		}
		//delete obj._sourceDouble;
		delete this._objects[obj._id];
	}
	
	this.manageObject = function manageObject(obj /*:SharedObject*/) {
		var id = obj._id;
		if (id in this._objects) { return; }
		if (id == null) {
			// The source must have an empty id.
			id = obj._id = (obj == this) ? "" : generateId();
		}
		//obj._sourceDouble = this;
		this._objects[id] = obj;
		var context = this._contexts[id] = {source: this, id: id};
		obj.bind(onObjectUpdate, context);
		obj.bind(updateRefs, this);
	}
	
	/** @this {Object} */
	function onObjectUpdate(key, value, prevValue) {
		setValue.call(this.source, this.id, key, value, prevValue, this);
	}
	
	function setValue(objectId, key, value, prevValue, context) {
		var key2 = objectId + KEY_DELIMITER + key;
		var value2;
		if (value instanceof SharedObject) {
			// claim unmanaged state objects
			this.manageObject(value);
			value2 = REFERENCE_MARKER + value._id;
		} else if (value == null) {
			value2 = null;
		} else {
			value2 = STRING_MARKER + value;
		}
		this._source.set(key2, value2, context);
	}
	
	function updateRefs(key, value, prevValue) {
		if (value instanceof SharedObject) {
			value._numRefs = ~~value._numRefs + 1;
		}
		if (prevValue instanceof SharedObject) {
			if (--prevValue._numRefs == 0) {
				destroyObject.call(this, prevValue);
			}
		}
	}
	
	// distribute a flat state update to state objects
	this._receiveFlatValue = function receiveFlatValue(key2, value2) {
		// Extract the object and the key from key2.
		// key2 is in the form (objectId + KEY_DELIMITER + key)
		var id, object, key;
		if (key2[0] == KEY_DELIMITER) {
			// it's a global value (a property of the source)
			id = "";
			object = this;
			key = key2.substr(1);
		} else {
			var i = (key2[ID_LENGTH] == KEY_DELIMITER) ?
				ID_LENGTH : key2.indexOf(KEY_DELIMITER);
			id = key2.substr(0, i);
			key = key2.substr(1 + i);
			object = this._objects[id] || makeObject.call(this, id);
		}
		
		// Unserialize the value from value2.
		// The first character of value2 determines the type.
		// It can be a string, a reference to another wave state object,
		// or a wave participant state object.
		// The rest of value2 is the actual value or reference.
		// It also could be null if it is being deleted.
		
		var context = this._contexts[id];
		var value;
		if (value2 == null) {
			value = null;
		} else {
			value = value2.substr(1);
			var marker = value2[0];
			if (marker == "") {
			} else if (marker == REFERENCE_MARKER) {
				value = this._objects[value] || makeObject.call(this, value);
			/*} else if (marker in this._sources) {
				this._sources[marker].bindOnce(value, function (v) {
					value = v;
					object.set(key, value, context);
				}, this);
				return;*/
			}
			/*switch(value2[0]) {
			case " ":
			break;
			case REFERENCE_MARKER:
				value = this._objects[value] || this._getObject(value);
			break;
			case PARTICIPANT_MARKER:
				value = stuff.waveParticipants._objects[value]; //|| waveParticipants._owesObject(stateObject, key, value);
			case JSON_MARKER:
				value = JSON.parse(value);
			
			}*/
		}
		
		// notify the object of the update
		object.set(key, value, context);
	};

	return this;
}).call(new SharedObject());

var i=0;
function DoubleDelimitedSharedObject(source, keyDelimiter) {
	SharedObject.call(this);
	keyDelimiter = keyDelimiter || "|";
	var self = this;
	
	function onObjectUpdate(key, value, prevValue) {
		if (prevValue instanceof SharedObject) {
			destroyObject(prevValue);
		}
		if (value instanceof SharedObject) {
			value._keyPrefix = this._keyPrefix + key + keyDelimiter;
			manageObject(value);
		} else {
			source.set(this._keyPrefix + key, value, self);
		}
	}
	
	function manageObject(obj) {
		obj.bind(onObjectUpdate, obj);
	}
	
	function unmanageObject(obj) {
		obj.unbind(onObjectUpdate, obj);
	}
	
	function destroyObject(obj) {
		unmanageObject(obj);
		for (var key in obj.valueOf()) {
			obj.set(key, null);
		}
	}
	
	function receiveRawValue(rawKey, value /*:string*/) {
		var subkeys = rawKey.split(keyDelimiter);
		var key = subkeys.pop();
		var obj = this, subObj;
		for (var i = 0; i < subkeys.length; i++) {
			var subkey = subkeys[i];
			subObj = obj.getObject(subkey);
			subObj._keyPrefix = obj._keyPrefix + subkey + keyDelimiter;
			obj = subObj;
		}
		obj.set(key, value, this);
	}
	
	this._keyPrefix = "";
	manageObject(this);
	source.bind(receiveRawValue, this);
}
DoubleDelimitedSharedObject.prototype = new SharedObject();