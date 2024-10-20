# bun-bundle

A lightweight module bundler wrapping [Bun.build](https://bun.sh/docs/bundler)

To use, install the `bun-bundle` package, then import `BunBundle` and call its `build` function with the desired config options.

```
bun add -D bun-bundle
```

## Example Usage

```typescript
import { BunBundle, BunBundleBuildConfig, BunBundleBuildOutput } from "bun-bundle";

const buildConfig: BunBundleBuildConfig = {
	srcDir: "./src/client",
	outDir: "./public",
	mainEntry: "main.tsx",
	swEntry: "sw.ts",
	jsStringTemplate: "{js}",
	cssStringTemplate: "{css}",
	copyFolders: ["assets"],
	copyFiles: ["browserconfig.xml", "favicon.ico", "index.html", "manifest.json"],
	sourcemap: "inline",
	minify: true,
	naming: {
		entry: `"./src/client/[dir]/[name]~[hash].[ext]`,
		asset: "[dir]/[name].[ext]"
	},
	define: {
		"Bun.env.IS_PROD": `"true"`
	},
	plugins: [],
	isProd: true,
	suppressLog: false
};

const buildOutput: BunBundleBuildOutput = await BunBundle.build(buildConfig);

const { isSuccess, isProd, results, buildTime } = buildOutput;
```

## Assumptions

-   The build process will be run on the [bun](https://bun.sh) runtime.
-   The `srcDir` contains a single `mainEntry` file (.js, .jsx, .ts, .tsx) that is the main client-side entrypoint.
-   The `mainEntry` file imports other files that are part of the build process, including a single CSS file.
-   The `srcDir` contains an `index.html` file with a `<script>` tag with a `src` attribute that will be replaced at build-time by the name of the JS build output file via the `jsStringTemplate` option, as well as a `<link>` tag with an `href` attribute that will be replaced at build-time by the name of the CSS build output file via the `cssStringTemplate` option. For example:

```html
<script type="text/javascript" src="{js}" defer></script>
<link rel="stylesheet" href="{css}" />
```

## Build Config Options

### `srcDir`

(required) The path of the source directory to build from, relative to the project root.

### `outDir`

(required) The path of the output directory to build to, relative to the project root.

### `mainEntry`

(required) The file name of the main client-side entrypoint (.js, .jsx, .ts, .tsx). Must be located in the top level of the `srcDir`.

### `swEntry`

(optional) The file name of the service worker entrypoint (.js, .ts). If specified, must be located in the top level of the `srcDir`.

### `jsStringTemplate`

(optional) The string template to be used in the `index.html` file to be replaced by the name of the JS build output file. Default is `{js}` if unspecified.

### `cssStringTemplate`

(optional) The string template to be used in the `index.html` file to be replaced by the name of the CSS build output file. Default is `{css}` if unspecified.

### `copyFolders`

(optional) An array of folder names to copy recursively from the `srcDir` to the `outDir`.

### `copyFiles`

(optional) An array of file names to copy from the `srcDir` to the `outDir`. Each file must be in the top level of the `srcDir`.

### `sourcemap`

(optional) The Bun.build [sourcemap](https://bun.sh/docs/bundler#sourcemap) option. If unspecified, defaults to `"none"` in production mode and `"inline"` in development mode.

### `minify`

(optional) The Bun.build [minify](https://bun.sh/docs/bundler#minify) option. If unspecified, defaults to `true` in production mode and `false` in development mode.

### `naming`

(optional) The Bun.build [naming](https://bun.sh/docs/bundler#naming) option. If unspecified, defaults to:

```typescript
{
	entry: `${isProd ? `${srcDir}/[dir]/` : ""}[name]~[hash].[ext]`,
	asset: "[dir]/[name].[ext]"
}
```

### `plugins`

(optional) An array of Bun.build [plugins](https://bun.sh/docs/bundler#plugins) to use. By default, only the [bun-copy-plugin](https://github.com/jadujoel/bun-copy-plugin) will be used to copy the folders and files specified via the `copyFolders` and `copyFiles` options.

### `isProd`

(optional) A boolean used to explicitly set the build mode (production or development). If unspecified, the build process will use production mode if it detects a `BUN_ENV=production` or `NODE_ENV=production` command line argument or environment variable. Otherwise, it will use development mode.

### `suppressLog`

(optional) A boolean used to suppress the log output of the build process. If unspecified, defaults to `false`.

## Additional Build Config Options

The `BunBundle.build` function accepts any of the [native Bun.build config options](https://bun.sh/docs/bundler#api). The native options explicitly listed above are given opinionated default values. Any native option not listed above will simply be passed through to the `Bun.build` function with its normal default value.

## Build Output Fields

### `isProd`

A boolean indicating whether the build process was run in production or development mode.

### `results`

An object containing the Bun.build [outputs](https://bun.sh/docs/bundler#outputs).

### `buildTime`

A number indicating the amount of time in milliseconds the build process took to complete.
