# bun-bundle

A lightweight module bundler wrapping [Bun.build](https://bun.sh/docs/bundler)

Designed to bundle client-side code for the browser. Capable of:

-   Building multiple entrypoints (including a service worker)
-   Copying folders and files from the source directory to the output directory
-   Dynamically injecting `<script>` and `<link>` tags into an `index.html` file in the output folder for each of the .js and .css files in the build output
-   All the other native features of [Bun.build](https://bun.sh/docs/bundler)

To use, install the `bun-bundle` package, then import `BunBundle` and call its `build` function with the desired config options.

```
bun add -D bun-bundle
```

## Example Usage

```typescript
import { BunBundle, BunBundleBuildConfig, BunBundleBuildOutput } from "bun-bundle";

const IS_PROD = Bun.env.BUN_ENV === "true";

const buildConfig: BunBundleBuildConfig = {
	root: "./src/client",
	outdir: "./public",
	entrypoints: ["main.tsx"],
	swEntrypoint: "sw.ts",
	jsStringTemplate: "<!-- {js} -->",
	cssStringTemplate: "<!-- {css} -->",
	copyFolders: ["assets"],
	copyFiles: ["browserconfig.xml", "favicon.ico", "index.html", "manifest.json"],
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

(required) The path of the source directory to build from, relative to the project root.

### `outdir`

(required) The path of the output directory to build to, relative to the project root.

### `entrypoints`

(required) An array of strings representing the paths main entrypoint(s) of the build process. Each file must be of type `.js`, `.ts`, `.jsx`, or `.tsx`, and its path must be relative to the `root`.

### `swEntrypoint`

(optional) The file name of the service worker entrypoint (.js, .ts). If specified, its path must be relative to the `root`. This service worker entrypoint is deliberately separate from the main entrypoints to allow for a simpler build process - the only options passed into the service worker build are the `root`, `outdir`, and `minify`.

### `jsStringTemplate`

(optional) The string template to be used in the `index.html` file to be replaced inline by the `<script>` tags for the JS build output files. Default is `<!-- {js} -->` if unspecified.

### `cssStringTemplate`

(optional) The string template to be used in the `index.html` file to be replaced inline by the `<link>` tags for the CSS build output files. Default is `<!-- {css} -->` if unspecified.

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
