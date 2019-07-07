import {
	CompletionItem,
	CompletionItemKind,
	MarkupContent
} 
from "vscode-languageserver";

export default class BaseCompletionEntry{
	completion:CompletionItem
	data:object
	attributes:object

	name:string
	description:string
	documentation:string | MarkupContent;

	constructor(xmlData:object) {
		this.data = xmlData;
		this.attributes = xmlData["$"];

		this.name = this.safeAssign("name", this.attributes, "");
		this.description = this.safeAssign("description", this.attributes, "");
	}

	safeAssign(getProp:string, container:object, fallback) : any {
		if(container !== undefined && getProp in container) { 
			return container[getProp];
		} else {
			console.log(`Property ${getProp} could not be found in ${container}`);
			return fallback;
		}
	}

	createCompletion(value:any, kind:CompletionItemKind = CompletionItemKind.Keyword){
		this.completion = CompletionItem.create(this.name);
		this.completion.data = value;
		this.completion.kind = kind;
		this.completion.detail = this.description;

		if(this.documentation === undefined) {
			this.documentation = {
				kind: "markdown",
				value: this.description
			}
		} else {
			this.completion.documentation = this.documentation;
		}
	}
}