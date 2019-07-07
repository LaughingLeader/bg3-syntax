import {
	CompletionItem,
	CompletionItemKind
} 
from "vscode-languageserver";

import BaseCompletionEntry from "./BaseCompletionEntry";

export class EnumEntry extends BaseCompletionEntry {
	value:string
	constructor(xmlData:object) {
		super(xmlData);
		
		this.value = this.safeAssign("value", this.attributes, "");

		this.createCompletion(this.value, CompletionItemKind.Value);
	}
}

export default class EnumValues extends BaseCompletionEntry {
	completion:CompletionItem
	values:Array<EnumEntry>

	constructor(xmlData:object) {
		super(xmlData);
		
		this.values = new Array();
		let items = xmlData["items"];
		items.forEach(item => {
			let enumEntry:EnumEntry = new EnumEntry(item);
			this.values.push(enumEntry);
		});

		this.createCompletion(this.getEnumsForCompletion(), CompletionItemKind.Enum);
	}

	getEnumsForCompletion() {
		let enums:Array<CompletionItem> = new Array(this.values.length);
		this.values.forEach(entry => {
			enums.push(entry.completion);
		});
		return enums;
	}
}