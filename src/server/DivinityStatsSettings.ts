export default class DivinityStatsSettings {
	definitionFile: string;
	enumFile : string;
	limitToAvailableProperties : boolean
	constructor() {
		this.definitionFile = "";
		this.enumFile = "";
		this.limitToAvailableProperties = true;
	}
}