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

Animator.springElement('element-id', {
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
```

When you create the spring for the first time, the styles get set to the
current `target` values.  When `coords.x` or `coords.y` change, the element
transform styles will 'spring towards' the target values.  You can customize
`.stiffness` and `.friction` for different spring effects.


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
