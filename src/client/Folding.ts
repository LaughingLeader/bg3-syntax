import * as vscode from 'vscode'

export default {
	provideFoldingRanges(document, context, token) {
		let itemComboPattern = /"^(new ItemCombination)\\s.*$"/;
		let itemComboEndPattern = /"^(new ItemCombinationResult.*)[\\s\\S]*?(?=\\n{2,})"/;

		let sectionStart = 0, FR = [];  // regex to detect start of region
		let sectionEnd = 0

		console.log('folding range invoked');

		for (let i = 0; i < document.lineCount; i++) {

			if (itemComboPattern.test(document.lineAt(i).text)) {
				if (sectionStart > 0) {
					FR.push(new vscode.FoldingRange(sectionStart, sectionEnd, vscode.FoldingRangeKind.Region));
				}
				sectionStart = i;
			}
			if (itemComboEndPattern.test(document.lineAt(i).text)) {
				if (sectionStart > 0) {
					FR.push(new vscode.FoldingRange(sectionStart, sectionEnd, vscode.FoldingRangeKind.Region));
				}
				sectionEnd = i+1;
			}
		}
		if (sectionStart > 0) { FR.push(new vscode.FoldingRange(sectionStart, sectionEnd, vscode.FoldingRangeKind.Region)); }

		return FR;
	}
  } as vscode.FoldingRangeProvider