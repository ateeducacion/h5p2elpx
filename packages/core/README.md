# `@ateeducacion/h5p2elpx-core`

Browser-safe library that converts H5P (and ADC) content into eXeLearning
`.elpx` packages entirely in memory.

```ts
import { importH5pAsElpx } from "@ateeducacion/h5p2elpx-core";

const { elpx, report } = await importH5pAsElpx(await file.arrayBuffer(), {
  filename: file.name,
  templateElpx // required: host-supplied eXeLearning template bytes
});
```

See the monorepo docs:

- [Library API](../../docs/library-api.md)
- [Root README](../../README.md)

## Build

```bash
bun run build   # tsc → dist/ + declaration import rewrite
```
