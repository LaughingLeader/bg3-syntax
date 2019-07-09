import { CompletionItem } from "vscode-languageserver";
import { IEnumValues } from "./EnumValues";

export default class CustomEnumValues implements IEnumValues {
	completionValues:Array<CompletionItem>

	constructor() {
		this.completionValues = new Array();
	}
}