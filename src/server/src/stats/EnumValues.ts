import {
	CompletionItem,
	CompletionItemKind,
	MarkupContent
} 
from "vscode-languageserver/node";

import BaseCompletionEntry from "./BaseCompletionEntry";
import { EnumEntry } from "./EnumEntry";

export interface IEnumValues {
	completionValues:Array<CompletionItem>
}

export class EnumValues extends BaseCompletionEntry implements IEnumValues {
	values:Array<EnumEntry>
	completionValues:Array<CompletionItem>

	constructor(xmlData:object) {
		super(xmlData);
		
		this.completionValues = new Array();
		this.values = new Array();

		let items = xmlData["items"][0]["item"];
		//console.log(`Enums: ${JSON.stringify(items, null, 2)}`);
		if (Array.isArray(items)){
			items.forEach(item => {
				if (Array.isArray(item)) {
					item.forEach((sub) => {
						let enumEntry:EnumEntry = new EnumEntry(sub);
						this.values.push(enumEntry);
						this.completionValues.push(enumEntry.completion);
					});
				}
				else {
					let enumEntry:EnumEntry = new EnumEntry(item);
					this.values.push(enumEntry);
					this.completionValues.push(enumEntry.completion);
				}
			});
		} else {
			console.log(`Enum obj is not an array: ${JSON.stringify(items, null, 2)}`);
		}
		//this.createCompletion(this.getEnumsForCompletion(), CompletionItemKind.Enum);

	}
}