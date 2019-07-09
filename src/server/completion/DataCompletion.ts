/*
This is auto-completion for stat types that declare values with data "Property" "Value".
These files can be named anything.
*/

import {
	ServerCapabilities,
	CompletionParams,
	CompletionItem,
	CompletionItemKind,
	Connection,
	TextDocument,
	TextDocuments,
	Range,
	CancellationToken
} 
from "vscode-languageserver";

const path = require('path');

import Completion from "../Completion";
import * as patterns from "./Patterns";
import ObjectDefinitionEntry, { FieldDefinitionEntry } from '../stats/ObjectDefinitionEntry';
import EnumValues from '../stats/EnumEntry';
import DivinityStatsSettings from '../DivinityStatsSettings';

export default class DataCompletion {
	parent:Completion

	constructor(p:Completion) {
		this.parent = p;
	}

	getStatTypeLineByLine(doc:TextDocument, params: CompletionParams) : string
	{
		let stopSearching = false;
		let lineNum = params.position.line;
		let statType = "";

		while(lineNum >= 0 && !stopSearching) {
			let text = doc.getText(Range.create(lineNum, 0, lineNum, Number.MAX_VALUE));
			//console.log(`[getStatType] Checking text: ${text} | ${lineNum}`);
			if(text != "") {
				let m = patterns.typePattern.exec(text);
				if(m !== null) {
					if (m.index === patterns.typePattern.lastIndex) {
						patterns.typePattern.lastIndex++;
					}

					m.forEach((match, groupIndex) => {
						//console.log(`[getStatType] Match: ${match}`);
						statType = match;
						stopSearching = true;
					});
				}
			}
			lineNum = lineNum - 1;
		}

		patterns.typePattern.lastIndex = 0;

		return statType;
	}

	getStatType(entryText:string) : string
	{
		let statType = "";

		let m = patterns.typePattern.exec(entryText);
		if(m !== null) {
			statType = m[1];
		}

		patterns.typePattern.lastIndex = 0;

		return statType;
	}

	isNullOrWhitespace( input:string ) : boolean {
		if (typeof input === 'undefined' || input == null) return true;
		return input.replace(/\s/g, '').length< 1;
	}

	getEntryText(doc:TextDocument, params: CompletionParams) : string {
		let text = "";
		
		let lineNum = params.position.line;
		let startLine = lineNum;
		let endLine = lineNum;

		while(lineNum >= 0) {
			text = doc.getText(Range.create(lineNum, 0, lineNum, Number.MAX_VALUE));
			if(this.isNullOrWhitespace(text)){
				startLine = lineNum;
				break;
			}
			lineNum = lineNum - 1;
		}

		lineNum = params.position.line;

		while(lineNum < doc.lineCount) {
			text = doc.getText(Range.create(lineNum, 0, lineNum, Number.MAX_VALUE));
			if(this.isNullOrWhitespace(text)){
				endLine = lineNum;
				break;
			}
			lineNum = lineNum + 1;
		}

		text = doc.getText(Range.create(startLine, 0, endLine, Number.MAX_VALUE));

		return text;
	}

	getEntryType(entryText:string, typeStr:string) : string {
		let entryType = "";

		if(entryText != "") {
			let findTypePattern = new RegExp(".*?data.*?" + typeStr + ".*?\"(\\w+).*?$", "gm");
			let m = findTypePattern.exec(entryText);
			//console.log(`Searching text for ${typeStr} | ${findTypePattern.source} | ${entryText}`);
			//console.log("Match: " + JSON.stringify(m, null, 2));
			if(m != null) {
				entryType = m[1];
			}
		}

		return entryType;
	}

	getLineProperty(text:string):string {
		let m = patterns.getPropertyPattern.exec(text);
		if (m !== null) {
			return m[1];
		}
		return "";
	}

	isAtPropertyPosition(text:string) : boolean {
		let m = patterns.propertyPositionPattern.exec(text);
		console.log(`Is at property position: ${text} => ${m}`);
		if (m !== null && m.length > 0) {
			return true;
		}
		return false;
	}

	isAtValuePosition(text:string) : boolean {
		let m = patterns.valuePositionPattern.exec(text);
		console.log(`Is at value position: ${text} => ${m}`);
		if (m !== null && m.length > 0) {
			return true;
		}
		return false;
	}

	canShowField(field:FieldDefinitionEntry, entryText:string, settings:DivinityStatsSettings) : boolean {
		if(settings.limitToAvailableProperties == true) {
			let properties = patterns.getAllPropertiesPattern.exec(entryText);
		}
		return true;
	}

	withinQuotes(text:string, params:CompletionParams) : boolean {
		if(params.context.triggerCharacter === '"' || text.charAt(params.position.character - 1) == '"') {
			return true;
		} else {
			let charNum = params.position.character;
			let foundLeft = false;
			while(charNum > 0) {
				if(text.charAt(charNum) === '"') {
					foundLeft = true;
					break;
				}
				charNum--;
			}

			if(foundLeft) {
				charNum = params.position.character;
				while(charNum < text.length) {
					if(text.charAt(charNum) === '"') {
						return true;
					} else if(text.charAt(charNum) === "\\n") {
						break;
					}
					charNum++;
				}
			}
		}
		return false;
	}

	async handleCompletion(settings:DivinityStatsSettings, text:string, lineText:string, doc:TextDocument, params: CompletionParams, token:CancellationToken) : Promise<CompletionItem[]>{
		const { connection, definitions } = this.parent;
		let result: Array<CompletionItem> = [];

		if(this.withinQuotes(lineText, params)) {
			//Check for the first set of quotes
			let entryText = this.getEntryText(doc, params);
			let statType = this.getStatType(entryText);

			//Filename == category for special files like ItemCombos.
			if(statType === "") {
				let filename:string = path.parse(doc.uri).name;
				let categoryEntries:Map<string,ObjectDefinitionEntry> = null;

				for(let [key, categoryMap] of definitions) {
					if(key.toLowerCase().indexOf(filename.toLowerCase()) > -1 ) {
						statType = key;
						break;
					}
				}
			}

			connection.console.log(`Getting completion for stat type '${statType}'`);

			if(statType != "") {
				let categoryEntries = definitions.get(statType);
				let definitionEntry:ObjectDefinitionEntry = null;

				if(statType.indexOf("SkillData") > -1){
					let skillType = this.getEntryType(entryText, "SkillType");
					console.log("Getting definition for " + skillType);
					if(skillType != "") {
						definitionEntry = categoryEntries.get(skillType);
					}
				}
				else if(statType.indexOf("StatusData") > -1) {
					let statusType = this.getEntryType(entryText, "StatusType");
					if(statusType != "") {
						definitionEntry = categoryEntries.get(statusType);
					}
				}
				else {
					definitionEntry = categoryEntries[0];
				}

				if(definitionEntry != null) {
					connection.console.log(`Getting definitions for '${definitionEntry.name}'`);
					if(this.isAtValuePosition(text)) {
						let property = this.getLineProperty(text);
						if(property !== "") {
							let field = definitionEntry.fields.get(property);
							console.log(`Getting enums [${field.enumeration_type_name}] for property ${property}`);
							if(field !== undefined){

								if(field.enumeration_type_name != "") {
									let enumEntry = this.parent.enumerations.get(field.enumeration_type_name);
									if(enumEntry !== undefined) {
										//console.log(`Enums ${JSON.stringify(enumEntry.completionValues)}`);
										result = result.concat(enumEntry.completionValues);
									}
								}

								if(field.export_name == "ExtraProperties" || field.export_name == "SkillProperties") {
									if(params.position.character - text.indexOf("IF") >= 2) {
										let targetConditions = this.parent.enumerations.get("SkillTargetCondition").completionValues;
										result = result.concat(targetConditions).filter((c, index, arr) => {
											return c.data != "None";
										});
									} else {
										let actions = this.parent.enumerations.get("Game Action").completionValues;
										let surfaceActions = this.parent.enumerations.get("Surface Change").completionValues;
										result = result.concat(actions, surfaceActions).filter((c, index, arr) => {
											return c.data != "None";
										});
									}	
								}
							}
						}
					}
					else if(this.isAtPropertyPosition(text)){

						let ignoreFields:Array<string> = [];

						if(settings.limitToAvailableProperties == true) {
							//console.log(`Searching entry text ${entryText} for properties`);
							let m:RegExpExecArray;
							while ((m = patterns.getAllPropertiesPattern.exec(entryText)) !== null) {
								// This is necessary to avoid infinite loops with zero-width matches
								if (m.index === patterns.getAllPropertiesPattern.lastIndex) {
									patterns.getAllPropertiesPattern.lastIndex++;
								}
								
								// The result can be accessed through the `m`-variable.
								m.forEach((match, groupIndex) => {
									if (groupIndex == 1) {
										ignoreFields.push(match);
										console.log("Ignoring existing property " + match);
									}
								});
							}

							patterns.getAllPropertiesPattern.lastIndex = 0;
						}

						definitionEntry.fields.forEach((field, key) => {
							if(!ignoreFields.includes(field.export_name)) {
								result.push(field.completion);
							}
						});
					}
				}
				else {
					connection.console.log(`Failed to find definition for entry.'${statType}'`);
				}

				//connection.console.log('text: ' + text);
				//connection.console.log('params.textDocument.uri: ' + params.textDocument.uri);
				//connection.console.log('character: ' + params.position.character);
				//connection.console.log('line: ' + params.position.line);
				//connection.console.log('triggerCharacter: ' + params.context.triggerCharacter);
			}
		}

		
		return result;
	}

}