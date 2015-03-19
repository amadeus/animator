# Animator

A universal CSS animation class for controlling CSS animations, tweens and
springs on individual html elements.  Or something


## Demo

```
    npm install
    grunt serve
```

Checkout the file `tests/tests.js` to see how the API is used

There's also a stress test located at `tests/stress.html`.


## Current Features

* Keyframe Animation Support
* Various Tween Easing formulas
* Pausable
* Handles simultaneous synced animations
* Animations are queued automatically
* Automatic handles vendor prefixing
* Full CSS transforms support (does not provide a shim however)
* IE8+ compatibility
* No external libs required
* Individual keyframe and tween callback support
* Keyframe animation support akin to CSS animation API
* Utilizes requestAnimationFrame where possible
* Support for multi attribute CSS properties
* Simple tween API


## Planned Features

* Add spring physics API
