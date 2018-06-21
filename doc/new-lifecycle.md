new component lifecycle

```
const obj = new GameObject({components: [new A({a: 1}), new B()]});
```

### create(opts)

this will happen when you call `this.pearl.entities.add(obj)`. it does not have access to other components.

this should be relatively side effect free? i think? or maybe not, idk. undecided if it's okay to, like, create new objects here, or whatever

### init()

called before update() on the first frame of the object's life (so, the first frame after `this.pearl.entities.add()`). no options here.

### update(dt)
