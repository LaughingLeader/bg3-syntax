import {
	ServerCapabilities,
	CompletionParams,
	CompletionItem,
	CompletionItemKind,
	Connection,
	TextDocuments,
	Range,
	CancellationToken
} 
from "vscode-languageserver/node";

import {
	TextDocument,
	TextEdit
} from 'vscode-languageserver-textdocument';

import Server from "./Server";
import DivinityStatsSettings from "./DivinityStatsSettings";

import runSafeAsync from "./utils/runSafeAsync";
import * as fs from "fs";
import * as xml2js from "xml2js";
import * as path from "path";

import ObjectDefinitionEntry from './stats/ObjectDefinitionEntry';
import { IEnumValues, EnumValues } from './stats/EnumValues';
import CustomEnumValues from './stats/CustomEnumValues';
import DataCompletion from './completion/DataCompletion';

export default class Completion {
	server:Server;
	connection: Connection;
	documents: TextDocuments<TextDocument>;

	definitionsSource: object;
	definitions: Map<string, Map<string, ObjectDefinitionEntry>>;

	enumSource: object;
	enumerations: Map<string, IEnumValues>;

	dataCompletion: DataCompletion;

	constructor(server: Server) {

		const { connection, documents } = server;
		this.server = server;
		this.connection = connection;
		this.documents = documents;
		
		this.dataCompletion = new DataCompletion(this);
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
					const entries = d["root"]["stat_object_definitions"][0];
					entries["stat_object_definition"].forEach(entry => {
						//server.connection.console.log(`Entry: ${JSON.stringify(entry.$, null, 2)}`);
						const definitionEntry:ObjectDefinitionEntry = new ObjectDefinitionEntry(entry);
						if(definitionEntry.name.includes("Status_")) {
							definitionEntry.name = definitionEntry.name.replace("Status_", "");
						}
		
						let categoryMap = this.definitions.get(definitionEntry.category);
		
						if(categoryMap === undefined) {
							categoryMap = new Map<string, ObjectDefinitionEntry>();
							this.definitions.set(definitionEntry.category, categoryMap);
						}
		
						categoryMap.set(definitionEntry.name, definitionEntry);
		
						//this.server.connection.console.log(`Added definition entry: ${definitionEntry.name} | ${definitionEntry}`);
					});
					this.definitionsSource = d;
					this.server.connection.console.log(`[DivinityStats] Finished building Definitions. (${this.definitions.size})`);
				});
		
				await this.loadEnumerations(settings).then((d) => {
					this.server.connection.console.log(`Getting entries from [root][enumerations]`);
					//this.server.connection.console.log(`Entry: ${JSON.stringify(d["root"]["enumerations"], null, 2)}`);
					const entries = d["root"]["enumerations"][0];
					entries["enumeration"].forEach(entry => {
						const enumEntry:EnumValues = new EnumValues(entry);
		
						this.enumerations.set(enumEntry.name, enumEntry);

						// this.definitions.forEach((category, key) => {
						// 	category.forEach((def, key) => {
						// 		def.fields.forEach((field, key) => {
						// 			if(field.enumeration_type_name == enumEntry.name) {
						// 				field.values = enumEntry;
						// 			}
						// 		});
						// 	});
						// });
		
						//this.server.connection.console.log(`Added enum entry: ${enumEntry.name} | ${enumEntry}`);
					});
					this.enumSource = d;
					this.server.connection.console.log(`[DivinityStats] Finished building Enumerations. (${this.enumerations.size})`);

					const targetConditionOperators:CustomEnumValues = new CustomEnumValues();
					const notop = CompletionItem.create("!");
					notop.sortText = "-1";
					notop.documentation = {
						kind: "markdown",
						value: "NOT operator."
					};
					targetConditionOperators.completionValues.push(notop);
					const andop = CompletionItem.create("&");
					andop.sortText = "-2";
					andop.documentation = {
						kind: "markdown",
						value: "AND operator."
					};
					targetConditionOperators.completionValues.push(andop);
					const orop = CompletionItem.create("|");
					orop.sortText = "-3";
					orop.documentation = {
						kind: "markdown",
						value: "OR operator."
					};
					targetConditionOperators.completionValues.push(orop);

					this.enumerations.set("TargetConditionOperator", targetConditionOperators);
				});
			}
		});
	}

	async loadDefinitions(settings:DivinityStatsSettings) : Promise<object|null>{
		const { server } = this;
		return new Promise(async (resolve, reject) => {
			const statObjPath = settings.definitionFile;
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
			const statObjPath = settings.enumFile;
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
				const parser = new xml2js.Parser();
				parser.parseString(data, (err2, result) => {
					if(err2) return reject(err2);
					resolve(result);
				});
			});
		});
	}

	async handleCompletion(params: CompletionParams, token:CancellationToken) : Promise<CompletionItem[]|undefined>{
		const { connection } = this;
		let results: Array<CompletionItem> = [];

		const settings = await this.server.getDocumentSettings(params.textDocument.uri);

		const doc = this.documents.get(params.textDocument.uri);
		if (doc) { 
			const lineText = doc.getText(Range.create(params.position.line, 0, params.position.line, Number.MAX_VALUE));
			const text = lineText.substring(0, params.position.character);
			
			await this.dataCompletion.handleCompletion(settings, text, lineText, doc, params, token).then((dataresults) => {
				results = results.concat(dataresults);
			});
	
			return results;
		}
	}

	handleResolveCompletion(item: CompletionItem): CompletionItem {
		const { connection } = this;
		return item;
	}
}