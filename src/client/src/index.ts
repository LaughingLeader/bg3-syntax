import { ExtensionContext } from "vscode";

import Client from "./Client";

import * as vscode from "vscode";
import foldingProvider from "./Folding";

let instance: Client | null = null;

export function activate(context: ExtensionContext) {
	if (!instance) {
		instance = new Client(context);
		//context.subscriptions.push(vscode.languages.registerFoldingRangeProvider('divinity-stats', foldingProvider));

		console.log("Registered folding provider");
	}
}

export function deactivate(): Thenable<void> {
	if (!instance) {
		return Promise.resolve();
	}

	const result = instance.dispose();
	instance = null;
	return result;
}
