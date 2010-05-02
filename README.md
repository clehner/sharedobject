SharedObject
============

A SharedObject instance has a set of key-value pairs that can be accessed or updated per key. Listeners functions can be bound to particular keys on the object or to all keys.

Example:

    var obj = new SharedObject();
    obj.bind("key", function (value, prevValue) {
        // value == "value"
        // prevValue == null 
    });
    
    // this will cause the above listener to fire
    obj.set("key", "value");

To learn more, read the test suite, or the source, or wavy.js.

Methods
-------
- set(key, value, context)
- get(key)
- bind(key, function(value, prevValue), context)
- bind({key1: function(v, pV), key2: function(v, pV)}, context)
- bind(function(key, value, prevValue), context)
- bindOnce(key, function, context)
- unbind((same arguments as bind])

Wavy
====

wavy.js provides a useful interface to the shared state of a Google Wave gadget using SharedObjects. It is mostly a wrapper of the regular [Wave Gadgets API](http://code.google.com/apis/wave/extensions/gadgets/reference.html).

The only global variable created is wavy, a SharedObject. When the wave is loaded, wavy is populated with properties about the wave, its states, and participants. All of these can be listened for with the bind() method.

Properties
----------

- state: SharedObject

    Example:

        wavy.bind("state", function (state) {
            // got state object
            state.set("hello", "world");
        });

- private_state: SharedObject

    Works the same as the state property

- mode: one of these: "view", "edit", "playback", "diff\_on_open", "unknown"

    Example:
        
        wavy.bind("mode", function (mode) {
            // now you can deal with mode changes in CSS.
            document.body.className = mode;
        });

- wave_id: string. The wave ID.
- viewer: SharedObject representing the participant whose client renders the gadget.
- host: SharedObject. The host of the wave.

        wavy.bindOnce("viewer", function (viewer) {
            wavy.bindOnce("host", function (host) {
                if (viewer == host) {
                    alert("You own this wave!");
                }
            });
        });

- participants: SharedObject

        wavy.bindOnce("participants", function (participants) {
            participants.bind(function (key, participant) {
                if (participant) {
                    // we have a new participant 
                } else {
                    // a participant left.
                }
            });
        });

Participant objects
------------

Wave participants are represented by SharedObjects.
The value of wavy keys "host" and "viewer", and all the values of the participants
object, are participant objects. They have the following properties:

- id: the participant's wave address
- displayName
- thumbnailUrl

        participant.bind({
            id: function (id) { ... },
            displayName: function (name) { ... },
            thumbnailUrl: function (url) { ... }
        });


Buffering
-----------------
Normally, every time a property is changed of the state or private state, a state delta is submitted to the wave server, and is recorded as an entry in the wave's playback history. Sometimes, though, you want a series of state changes to be recorded as one delta. Buffering lets you do this.

When buffering is on, state property changes are not sent out immediately, but are added to a buffered delta, which is submitted when the buffer is released.

- wavy.startBuffer() Starts buffering.
- wavy.endBuffer() Ends buffering, and sends it.
- wavy.flushBuffer() Ends the buffer and then starts a new one.
- wavy.buffer(fn, context) Buffers while applying the given function.

Buffers can be nested. The delta is not submitted until all the buffers are ended.