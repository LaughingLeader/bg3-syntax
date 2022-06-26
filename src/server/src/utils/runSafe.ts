/*---------------------------------------------------------------------------------------------
 *	Copyright (c) Microsoft Corporation. All rights reserved.
 *	Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	CancellationToken,
	ResponseError,
	LSPErrorCodes
} from "vscode-languageserver/node";

export function formatError(message: string, err: any): string {
	if (err instanceof Error) {
		const error = <Error>err;
		return `${message}: ${error.message}\n${error.stack}`;
	} else if (typeof err === "string") {
		return `${message}: ${err}`;
	} else if (err) {
		return `${message}: ${err.toString()}`;
	}
	return message;
}

export function cancelValue<E>() {
	return new ResponseError<E>(LSPErrorCodes.RequestCancelled, "Request cancelled");
}

export default function runSafe<T, E>(
	func: () => T,
	errorVal: T,
	errorMessage: string,
	token: CancellationToken
): Thenable<T | ResponseError<E>> {
	return new Promise<T | ResponseError<E>>((resolve, reject) => {
		setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelValue());
			} else {
				try {
					const result = func();
					if (token.isCancellationRequested) {
						resolve(cancelValue());
						return;
					} else {
						resolve(result);
					}
				} catch (e) {
					console.error(formatError(errorMessage, e));
					resolve(errorVal);
				}
			}
		});
	});
}
