//http://docs.jquery.com/QUnit
//http://www.ibm.com/developerworks/library/j-test.html
//http://en.wikipedia.org/wiki/Unit_testing

module("SharedObject");

test("getting and setting", function() {
	var obj = new SharedObject();
	
	obj.set("key2", "value2");
	equals(obj.get("key2"), "value2", "String values can be get and set by key");
	
	var value = {lkjzxhcvzuic:5};
	obj.set("the key", value);
	equals(obj.get("the key"), value, "Object values can be get and set by key");
	
	obj.set({"a": "b"});
	equals(obj.get("a"), "b", "Values can be set by group");
	
	var context = {};
	obj.set("c", "d", context);
	equals(obj.get("c"), "d", "Values can be set with a context");
});

//module("Module A");

test("key handlers", 7, function() {
	var obj = new SharedObject();
	var context = {lsdjfalsjdfk:5};
	obj.bind("k", function (value, prevValue) {
		ok(true, "key handler fires after value is set");
		equals(prevValue, null, "First key handler has prevValue null");
		equals(value, "v", "new value is correct");
		equals(this, context, "key handler fires with context");
	}, context);
	obj.set("k", "v");
	obj.set("a", "b");
	obj.bind("a", function (value, prevValue) {
		ok(true, "Key handlers fire when attached after the value is set");
		equals(value,  "b", "value");
		equals(prevValue, null, "prevValue is null for a retroactive handler");
	});
});

test("multiple key handlers per key", 3, function() {
	var obj = new SharedObject();
	obj.bind("k", function (value) {
		ok(true, "first handler fired");
	});
	obj.bind("k", function (value) {
		ok(true, "second handler fired");
	});
	obj.bind("k", function (value) {
		ok(true, "third handler fired");
	});
	obj.bind("b", function (value) {
		ok(false, "handler fired for the wrong key");
	});
	obj.set("k", "v");
});

test("catchall handler fires after set", 2, function() {
	var obj = new SharedObject();
	obj.bind(function (key, value) {
		equals(key, "c", "key");
		equals(value, "d", "value");
	});
	obj.set("c", "d");
});

test("catchall handler fires retroactively", 2, function() {
	var obj = new SharedObject();
	obj.set("a", "b");
	obj.bind(function (key, value) {
		equals(key, "a", "key");
		equals(value, "b", "value");
	});
});

test("handlers can be removed", 0, function() {
	var obj = new SharedObject();
	function catchallHandler(key, value) {
		ok(false, "catchall handler fired after being removed");
	}
	function keyHandler(value) {
		ok(false, "key handler fired after being removed");
	}
	obj.bind(catchallHandler);
	obj.bind("a", keyHandler);
	obj.unbind(catchallHandler);
	obj.unbind("a", keyHandler);
	obj.set("a", "b");
});

test("handlers with a context do not fire when a value is set from that context.", 1, function() {
	var obj = new SharedObject();
	var context = {};
	obj.bind("a", function keyHandler(value) {
		ok(false, "handler fired from a value set from its own context");
	}, context);
	obj.bind("a", function keyHandler(value) {
		ok(true, "handler with a different context fired when a value was set with a context.");
	}, {});
	obj.set("a", "b", context);
});

test("bindOnce fires handler exactly once", 1, function() {
	var obj = new SharedObject();
	obj.bindOnce("a", function keyHandler(value) {
		equals(value, "b", "bindOnce handler fired");
	});
	obj.set("a", "b");
	obj.set("a", null);
});

/*test("garbage collection", function() {
	var obj = new SharedObject();
	var obj2 = new SharedObject();
	obj.set("ref", obj2);
	obj2.set("key", "value");
	obj.set("ref", null);
	ok(obj2.get("key") == null, "unreachable objects are destroyed");
});*/

/* todo: add tests for:
valueof
getobject
out
set(sharedobject)
bindobj
*/
