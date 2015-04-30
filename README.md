# Animator

A tiny, standalone, universal high performance animation library for CSS.  The API is
mostly JSON and mimics the CSS Animation API.  Currently Animator supports
tweens, keyframed animations and springs.

### Basic Tween

A basic tween is quite simple.  You just need to provide an element, a duration
(currently all durations are in milliseconds) and a `to` state.  You can
optionally provide a `from` state.  If no `from` state is provided, Animator
will figure out the current state of the element.

```js
Animator.tweenElement('element-id', 300, {
    opacity: 0,
    transform: {
        translate3d: [0, '50%', 0]
    }
}, function(){
    console.log('This method will be fired at the end of the tween');
});
```

### Keyframe Animation Example

Animations must be created before they can be used.  Think of the API as a JSON
version of the CSS Animation API.  Once an animation is created, you can call it
for an element with a duration of your choice.

```js
// Creates the animation - each key must be digit like,
// and it represents a percentage of the animation.
// We named the animation 'pop', so it can be referenced later
Animator.createAnimation('pop', {
    '0': {
        backgroundColor: {
            rgba: [255,0,0,1]
        },
        transform: {
            scale: [0, 0],
        },
        _timing: 'ease-out'
    },
    '40': {
        backgroundColor: {
            rgba: [0,0,0,1]
        },
        transform: {
            scale: [1.07, 1.07],
        },
        _timing: 'ease-in-out',
        _onFrame: function(){
            console.log('This method will be fired at 40% of the way through the animation');
        }
    },
    '65': {
        transform: {
            scale: [0.98, 0.98],
        },
        _timing: 'ease-in-out'
    },
    '100': {
        transform: {
            scale: [1, 1],
        },
        _timing: 'ease-in-out'
    }
});

// We tell animator to fire the 'pop' animation we just defined
// with a duration of 1 second
Animator.animateElement('element-id', 'pop', 1000)
```


### Animation Queues

Whenever you call `Animator.tweenElement`, `Animator.animateElement`, or
`Animator.springElement`, the return object is a queue instance that can be
added to.  This queue can be used to add further animations that are chained
together.

```js
// This animation will start taking place immediately
var queue = Animator.tweenElement('element-id', 300, {
    opacity: 0,
    transform: {
        translate3d: [0, '50%', 0]
    }
}, function(){
    console.log('This method will be fired at the end of the tween');
});

// This will force the animation to wait 300ms after the animation above
queue.addDelay(300);

// This tween will take place after the 300ms delay above
queue.addTween('element-id', 300, {
    opacity: 1,
    transform: {
        translate3d: [0, '0%', 0]
    }
})
```

You can also create animation queue's manually, and queue up everthing and
choose when to kick things off.

You can also add delays to a queue, to allow pausing between animations.
Simply provide the duration and an optional callback to fire at the end of the
duration if you'd like.

```js
var queue = new Animator.Queue();

queue.addTween('element-id', 300, {
    height: 20
});

queue.addTween('element-id', 300, {
    opacity: 0
});

queue.addTween('element-id', 300, {
    opacity: 1,
    height: 300
});

// Starts the animation queue, can be called whenever
queue.start();
```

You can queue/chain tweens, animations, and springs.


### Spring Animation Example

Springs as animations don't actually have a clearly defined start and end.  You
must provide the spring with a referenced object that will be used as target
for the CSS properties to 'spring towards'.  It may help to take a look at
`tests/spring.js` to see an example implementation that goes beyond the scope
of this example.  By default, springs will 'end' once they have started moving
and have reached their target location within the accelleration threshold
provided.  If you add a `permanent: true` to the settings, then the spring will
never stop until you explicitly clear it.

```js
var target = {
    x: 0,
    y: 0
};

var queue = Animator.springElement('element-id', {
    stiffness: 80,
    friction: 15,
    threshold: 0.03,
    permanent: true,
    target: target,
    styles: {
        transform: {
            translate3d: ['{x}px', '{y}px', '0px']
        }
    }
});

// Since used permanent: true on our spring settings, the spring will never
// end. To stop the spring at a later time, do the following:
queue.clearCurrent();
```

When you create the spring for the first time, the styles get set to the
current `target` values.  When `coords.x` or `coords.y` change, the element
transform styles will 'spring towards' the target values.  You can customize
`.stiffness` and `.friction` for different spring effects.


### Scenes

The final piece of the puzzle in all this library are Scenes.  Like the name
implies, you can think of Scenes as complex sequences of animations.  Not only
can you create various parallel queues, you can even have Scenes build off of
each other to recursively call upon other scenes.  The API for scenes of course
is a bit more complicated, but is still representative of what you've used
previously.

You build Scenes in a very similar way to Animations.  First you define them in
their JSON format, and then you can run them or add them to queues as usual.

In their simplest form, Scenes are just Queues that you can make start at
specific time intervals.

```js
var scene = [
    // Each object represents both a queue, and an
    // execution time for that queue
    {
        // Start represents the time in milliseconds to start executing
        // the queue.  If the value is 0 or no value is set, the queue
        // will be kicked off immediately
        start: 0,

        // A queue is an array of object definitions -
        // these can include delays, animations, tweens,
        // springs and even other scenes that will execute
        // in order. Think of them as a JSON definition format
        // for the Animator.Queue API
        queue: [
            // This is a definition for a tween -
            // It is automatically detected because it
            // includes an element key and a to key
            {
                element: 'element-id',
                duration: 800,
                to: {
                    opacity: 0
                }
            },
            // This is the definition for a delay -
            // It has a duration key, but no element key
            {
                duration: 200,
                _finished: function(){
                    console.log('This will fire at the end of the delay');
                }
            },
            // This is the definition for an animation -
            // It has an element key and an animation key
            {
                element: 'another-element-id',
                animation: 'popin'
            }
        ]
    }, {
        // This particular queue will be kicked off after 200ms after
        // the scene has started running.
        start: 200,

        queue: [
            // This is the definition for a spring -
            // It has an element key and a spring key
            // For sake of brevity I have left it empty - it would
            // be identical to the settings passed in for a spring animation
            {
                element: 'element-id',
                spring: {}
            },
            // This is the defiition for a scene -
            // It just has a key for the scene id
            {
                scene: 'another-scene'
            }
        ]
    }
];

// With the JSON format designed for a Scene, it must be
// created as a scene: This first argument is the scene id,
// the second is the JSON definition from above
Animator.createScene('my-scene', scene);

// Once a scene is created, you can kick if off anytime
// Just use the spring id you specified on creation
Animator.runScene('my-scene');
```

Scenes can also be added an existing Queue using the `.addScene` API:

```js
// Instantiate a queue
var queue = new Animator.Queue();

// Add the scene to the queue
queue.addScene('my-scene');

// Start animating the queue
queue.start();
```


## Demo/Tests

These aren't like real unit test tests, just various pages documenting and
exemplifying various features.

```
npm install
grunt serve
```

Urls to check out with the grunt server running:

* `http://localhost:5000/tests/` - tween and animation API examples
* `http://localhost:5000/tests/spring.html` - spring example
* `http://localhost:5000/tests/stress.html` - tween stress test
* `http://localhost:5000/tests/scene.html` - scene examples


## Current Features

* Keyframe Animation Support
* Various Tween Easing formulas
* Pausable
* Simultaneous elements can be animated and synced
* Animations queued automatically
* Automatically handles vendor prefixing
* Full CSS transforms support
* IE8+ compatibility (not for transforms)
* No external libs required
* Individual keyframe and tween callback support
* Utilizes requestAnimationFrame where possible
* Support for multi attribute CSS properties
* Simple tween API
* Spring physics API
* Only rgb/rgba/hsl/hsla colors are tweenable
* No jQuery required!


## Potential Future Features

* Add support for colors OTHER than rgb/rgba/hsl/hsla.


## License

[MIT](http://en.wikipedia.org/wiki/MIT_License)
