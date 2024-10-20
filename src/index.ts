import copy from "bun-copy-plugin";
import { minify as Minify } from "minify";
import path from "path";
import { rimrafSync } from "rimraf";

import type { BuildConfig, BuildOutput } from "bun";

export const BunBundle = {
	build: async ({
		srcDir,
		outDir,
		mainEntry,
		swEntry,
		jsStringTemplate = "{js}",
		cssStringTemplate = "{css}",
		copyFolders = [],
		copyFiles = [],
		sourcemap,
		minify,
		naming,
		plugins = [],
		isProd,
		suppressLog,
		...rest
	}: BunBundleBuildConfig) => {
		try {
			const start = Date.now();

			const parseArg = (arg: string) => Bun.argv.find(a => a.startsWith(arg))?.split("=")[1];

			const BUN_ENV = parseArg("BUN_ENV") ?? parseArg("NODE_ENV");
			const IS_PROD =
				isProd ??
				(BUN_ENV === "production" || Bun.env.BUN_ENV === "production" || Bun.env.NODE_ENV === "production");

			// clear output folder
			rimrafSync(outDir);

			const buildCommon = {
				root: srcDir,
				outdir: outDir,
				sourcemap: sourcemap ?? (IS_PROD ? "none" : "inline"),
				minify: minify ?? IS_PROD
			} as Partial<BuildConfig>;

			const buildMain = Bun.build({
				...rest,
				...buildCommon,
				entrypoints: [path.join(srcDir, mainEntry)],
				naming: naming ?? {
					entry: "[name]~[hash].[ext]",
					asset: "[dir]/[name].[ext]"
				},
				plugins: [
					...copyFolders.map(folder =>
						copy(`${path.join(srcDir, folder)}/`, `${path.join(outDir, folder)}/`)
					),
					...copyFiles.map(file => copy(path.join(srcDir, file), path.join(outDir, file))),
					...plugins
				]
			});

			const buildSw = swEntry
				? Bun.build({
						...buildCommon,
						entrypoints: [path.join(srcDir, swEntry)]
					})
				: null;

			// await build results
			const results = await Promise.all([buildMain, ...(buildSw ? [buildSw] : [])]);

			// check for errors
			for (const result of results) {
				if (!result.success) throw result.logs;
			}

			// find filenames of .js file and .css file in output
			const { outputs } = results[0];
			const jsFile = outputs.find(output => output.path.endsWith(".js"));
			if (!jsFile) throw "No .js file found in build output";
			const jsFileName = path.parse(jsFile.path).base;
			const cssFile = outputs.find(output => output.path.endsWith(".css"));
			if (!cssFile) throw "No .css file found in build output";
			const cssFileName = path.parse(cssFile.path).base;
			const indexHtmlPath = path.join(outDir, "index.html");

			// inject .js and .css filenames into index.html
			const indexHtmlContents = (await Bun.file(indexHtmlPath).text())
				.replace(jsStringTemplate, `./${jsFileName}`)
				.replace(cssStringTemplate, `./${cssFileName}`);

			await Promise.all([
				Bun.write(indexHtmlPath, indexHtmlContents),
				Bun.write(path.join(outDir, jsFileName), Bun.file(jsFile.path))
			]);

			if (minify ?? IS_PROD) {
				// minify html and css files in production
				const [minifiedHtml, minifiedCss] = await Promise.all([Minify(indexHtmlPath), Minify(cssFile.path)]);
				await Promise.all([Bun.write(indexHtmlPath, minifiedHtml), Bun.write(cssFile.path, minifiedCss)]);
			}

			const buildTime = Date.now() - start;

			if (!suppressLog)
				console.log(`Build completed in ${IS_PROD ? "production" : "development"} mode (${buildTime}ms)`);

			const buildOutput: BunBundleBuildOutput = {
				isProd: IS_PROD,
				results,
				buildTime
			};

			return buildOutput;
		} catch (error) {
			throw new AggregateError(error instanceof Array ? error : [error]);
		}
	}
};

export type BunBundleBuildConfig = {
	srcDir: string;
	outDir: string;
	mainEntry: string;
	swEntry?: string;
	jsStringTemplate?: string;
	cssStringTemplate?: string;
	copyFolders?: string[];
	copyFiles?: string[];
	isProd?: boolean;
	suppressLog?: boolean;
} & Partial<BuildConfig>;

export type BunBundleBuildOutput = {
	isProd: boolean;
	results: BuildOutput[];
	buildTime: number;
};
