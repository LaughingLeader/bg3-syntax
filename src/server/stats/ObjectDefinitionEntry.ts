import {
	CompletionItem,
	CompletionItemKind
} 
from "vscode-languageserver";

import BaseCompletionEntry from "./BaseCompletionEntry";

export default class ObjectDefinitionEntry extends BaseCompletionEntry {
	fields:Map<string, FieldDefinitionEntry>
	category:string
	export_type:string
	can_inherit:boolean

	constructor(xmlData:object) {
		super(xmlData);
		
		if(this.name != "") {
			this.category = this.safeAssign("category", this.attributes, this.name);
			this.export_type = this.safeAssign("export_type", this.attributes, this.name);
		} else {
			this.category = this.safeAssign("category", this.attributes, "undefined");
			this.export_type = this.safeAssign("export_type", this.attributes, "undefined");
		}

		this.fields = new Map();

		let fieldsContainer = xmlData["field_definitions"][0]["field_definition"];
		//console.log(`Fields: ${JSON.stringify(fieldsContainer[0]["field_definition"], null, 2)}`);
		if(fieldsContainer !== undefined) { 
			fieldsContainer.forEach(field => {
				let fieldEntry:FieldDefinitionEntry = new FieldDefinitionEntry(field);

				//Using is a special declaration instead of 'data "Property"
				if(fieldEntry.name !== "Using") {
					this.fields.set(fieldEntry.name, fieldEntry);
					//console.log(`Added field entry: ${fieldEntry.name} | ${JSON.stringify(fieldEntry, null, 2)}`);
				}
				else {
					this.can_inherit = true
				}
			});
		}

		this.createCompletion(this.name, CompletionItemKind.TypeParameter);
	}
}

export class FieldDefinitionEntry extends BaseCompletionEntry {
	export_name:string
	display_name:string
	type:string
	enumeration_type_name:string
	parser_name:string

	//values:EnumValues

	constructor(xmlData:object) {
		super(xmlData);

		//console.log(`Field: ${JSON.stringify(xmlData, null, 2)}`);
		
		this.display_name = this.safeAssign("display_name", this.attributes, this.name);
		this.export_name = this.safeAssign("export_name", this.attributes, this.name);
		this.type = this.safeAssign("type", this.attributes, "String");
		this.enumeration_type_name = this.safeAssign("enumeration_type_name", this.attributes, "");
		this.parser_name = this.safeAssign("parser_name", this.attributes, "");
		if(this.parser_name == "Conditions") {
			this.enumeration_type_name = "SkillTargetCondition";
		}

		// if(this.export_name == "ExtraProperties" || this.export_name == "SkillProperties") {
		// 	this.enumeration_type_name = "Game Action";
		// }

		this.createCompletion(this.export_name, CompletionItemKind.Keyword);
	}
}