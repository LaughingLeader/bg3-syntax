import {
	CompletionItem,
	CompletionItemKind,
	Connection
} 
from "vscode-languageserver";

import Server from "./../Server";
//import * as path from "path";
//import runSafeAsync from "./../utils/runSafeAsync";

const fs = require('fs'), xml2js = require('xml2js');

export interface IStatsCompletionDict {
	[details: string] : CompletionItem;
}

export function createCompletionItem(vaL: string, desc: string, doc: string) : CompletionItem {
	return {
		data: vaL,
		label: vaL,
		kind: CompletionItemKind.Keyword,
		detail: desc,
		documentation: {
			kind: "markdown",
			value: doc
		}
	};
}

export class SkillData{

	skilltypes : IStatsCompletionDict;
	properties : IStatsCompletionDict;

	constructor(){

		let skilltypes : IStatsCompletionDict = {};
		skilltypes["Projectile"] = createCompletionItem("Projectile", "", "Skill Type");
		skilltypes["ProjectileStrike"] = createCompletionItem("ProjectileStrike", "", "Skill Type");
		skilltypes["Target"] = createCompletionItem("Target", "", "Skill Type");
		skilltypes["Cone"] = createCompletionItem("Cone", "", "Skill Type");
		skilltypes["Zone"] = createCompletionItem("Zone", "", "Skill Type");
		skilltypes["MultiStrike"] = createCompletionItem("MultiStrike", "", "Skill Type");
		skilltypes["Quake"] = createCompletionItem("Quake", "", "Skill Type");
		skilltypes["Storm"] = createCompletionItem("Storm", "", "Skill Type");
		skilltypes["Rush"] = createCompletionItem("Rush", "", "Skill Type");
		skilltypes["Jump"] = createCompletionItem("Jump", "", "Skill Type");
		skilltypes["Tornado"] = createCompletionItem("Tornado", "", "Skill Type");
		skilltypes["Wall"] = createCompletionItem("Wall", "", "Skill Type");
		skilltypes["Teleportation"] = createCompletionItem("Teleportation", "", "Skill Type");
		skilltypes["Path"] = createCompletionItem("Path", "", "Deprecated. Will crash the game.");
		skilltypes["Rain"] = createCompletionItem("Rain", "", "Skill Type");
		skilltypes["Summon"] = createCompletionItem("Summon", "", "Skill Type");
		skilltypes["Shout"] = createCompletionItem("Shout", "", "Skill Type");
		skilltypes["Dome"] = createCompletionItem("Dome", "", "Skill Type");

		this.skilltypes = skilltypes;

		let properties : IStatsCompletionDict = {};

		this.properties = properties;
	}
}

export default class Keywords{
	skills: SkillData;
	definitionsSource : object;
	definitions: Map<string, object>;
	server : Server;
	constructor(server: Server) {
		this.skills = new SkillData();
		this.server = server;
		this.definitions = new Map();
		this.buildDefinitions().then((d) => {
			let entries = d["root"]["stat_object_definitions"][0];
			entries["stat_object_definition"].forEach(entry => {
				//server.connection.console.log(`Entry: ${JSON.stringify(entry.$, null, 2)}`);
				let name:string = entry.$["name"];
				if(name.includes("Status_")) {
					name = name.replace("Status_", "");
				}
				this.definitions.set(name, entry);
				server.connection.console.log(`Mapped entry: ${name} | ${entry}`);
			});
			this.definitionsSource = d;
		});
	}

	async buildDefinitions() : Promise<object|null>{
		const { server } = this;
		server.connection.console.log("Loading settings.");
		return new Promise(async (resolve, reject) => {
			await server.getGlobalSettings().then(async (settings) => {
				if(settings != null && settings.definitionFile != "") {
					let statObjPath = settings.definitionFile;
					server.connection.console.log(`Loading config file from '${statObjPath}'`);
					await this.loadDefinitionsFile(statObjPath).then((defObject) => {
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
				} else {
					server.connection.console.log(`Loaded settings: ${settings}`);
					reject(null);
				}
			});
		});
	}
	
	loadDefinitionsFile(filePath:string):Promise<object|null>{
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
}