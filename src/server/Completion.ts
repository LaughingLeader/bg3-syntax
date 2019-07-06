import {
	ServerCapabilities,
	CompletionParams,
	CompletionItem,
	CompletionItemKind,
	Connection,
	TextDocuments,
	Range,
	CancellationToken
} 
from "vscode-languageserver";

import Server from "./Server";
import runSafeAsync from "./utils/runSafeAsync";

import Keywords from "./stats/Keywords";

export default class Completion {
	server:Server;
	connection: Connection;
	documents: TextDocuments;

	keywords: Keywords;

	constructor(server: Server) {

		const { connection, documents } = server;
		this.server = server;
		this.keywords = new Keywords(this.server);

	/*
		connection.onCompletion((params) =>
			runSafeAsync(() => this.handleCompletion(params),
				null,
				`Error while computing completions for ${params.textDocument.uri}`,
				token
			)
		);
	*/
		connection.onCompletion(async (params, token) => this.handleCompletion(params, token));
		connection.onCompletionResolve((params) => this.handleResolveCompletion(params));

		connection.console.log("Registered Completion service.");

		this.connection = connection;
		this.documents = documents;
	}

	async handleCompletion(params: CompletionParams, token:CancellationToken) : Promise<CompletionItem[]>{
		const result: Array<CompletionItem> = [];

		let doc = this.documents.get(params.textDocument.uri);
		let text = doc.getText(Range.create(params.position.line, 0, params.position.line, params.position.character));

		if (text.indexOf("SkillType") > -1){
			for(let type in this.keywords.skills.skilltypes) {
				result.push(this.keywords.skills.skilltypes[type]);
			}
		}
		
		const { connection } = this;

		connection.console.log('text: ' + text);
		connection.console.log('params.textDocument.uri: ' + params.textDocument.uri);
		connection.console.log('character: ' + params.position.character);
		connection.console.log('line: ' + params.position.line);
		connection.console.log('triggerCharacter: ' + params.context.triggerCharacter);

		return result;
	}

	handleResolveCompletion(item: CompletionItem): CompletionItem {
		const { connection } = this;
		connection.console.log("Auto-completion resolved?");

		return item;
	}
}