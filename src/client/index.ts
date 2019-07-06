import { ExtensionContext } from "vscode";

import Client from "./Client";

let instance: Client | null = null;

export function activate(context: ExtensionContext) {
	if (!instance) {
		instance = new Client(context);
	}
}

export function deactivate(): Thenable<void> {
	if (!instance) {
		return Promise.resolve();
	}

	let result = instance.dispose();
	instance = null;
	return result;
}
