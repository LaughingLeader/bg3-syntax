import {
	CompletionItem,
	CompletionItemKind
} 
from "vscode-languageserver";

import BaseCompletionEntry from "./BaseCompletionEntry";

export class EnumEntry extends BaseCompletionEntry {
	index:string
	value:string
	constructor(xmlData:object) {
		super(xmlData);
		
		this.value = this.safeAssign("value", this.attributes, "");
		this.index = this.safeAssign("index", this.attributes, "");
		this.name = this.value;

		this.createCompletion(this.value, CompletionItemKind.EnumMember);

		if(this.index != "") this.completion.sortText = this.index;

		//console.log(`New enum entry: ${this.name} => ${this.value}`);
		//console.log(`New enum entry: ${JSON.stringify(xmlData, null, 2)}`);
	}
}

export default class EnumValues extends BaseCompletionEntry {
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