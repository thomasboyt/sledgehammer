deploy plans v1:

- push built static app to surge
- run lobby server on digital ocean (ts-node, just git pull to deploy)
  - need to update nginx routing
- need to have lobby server configured to allow CORS from static site
- need to have static app configured to point to DO lobby server