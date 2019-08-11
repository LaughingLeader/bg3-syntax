import { EventEmitter } from "events";
import { join } from "path";


import { ExtensionContext, OutputChannel, window, workspace } from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	TransportKind,
	ServerOptions
} from "vscode-languageclient";
	
export default class Client extends EventEmitter {
	clientId = "divinity-stats-language-server";
	clientName = "Divinity Stats Language";
	connection: LanguageClient | null;
	connectCallbacks: Array<Function> = [];
	context: ExtensionContext;
	isReady: boolean = false;
	languages: Array<string> = ["divinitystats"];
	outputChannel: OutputChannel;

	constructor(context: ExtensionContext) {
	super();

		this.context = context;
		this.outputChannel = window.createOutputChannel(this.clientName);
		this.connection = this.createConnection();

		console.log("Client log test");
		//let filter:DocumentFilter = { scheme: 'file', language: 'divinity-stats' };
	}

	private createConnection() {
	const { context, languages, outputChannel } = this;
	const module = context.asAbsolutePath(join("bin", "server", "index.js"));

	let serverOptions: ServerOptions = {
		run: {
		module,
		transport: TransportKind.ipc
		},
		debug: {
		module,
		transport: TransportKind.ipc,
		options: { execArgv: ["--nolazy", "--inspect=6009"] }
		}
	};

	let clientOptions: LanguageClientOptions = {
		documentSelector: [
		...languages.map(language => ({
			scheme: "file",
			language
		})),
		{
			scheme: "divinity-stats"
		}
		],
		outputChannel,
		outputChannelName: "Divinity Stats Language"
	};

	const client = new LanguageClient(
		this.clientId,
		this.clientName,
		serverOptions,
		clientOptions
	);

	client.start();
	client.onReady().then(() => {
		client.onNotification("divinity-stats/showerror", message => {
		window.showErrorMessage(message);
		});

		for (const callback of this.connectCallbacks) {
			callback(client);
		}
		});

		return client;
	}

	dispose(): Thenable<void> {
		const { connection } = this;
		this.connection = null;
		return;
	}

	async getConnection(): Promise<LanguageClient> {
		if (this.connection && this.isReady) {
			return this.connection;
		} else {
			return new Promise<LanguageClient>(resolve => {
			this.connectCallbacks.push(resolve);
			});
		}
	}
}
