# pearl devtools ideas

## prefabs, components, and customizing values

obviously the biggest thing you want from devtools is being able to customize the values of fields on components. you want to be able to not just update these while the game is running, but also before the game has started, or basically the values things get initialized to.

with the way initialization works in pearl right now, this is tricky! it's fairly easy to expose every field on a component and let you customize it, of course. it's much harder to set up the values of components before they're instantiated.

there's a few potential ways to handle this. i think no matter what's used, part is that prefabs need to become a first-class entity within pearl. this way, prefabs can be listed in the dev tools.

from that, figuring out how to set initial values on each component in a prefab is more complicated. currently, this happens in `createComponents()`, with the instantiating code then updating things after creation.

this also exposes another tricky lifecycle thing. so currently networked prefabs are created _and added to the world_ when a prefab is instantiated, meaning that each component's `create()` is called with default settings, or at best with settings that get passed inside `createComponents()`. this _sorta_ works - you can, e.g. create a prefab with a Physical component, then update `Physical.center.x` in the code that instantitates it. it gets trickier, though, if a component were to have logic in the `create()` step that cached values or something based on initial settings. so far i've just... tried avoiding this, and that's gone ok, but it's a worrying thing. 

anyways all that said: so maybe the devtools would create an instance of each prefab, but not add it, and then iterate over the default fields in each component and display them as things that could be changed. changes would get registered... somehow... and then applied to each created prefab, either before or after instantiation. this registry could even be stored locally in the browser and persisted, though saving it back would be weird and complicated.