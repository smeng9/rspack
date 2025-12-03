import binding from "@rspack/binding";

import { createBuiltinPlugin, RspackBuiltinPlugin } from "./base";
import { createCompiler } from "../rspack";
import rspack, { Compiler, ReactClientPlugin, RspackOptions } from "..";
import path from "path";

// function getClientHotEntry() {
// 	return require.resolve("@rspack/core/hot/poll?100");
// }

export class ReactServerPlugin extends RspackBuiltinPlugin {
	name = "ReactServerPlugin";
	clientCompilerOptions: RspackOptions;
	logger: any; // TODO: 类型信息

	constructor(clientCompilerOptions: RspackOptions = {}) {
		super();
		this.clientCompilerOptions = clientCompilerOptions;
	}

	#resolve(serverCompiler: Compiler) {
		if (!this.clientCompilerOptions.output) {
			this.clientCompilerOptions.output = {};
		}
		if (!this.clientCompilerOptions.output.path) {
			this.clientCompilerOptions.output.path = path.join(
				serverCompiler.context,
				serverCompiler.outputPath,
				"dist/client"
			);
		}
		if (!this.clientCompilerOptions.plugins) {
			this.clientCompilerOptions.plugins = [];
		}
		this.clientCompilerOptions.plugins.push(
			new ReactClientPlugin(serverCompiler)
		);

		const clientCompiler = createCompiler(this.clientCompilerOptions);

		if (serverCompiler.watchMode) {
		}

		return {
			// 如果 server compiler 是 watch 模式，则 client compiler 也启用 watch 模式
			// server compiler 还需要给 client compiler 启用 HMR server。
			// 所以我们可能需要新增 @rspack/rsc-plugin，这个插件会依赖 rspack-dev-server 来启动 HMR server
			compile() {
				console.log("client compiler 开始构建");

				return new Promise((resolve, reject) => {
					clientCompiler.run((error, compilation) => {
						console.log("client compiler 构建完成", error);
						if (error) {
							return reject(error);
						}
						resolve(undefined);
					});
				});
			}
		};
	}

	applyHMRPluginIfAbsent(compiler: Compiler) {
		const HMRPluginExists = compiler.options.plugins.find(
			plugin =>
				plugin && plugin.constructor === rspack.HotModuleReplacementPlugin
		);

		if (HMRPluginExists) {
			this.logger.warn(
				'"hot: true" automatically applies HMR plugin, you don\'t have to add it manually to your Rspack configuration.'
			);
		} else {
			// Apply the HMR plugin
			const plugin = new rspack.HotModuleReplacementPlugin();
			plugin.apply(compiler);
		}
	}

	raw(compiler: Compiler): binding.BuiltinPlugin {
		this.logger = compiler.getInfrastructureLogger("RSCPlugin");

		// new rspack.EntryPlugin(compiler.context, getClientHotEntry(), {
		// 	name: undefined
		// }).apply(compiler);

		// this.applyHMRPluginIfAbsent(compiler);

		const bindingOptions = this.#resolve(compiler);
		return createBuiltinPlugin(this.name, bindingOptions);
	}
}
