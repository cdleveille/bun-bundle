import type { BuildConfig, BuildOutput } from "bun";
import copy from "bun-copy-plugin";
import * as cheerio from "cheerio";
import path from "path";
import { rimrafSync } from "rimraf";

export const BunBundle = {
	build: async ({
		root,
		outdir,
		entrypoints,
		swEntrypoint,
		copyFolders = [],
		copyFiles = [],
		minify,
		plugins = [],
		suppressLog = false,
		clearOutdir = true,
		...rest
	}: BunBundleBuildConfig) => {
		try {
			const start = now();

			if (clearOutdir) rimrafSync(path.resolve(outdir));

			// check for .html entrypoints
			const htmlEntrypoints = entrypoints.filter(entry => path.extname(entry) === ".html");

			// for each .html entrypoint, get the file contents and find the script/link tags
			const processHtmlEntryPoint = async (htmlEntry: string) => {
				const htmlFile = Bun.file(path.join(root, htmlEntry));
				const htmlContent = await htmlFile.text();
				const scriptFiles = getTagAttributes({ htmlContent, tag: "script", attr: "src" }).filter(isLocalFile);
				const cssFiles = getTagAttributes({
					htmlContent,
					tag: "link",
					attr: "href",
					rel: "stylesheet"
				}).filter(isLocalFile);

				// add scripts as entrypoints to be built
				entrypoints.push(...scriptFiles);

				// add html file and css files to be copied to outdir
				copyFiles.push(...[htmlEntry, ...cssFiles]);

				return { htmlEntry, files: scriptFiles };
			};

			const htmlOutputs = await Promise.all(htmlEntrypoints.map(processHtmlEntryPoint));

			const sharedConfig = {
				root: path.resolve(root),
				outdir: path.resolve(outdir),
				minify
			} as Partial<BuildConfig>;

			const entrypointsToBuild = Array.from(
				new Set(
					entrypoints
						.filter(entry => SCRIPT_FILES.includes(path.extname(entry)))
						.map(entry => path.join(root, entry))
				)
			);

			const buildMain = Bun.build({
				...rest,
				...sharedConfig,
				entrypoints: entrypointsToBuild,
				plugins: [
					...plugins,
					...copyFolders.map(folder => copy(`${path.join(root, folder)}/`, `${path.join(outdir, folder)}/`)),
					...copyFiles.map(file => copy(path.join(root, file), path.join(outdir, file)))
				]
			});

			// await build results
			const results = swEntrypoint
				? await Promise.all([
						buildMain,
						Bun.build({
							...sharedConfig,
							entrypoints: [path.join(root, swEntrypoint)]
						})
					])
				: await Promise.all([buildMain]);

			// check for errors
			for (const result of results) {
				if (!result.success) throw result.logs;
			}

			const { outputs } = results[0];

			const buildOutputsParsed = outputs
				.filter(output => output.kind === "entry-point")
				.map(output => path.parse(output.path));

			// for each .html entrypoint, inject the build output filenames into the script tags
			const processHtmlOutput = async ({ htmlEntry, files }: { htmlEntry: string; files: string[] }) => {
				for (const scriptFile of files) {
					const scriptFileParsed = path.parse(path.join(path.resolve(outdir), scriptFile));

					const buildScriptFile = buildOutputsParsed.find(buildOutput => {
						if (
							buildOutput.dir === scriptFileParsed.dir &&
							buildOutput.name.startsWith(scriptFileParsed.name) &&
							buildOutput.ext !== ".map"
						)
							return true;
						return false;
					});
					if (!buildScriptFile) throw `Could not find corresponding build output file for ${scriptFile}`;

					const htmlFilePath = path.join(outdir, htmlEntry);
					const htmlFile = Bun.file(htmlFilePath);
					const htmlContent = await htmlFile.text();

					const newHtml = replaceTagAttrValue(
						htmlContent,
						"script",
						"src",
						scriptFile,
						`./${path.join(path.parse(scriptFile).dir, buildScriptFile.base)}`.replace(/\\/g, "/")
					);
					await Bun.write(htmlFilePath, newHtml);
				}
			};

			await Promise.all(htmlOutputs.map(processHtmlOutput));

			const buildTime = parseFloat((now() - start).toFixed(2));

			if (!suppressLog) console.log(`Build completed in ${buildTime}ms`);

			const buildOutput: BunBundleBuildOutput = {
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
	root: string;
	outdir: string;
	entrypoints: string[];
	swEntrypoint?: string;
	copyFolders?: string[];
	copyFiles?: string[];
	suppressLog?: boolean;
	clearOutdir?: boolean;
} & Partial<BuildConfig>;

export type BunBundleBuildOutput = {
	results: BuildOutput[];
	buildTime: number;
};

const now = () => performance?.now?.() ?? Date.now();

const getTagAttributes = ({
	htmlContent,
	tag,
	attr,
	rel
}: {
	htmlContent: string;
	tag: string;
	attr: string;
	rel?: string;
}) => {
	const $ = cheerio.load(htmlContent);
	const srcAttributes: string[] = [];

	$(`${tag}${rel ? `[rel='${rel}']` : ""}[${attr}]`).each((_, element) => {
		const src = $(element).attr(`${attr}`);
		if (src) {
			srcAttributes.push(src);
		}
	});

	return srcAttributes;
};

const replaceTagAttrValue = (
	htmlContent: string,
	tag: string,
	attr: string,
	currentValue: string,
	newValue: string
) => {
	const $ = cheerio.load(htmlContent);
	$(`${tag}[${attr}='${currentValue}']`).attr(`${attr}`, newValue);
	return $.html();
};

const SCRIPT_FILES = [".js", ".jsx", ".ts", ".tsx"];

const isRemoteUrl = (href: string) => {
	try {
		const url = new URL(href);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

const isLocalFile = (file: string) => !path.isAbsolute(file) && !isRemoteUrl(file);
