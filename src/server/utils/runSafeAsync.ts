/*---------------------------------------------------------------------------------------------
 *	Copyright (c) Microsoft Corporation. All rights reserved.
 *	Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, ResponseError } from "vscode-languageserver";

import { cancelValue, formatError } from "./runSafe";

export default function runSafeAsync<T, E = any>(
	func: () => Thenable<T>,
	errorVal: T,
	errorMessage: string,
	token: CancellationToken
): Thenable<T | ResponseError<E>> {
	return new Promise<T | ResponseError<E>>((resolve, reject) => {
		setImmediate(() => {
			if (token.isCancellationRequested) {
				resolve(cancelValue());
			}
			return func().then(
				result => {
					if (token.isCancellationRequested) {
						resolve(cancelValue());
						return;
					} else {
						resolve(result);
					}
				},
				e => {
					console.error(formatError(errorMessage, e));
					resolve(errorVal);
				}
			);
		});
	});
}
