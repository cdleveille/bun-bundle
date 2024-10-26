# bun-bundle

A lightweight module bundler wrapping [Bun.build](https://bun.sh/docs/bundler)

Designed to bundle client-side code for the browser. Capable of:

-   Building multiple entrypoints (including a service worker)
-   Copying folders and files from the source directory to the output directory
-   All the other native features of [Bun.build](https://bun.sh/docs/bundler)

To use, install the `bun-bundle` package, then import `BunBundle` and call its `build` function with the desired config options.

```
bun add -D bun-bundle
```

To see an example of bun-bundle in action, check out the [fullstack-bun](https://github.com/cdleveille/fullstack-bun) project template.

## New in version 4.0.0

You can now specify an HTML file as an entrypoint. The build process will also build any scripts it references (including `.jsx`, `.ts`, and `.tsx` files), and will rename them inline to match their respective build output filenames. Any CSS files it references will also be copied to the output directory.

## Example Usage

```typescript
import { BunBundle, BunBundleBuildConfig, BunBundleBuildOutput } from "bun-bundle";

const IS_PROD = process.env.NODE_ENV === "production";

const buildConfig: BunBundleBuildConfig = {
	root: "./src/client",
	outdir: "./public",
	entrypoints: ["index.html"],
	swEntrypoint: "sw.ts",
	copyFolders: ["assets"],
	copyFiles: ["browserconfig.xml", "favicon.ico", "manifest.json"],
	define: { "Bun.env.IS_PROD": `"${IS_PROD}"` },
	sourcemap: IS_PROD ? "none" : "linked",
	naming: {
		entry: "[dir]/[name]~[hash].[ext]",
		asset: "[dir]/[name]~[hash].[ext]"
	},
	minify: IS_PROD,
	suppressLog: true
};

const { results, buildTime }: BunBundleBuildOutput = await BunBundle.build(buildConfig);

console.log(`Build completed in ${IS_PROD ? "production" : "development"} mode in ${output.buildTime}ms`);
console.log("Build results:\n", results);
```

## Build Config Options

### `root`

(required) The path of the source directory to build from, relative to the project root. This is typically where your client-side source code lives.

### `outdir`

(required) The path of the output directory to build to, relative to the project root. This is typically a public directory that will be served by your web server.

### `entrypoints`

(required) An array of strings representing the paths main entrypoint(s) of the build process. Each file must be of type `.html`, `.js`, `.ts`, `.jsx`, or `.tsx`, and its path must be relative to the `root`.

If an HTML file is specified, the build process will also build any scripts it references (including `.jsx`, `.ts`, and `.tsx` files), and will rename them inline to match their respective build output filenames. Any CSS files it references will also be copied to the `outdir`.

For example, a script tag with a `src` like this:

```html
<script type="text/javascript" src="./main.tsx" defer></script>
```

...will be automatically renamed in the `outdir` to match the build output filename:

```html
<script type="text/javascript" src="./main~4rvgxggr.js" defer></script>
```

### `swEntrypoint`

(optional) The file name of the service worker entrypoint (.js, .ts). If specified, its path must be relative to the `root`. This service worker entrypoint is deliberately separate from the main entrypoints to allow for a simpler build process - the only options passed into the service worker build are the `root`, `outdir`, and `minify`.

### `copyFolders`

(optional) An array of folder names to copy recursively from the `root` to the `outdir`.

### `copyFiles`

(optional) An array of file names to copy from the `root` to the `outdir`.

### `plugins`

(optional) An array of Bun.build [plugins](https://bun.sh/docs/bundler#plugins) to use. By default, only the [bun-copy-plugin](https://github.com/jadujoel/bun-copy-plugin) will be used to copy the folders and files specified via the `copyFolders` and `copyFiles` options.

### `suppressLog`

(optional) A boolean used to suppress the log output of the build process. If unspecified, defaults to `false`.

### `clearOutdir`

(optional) A boolean used to clear the output directory at the start of the build. If unspecified, defaults to `true`.

## Additional Build Config Options

The `BunBundle.build` function accepts any of the [native Bun.build config options](https://bun.sh/docs/bundler#api). The select native options listed above are explicitly mentioned either because they are required, or because they are optional but are given special default values. Any native option that is not listed above will simply be passed through to the `Bun.build` function with its normal native default value.

## Build Output Fields

### `results`

An object containing the Bun.build [outputs](https://bun.sh/docs/bundler#outputs).

### `buildTime`

A number indicating the amount of time in milliseconds the build process took to complete.
