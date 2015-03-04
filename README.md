# Animator

A universal CSS animation class for controlling CSS animations, tweens and
springs on individual html elements.  Or something


## Demo

```
    npm install
    grunt serve
```

Checkout the file `tests/tests.js` to see how the API is used


## Current Features

* Keyframe Animation Support
* Various Tween Easing formulas
* Pausable
* Handles simultaneous synced animations
* Animations are queued automatically
* Automatic vendor prefixing support
* Full CSS transforms support (does not shim browser that don't support it)
* IE8+ compatibility
* No external libs required
* Individual keyframe callback support
* Keyframe animation support akin to CSS animation API
* Utilizes requestAnimationFrame where possible


## Planned Features

* Fix support for multi-attribute css properties that are not transforms
* Add simple tween API
* Add spring physics API
