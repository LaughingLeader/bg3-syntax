import {
	CompletionItem,
	CompletionItemKind,
	MarkupContent
} 
from "vscode-languageserver/node";

import BaseCompletionEntry from "./BaseCompletionEntry";
import ICompletionEntry from "./BaseCompletionEntry";

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
