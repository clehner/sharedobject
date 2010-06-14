/** @constructor */
function SharedObject() {
	this._state = {};
	this._handlers = {};
	this._catchalls = [];
}
SharedObject.prototype = {
	constructor: SharedObject,
	_state: null,
	_catchalls: null, // handlers that fire for every key
	_handlers: null, // handlers that fire for particular keys
	
	valueOf: function valueOf() {
		return this._state;
	},

	/**
	 * Get the current value of a key.
	 * @param {string=} key The key to get the value of.
	 * @return {*} The value of the key.
	 */
	get: function get(key) {
		return this._state[key];
	},

	getObject: function getObject(key) {
		var obj = this.get(key);
		if (!(obj instanceof SharedObject)) {
			obj = new SharedObject()
			this.set(key, obj);
		}
		return obj;
	},
	
	out2: function (key, value) {
		this._flat[key] = (value instanceof SharedObject) ?
			value.out() : value;
	},
	
	out: function out() {
		if (!this._flat) {
			this._flat = {};
			this.bind(this.out2, this);
		}
		return this._flat;
	},
	
	/**
	 * Set the value of a key, and fire relevant listeners. If a context
	 * is specified, than listeners with that context will not be fired.
	 * @param {string} key The key to set the value of.
	 * @param {*} value The value to set.
	 * @param {object=} context The object that is setting the value.
	 * @return {*} The value of the key.
	 */
	set: function set(key, value, context) {
		if (typeof arguments[0] == "object") {
			// can set values with a key-value object
			var values = arguments[0];
			var context2 = arguments[1];
			if (values instanceof SharedObject) {
				values = values.valueOf();
			}
			for (var key2 in values) {
				set.call(this, key2, values[key2], context2);
			}
			return this;
		}
		var prevValue = this._state[key];
		if (prevValue === value) {
			return this;
		}
		this._state[key] = value;
		// notify handlers
		var obj = this;
		do {
			var handlers = obj._catchalls;
			if (handlers) for (var i = 0; i < handlers.length; i++) {
				var handler = handlers[i];
				var context2 = handler[1];
				if (context2 == null || context2 != context) {
					handler[0].call(context2 || this, key, value, prevValue);
				}
			}
			
			handlers = obj._handlers ? obj._handlers[key] : null;
			if (handlers) for (var i = 0; i < handlers.length; i++) {
				var handler = handlers[i];
				var context2 = handler[1];
				if (context2 == null || context2 != context) {
					handler[0].call(context2 || this, value, prevValue);
				}
			}
			
			// climb the prototype chain.
			obj = obj.__proto__ ||
				(Object.getPrototypeOf ? Object.getPrototypeOf(obj) :
				obj.constructor.prototype);
		} while ((obj instanceof SharedObject ||
			obj == SharedObject.prototype) && obj != this);
		return this;
	},
	/*
	function handler, object context
	object handlers, object context
	string key, function handler, object context
	*/
	bind: function bind(a, b, c) {
		var key, handler, handlers, context, listeners;
		switch(typeof a) {
		case "function":
			(handler = a, context = b)
			handlers = this._catchalls || (this._catchalls = []);
			handlers.push([handler, context]);
			// apply retroactively
			for (key in this._state) {
				handler.call(context || this, key, this._state[key], null);
			}
		break;
		case "object":
			(handlers = a, context = b)
			for (key in handlers) {
				bind.call(this, key, handlers[key], context);
			}
		break;
		default:
			(key = a, handler = b, context = c)
			var keys = this._handlers || (this._handlers = {});
			handlers = keys[key] || (keys[key] = []);
			handlers.push([handler, context]);
			// apply retroactively
			var value = this._state[key];
			if (value != null) {
				handler.call(context || this, value, null);
			}
		}
		return this;
	},
	
	unbind: function unbind(arg1, arg2, arg3) {
		switch(typeof a) {
		case "function":
			var handler = arg1;
			var context = arg2;
			var handlers = this._catchalls;
			if (handlers) {
				for (var i = 0; i < handlers.length; i++) {
					var someHandler = handlers[i];
					if (someHandler[0] == handler &&
						someHandler[1] == context) {
						handlers.splice(i, 1);
					}
				}
			}
		break;
		case "object":
			var handlers = arg1;
			var context = arg2;
			for (var key in handlers) {
				unbind.call(this, key, handlers[key], context);
			}
		break;
		default:
			var key = arg1;
			var handler = arg2;
			var context = arg3;
			var keys = this._handlers;
			if (keys && (handlers = keys[key])) {
				for (var i = 0; i < handlers.length; i++) {
					var someHandler = handlers[i];
					if (someHandler[0] == handler &&
						someHandler[1] == context) {
						handlers.splice(i, 1);
					}
				}
			}
		}
		return this;
	},
	
	/**
	 * Bind a function to a key but unbind it after it fires once.
	 * @param {string} key The key to bind the handler to.
	 * @param {function(string, string)} handler The handler function.
	 * @param {object=} context Context object for the function.
	 */
	bindOnce: function bindOnce(key, handler, context) {
		var value = this._state[key];
		if (value == null) {
			this.bind(key, function bound() {
				handler.apply(context, arguments);
				this.unbind(key, bound, this);
			}, this);
		} else {
			handler.call(context, value);
		}
		return this;
	},
	
	bindObj: function bindObj(key1, obj2, key2) {
		var obj1 = this;
		obj1.bind(key1, function (val) { obj2.set(key2, val, obj1); }, obj2);
		obj2.bind(key2, function (val) { obj1.set(key1, val, obj2); }, obj1);
		return this;
	}
}
window["SharedObject"] = SharedObject;
SharedObject.prototype["get"] = SharedObject.prototype.get;
SharedObject.prototype["set"] = SharedObject.prototype.set;
SharedObject.prototype["bind"] = SharedObject.prototype.bind;
SharedObject.prototype["unbind"] = SharedObject.prototype.unbind;
