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

import Server from "./Server";
import DivinityStatsSettings from "./DivinityStatsSettings";

import runSafeAsync from "./utils/runSafeAsync";
const fs = require('fs'), xml2js = require('xml2js');
const path = require('path');

import ObjectDefinitionEntry from './stats/ObjectDefinitionEntry';
import EnumValues from './stats/EnumEntry';

const typePattern = /^\s*?type \s*?"(\w+)"?.*$/mg;
const propertyPositionPattern = /(.*?data.*?").*$/m;
const valuePositionPattern = /.*?data.*?"\w+".*?"/m;
const getPropertyPattern = /.*?data.*?"(\w+)"?.*$/m;

export default class Completion {
	server:Server;
	connection: Connection;
	documents: TextDocuments;

	definitionsSource: object;
	definitions: Map<string, Map<string, ObjectDefinitionEntry>>;

	enumSource: object;
	enumerations: Map<string, EnumValues>;

	constructor(server: Server) {

		const { connection, documents } = server;
		this.server = server;
		this.connection = connection;
		this.documents = documents;
	/*
		connection.onCompletion((params) =>
			runSafeAsync(() => this.handleCompletion(params),
				null,
				`Error while computing completions for ${params.textDocument.uri}`,
				token
			)
		);
	*/

		this.definitions = new Map();
		this.enumerations = new Map();

		this.buildCompletion();

		connection.onCompletion(async (params, token) => this.handleCompletion(params, token));
		connection.onCompletionResolve((params) => this.handleResolveCompletion(params));

		connection.console.log("Registered Completion service.");
	}

	async buildCompletion() {
		await this.server.getGlobalSettings().then(async (settings) => {
			if(settings != null) {
				await this.loadDefinitions(settings).then((d) => {
					this.server.connection.console.log(`Getting entries from [root][stat_object_definitions]`);
					let entries = d["root"]["stat_object_definitions"][0];
					entries["stat_object_definition"].forEach(entry => {
						//server.connection.console.log(`Entry: ${JSON.stringify(entry.$, null, 2)}`);
						let definitionEntry:ObjectDefinitionEntry = new ObjectDefinitionEntry(entry);
						if(definitionEntry.name.includes("Status_")) {
							definitionEntry.name = definitionEntry.name.replace("Status_", "");
						}
		
						let categoryMap = this.definitions.get(definitionEntry.category);
		
						if(categoryMap === undefined) {
							categoryMap = new Map<string, ObjectDefinitionEntry>();
							this.definitions.set(definitionEntry.category, categoryMap);
						}
		
						categoryMap.set(definitionEntry.name, definitionEntry);
		
						this.server.connection.console.log(`Added definition entry: ${definitionEntry.name} | ${definitionEntry}`);
					});
					this.definitionsSource = d;
				});
		
				await this.loadEnumerations(settings).then((d) => {
					this.server.connection.console.log(`Getting entries from [root][enumerations]`);
					//this.server.connection.console.log(`Entry: ${JSON.stringify(d["root"]["enumerations"], null, 2)}`);
					let entries = d["root"]["enumerations"][0];
					entries["enumeration"].forEach(entry => {
						let enumEntry:EnumValues = new EnumValues(entry);
		
						this.enumerations.set(enumEntry.name, enumEntry);
		
						this.server.connection.console.log(`Added enum entry: ${enumEntry.name} | ${enumEntry}`);
					});
					this.enumSource = d;
				});
			}
		});
	}

	async loadDefinitions(settings:DivinityStatsSettings) : Promise<object|null>{
		const { server } = this;
		return new Promise(async (resolve, reject) => {
			let statObjPath = settings.definitionFile;
			server.connection.console.log(`Loading Definitions file from '${statObjPath}'`);
			await this.loadFile(statObjPath).then((defObject) => {
				if(defObject != null) {
					// defObject["root"].stat_object_definitions.forEach((entry) => {
					// 	server.connection.console.log(`${JSON.stringify(entry, null, 2)}`);
					// });
					resolve(defObject);
				}
				else {
					server.connection.console.log("Failed to load file: fileContents is null");
					reject(null);
				}
			});
		});
	}

	async loadEnumerations(settings:DivinityStatsSettings) : Promise<object|null>{
		const { server } = this;
		return new Promise(async (resolve, reject) => {
			let statObjPath = settings.enumFile;
			server.connection.console.log(`Loading Enumerations file from '${statObjPath}'`);
			await this.loadFile(statObjPath).then((defObject) => {
				if(defObject != null) {
					resolve(defObject);
				}
				else {
					server.connection.console.log("Failed to load file: fileContents is null");
					reject(null);
				}
			});
		});
	}
	
	loadFile(filePath:string):Promise<object|null>{
		this.server.connection.console.log(`Loading file from '${filePath}'`);
		
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, "utf8", (err, data) => {
				if(err) return reject(err);
				let parser = new xml2js.Parser();
				parser.parseString(data, (err2, result) => {
					if(err2) return reject(err2);
					resolve(result);
				});
			});
		})
	};

	getStatType(doc:TextDocument, params: CompletionParams) : string
	{
		let stopSearching = false;
		let lineNum = params.position.line;
		let statType = "";

		while(lineNum >= 0 && !stopSearching) {
			let text = doc.getText(Range.create(lineNum, 0, lineNum, Number.MAX_VALUE));
			console.log(`[getStatType] Checking text: ${text} | ${lineNum}`);
			if(text != "") {
				let m = typePattern.exec(text);
				if(m !== null) {
					if (m.index === typePattern.lastIndex) {
						typePattern.lastIndex++;
					}
	
					m.forEach((match, groupIndex) => {
						console.log(`[getStatType] Match: ${match}`);
						statType = match;
						stopSearching = true;
					});
				}
			}
			lineNum = lineNum - 1;
		}

		typePattern.lastIndex = -1;

		return statType;
	}

	isNullOrWhitespace( input:string ) : boolean {
		if (typeof input === 'undefined' || input == null) return true;
		return input.replace(/\s/g, '').length < 1;
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

	getEntryType(doc:TextDocument, params: CompletionParams, typeStr:string) : string {
		let entryText = this.getEntryText(doc, params);
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
		let m = propertyPositionPattern.exec(text);
		if (m !== null) {
			return m[1];
		}
		return "";
	}

	isAtPropertyPosition(text:string) : boolean {
		if (propertyPositionPattern.exec(text) !== null) {
			return true;
		}
		return false;
	}

	isAtValuePosition(text:string) : boolean {
		if (valuePositionPattern.exec(text) !== null) {
			return true;
		}
		return false;
	}

	async handleCompletion(params: CompletionParams, token:CancellationToken) : Promise<CompletionItem[]>{
		const { connection } = this;
		const result: Array<CompletionItem> = [];

		if (params.context.triggerCharacter === '"') {
			let doc = this.documents.get(params.textDocument.uri);
			let text = doc.getText(Range.create(params.position.line, 0, params.position.line, params.position.character));
	
			//Check for the first set of quotes
			let statType = this.getStatType(doc, params);
	
			//Filename == category for special files like ItemCombos.
			if(statType === "") {
				let filename:string = path.parse(doc.uri).name;
				let categoryEntries:Map<string,ObjectDefinitionEntry> = null;
	
				for(let [key, categoryMap] of this.definitions) {
					if(key.toLowerCase().indexOf(filename.toLowerCase()) > -1 ) {
						statType = key;
						break;
					}
				}
			}
	
			connection.console.log(`Getting completion for stat type '${statType}'`);
	
			if(statType != "") {
				let categoryEntries = this.definitions.get(statType);
				let definitionEntry:ObjectDefinitionEntry = null;
	
				if(statType.indexOf("SkillData") > -1){
					let skillType = this.getEntryType(doc, params, "SkillType");
					console.log("Getting definition for " + skillType);
					if(skillType != "") {
						definitionEntry = categoryEntries.get(skillType);
					}
				}
				else if(statType.indexOf("StatusData") > -1) {
					let statusType = this.getEntryType(doc, params, "StatusType");
					if(statusType != "") {
						definitionEntry = categoryEntries.get(statusType);
					}
				}
				else {
					definitionEntry = categoryEntries[0];
				}
	
				if(definitionEntry != null) {
					connection.console.log(`Getting definitions for '${definitionEntry.name}'`);
					if(this.isAtPropertyPosition){
						definitionEntry.fields.forEach((field, key) => {
							result.push(field.completion);
						});
					}
					else if(this.isAtValuePosition) {
						let property = this.getLineProperty(text);
						if(property !== "") {
							let field = definitionEntry.fields.get(property);
							if(field !== undefined){
								result.push(field.values.completion);
							}
						}
					}
				}
				else {
					connection.console.log(`Failed to find definition for entry.'${statType}'`);
				}
	
				
			}
	
			//connection.console.log('text: ' + text);
			//connection.console.log('params.textDocument.uri: ' + params.textDocument.uri);
			//connection.console.log('character: ' + params.position.character);
			//connection.console.log('line: ' + params.position.line);
			//connection.console.log('triggerCharacter: ' + params.context.triggerCharacter);
		}
		return result;
	}

	handleResolveCompletion(item: CompletionItem): CompletionItem {
		const { connection } = this;
		connection.console.log("Auto-completion resolved?");

		return item;
	}
}