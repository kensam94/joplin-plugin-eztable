import { Editor } from "codemirror";
const wcwidth = require("wcwidth");

module.exports = {
	default: function(_context: any) {

		const plugin = function(CodeMirror) {
			const regexContentText = `\\|((?:[^\r\n|]+))`;
			const regexContent = new RegExp(regexContentText, "g");	/* any cell content */
			const regexAnyLineText = `(^\\s*\\|(?:(?:[^\r\n|]+)\\|)+)`;
			const regex2ndLineText = `(^\\s*\\|(?:\\s*\\:?[-]{3,}\\:?\\s*\\|)+)`;
			const regexTable = new RegExp(`${regexAnyLineText}[\n\r]+${regex2ndLineText}(?:[\n\r]+${regexAnyLineText})+`, "gm");
			// const tableRegex = new RegExp(/(^\s*\|(?:(?:[^\r\n|]+)\|)+)[\n\r]+(^\s*\|(?:\s*\:?[-]{3,}\:?\s*\|)+)((?:[\n\r]+(^\s*\|(?:(?:[^\r\n|]+)\|)+))+)/, "gm")

			/**
			 * Get the start line and end line number of the table
			 * @param cm Code Mirror editor object
			 * @returns Start line and end line of the table: [number, number]
			 */
			function getTableStartEndLine(cm: Editor): any{
				const cursor = cm.getCursor();
				let startLine = cursor.line;
				/* Look backward for the first line starts with | */
				while (startLine >=0 && cm.getLine(startLine).trimStart().charAt(0) === '|') startLine--;
				startLine++;

				let endLine = cursor.line;
				/* Look forward for the last line starts with | */
				while (!!cm.getLine(endLine) && cm.getLine(endLine).trimStart().charAt(0) === '|') endLine++;

				return [startLine, endLine];
			}

			/**
			 * Get the column count of the table
			 * @param line One line of the table
			 * @returns Column count: number
			 */
			function getColumnCount(line: string): number{
				return ((line || '').match(regexContent) || []).length;
			}

			/**
			 * Check if the current cursor located in the table
			 * @param cm Code Mirror editor object
			 * @returns Whether cursor is located in the table: boolean
			 */
			function cursorInTable(cm: Editor): boolean{
				var result = false;

				var [startLine, endLine] = getTableStartEndLine(cm);
				var potentialTable = cm.getRange({line: startLine, ch:0}, {line: endLine, ch:0});
				result = regexTable.test(potentialTable);

				regexTable.exec(potentialTable); /* workaround for unknown bug: the result is alternating */
				return result;
			}

			/**
			 * Format the table to make it aligned
			 * @param tableText Markdown table in string
			 * @returns Formatted markdown table: string
			 */
			function ezFormatTable(tableText: string): string{
				var result = "";
				var regex2ndLine = new RegExp(/:?(-)+:?/, "g");	/* :---: */
				var columnCount = getColumnCount(tableText.split(/[\r\n]/)[0]);
				var m, counter = 0; /* counter to select column */
				var maxWidth = new Array(columnCount).fill(1); /* Store the max width for every column, set default max as 1 to ensure --- for empty column */

				/* Get the max width of each column */
				while (m = regexContent.exec(tableText)){
					var m1Trim = m[1].trim();	/* trim the whitespace */
					/* Exclude 2nd line (---) in determining the max width */
					if (!regex2ndLine.test(m1Trim)){
						var width = wcwidth(m1Trim);
						if (width > maxWidth[counter%columnCount]){
							maxWidth[counter%columnCount] = width;
						}
						counter++;
					}
					regex2ndLine.exec(m1Trim);	/* Workaround for unknown bug */
				}
				/* Replace the table with good alignment */
				result = tableText.replace(regexContent, function (m, m1) {
					var m1Trim = m1.trim();
					var replaceText = "";
					if (regex2ndLine.test(m1Trim)) {
						/* Handle for 2nd line (---) */
						replaceText = "-".repeat(maxWidth[counter%columnCount]);
						replaceText = m1Trim.startsWith(":")? ":" + replaceText : "-" + replaceText;
						replaceText = m1Trim.endsWith(":")? replaceText + ":" : replaceText + "-";
					}else if (m1Trim == ""){
						/* Handle for empty content */
						replaceText = " ".repeat(maxWidth[counter%columnCount] + 2);
					}else{
						/* Add padding for alignment */
						var widthOffset = wcwidth(m1Trim) - m1Trim.length;	/* Offset between js length and unicode length */
						replaceText = ' ' + m1Trim.padStart(maxWidth[counter%columnCount] - widthOffset) + " ";
					}
					regex2ndLine.exec(m1Trim);	/* Workaround for unknown bug. Alternating regex match and not match */
					counter++;
					return "|" + replaceText;
				});

				return result;
			}

			/**
			 * Joplin command to format the table
			 */
			CodeMirror.defineExtension('ezFormatTable', function() {
				const cm: Editor = this;

				if (cursorInTable(cm)){
					var [startLine, endLine] = getTableStartEndLine(cm);
					
					const table = cm.getRange({line: startLine, ch: 0}, {line: endLine, ch: 0});
					const formatted = ezFormatTable(table);
					cm.replaceRange(formatted, {line: startLine, ch: 0}, {line: endLine, ch: 0});
				}
            });

			/**
			 * Joplin command to insert an empty table
			 */
			CodeMirror.defineExtension('ezInsertTable', function() {
				const cm: Editor = this;

				const cursor = cm.getCursor();
				var tableText = `|   |   |\n|---|---|\n|   |   |\n`
				cm.replaceRange(tableText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: 0})
            });

			/**
			 * Joplin command to insert a new row
			 */
			CodeMirror.defineExtension('ezInsertNewRow', function () {
				const cm: Editor = this;

				if (cursorInTable(cm)){
					const cursor = cm.getCursor();
	
					var currentLineText = cm.getLine(cursor.line);
					var nextLineText = cm.getLine(cursor.line + 1);
					var regex = new RegExp(`${regex2ndLineText}`, "g");
	
					/* generate the content for new row */
					var colCount = (currentLineText.split("|").length - 1) - 1;	/* count the occurence of | then -1 */
					var newRowText = "|";
					for (let i = 0; i < colCount; i++) {
						newRowText += "   |";
					}
					newRowText += "\n";
					/* Insert new row */
					if (regex.test(nextLineText)) {	/* next row is 2nd row (---) */
						cm.replaceRange(newRowText, { line: cursor.line + 2, ch: 0 }, { line: cursor.line + 2, ch: 0 });
						cm.setCursor({ line: cursor.line + 2, ch: 1 });
					} else {
						cm.replaceRange(newRowText, { line: cursor.line + 1, ch: 0 }, { line: cursor.line + 1, ch: 0 });
						cm.setCursor({ line: cursor.line + 1, ch: 1 });
					}
				}
			});
			
			/**
			 * Joplin command to insert a new column
			 * Regex search until current column and replace it with additional column
			 */
			CodeMirror.defineExtension('ezInsertNewCol', function() {
				const cm: Editor = this;

				if (cursorInTable(cm)) {
					const cursor = cm.getCursor();
					var currentLineText = cm.getLine(cursor.line);
					/* Get the column index where cursor located */
					var cursorColIndex = getColumnCount(currentLineText.substring(0, cursor.ch));
					/* Regex to be replaced. Match repeated regexContentText */
					var regex = new RegExp(`((?:${regexContentText}){${cursorColIndex}}\\|)`);

					/* Get the table */
					var [startLine, endLine] = getTableStartEndLine(cm);
					const table = cm.getRange({ line: startLine, ch: 0 }, { line: endLine, ch: 0 });
					/* Inserting the new column */
					var newTableText = "";
					var a = table.split(/[\r\n]/), i;
					for (i = 0; i < a.length; i++) {
						if (i == 1) {
							newTableText += a[i].replace(regex, "$1---|") + "\n";
						} else {
							newTableText += a[i].replace(regex, "$1   |") + "\n";
						}
					}
					/* Format the table */
					const formatted = ezFormatTable(newTableText);
					/* Update the table */
					cm.replaceRange(formatted, { line: startLine, ch: 0 }, { line: endLine, ch: 0 });
					cm.setCursor(cursor);
				}
			});
			
			/**
			 * Joplin command to delete the column
			 * Regex search until current column - 1 and replace it with additional column
			 */
			CodeMirror.defineExtension('ezDeleteCol', function() {
				const cm: Editor = this;

				if (cursorInTable(cm)) {
					const cursor = cm.getCursor();
					var currentLineText = cm.getLine(cursor.line);
					/* Get the column index where cursor located */
					var cursorColIndex = getColumnCount(currentLineText.substring(0, cursor.ch));
					/* Regex to be replaced. Match repeated regexContentText */
					var regex = new RegExp(`((?:${regexContentText}){${cursorColIndex - 1}})${regexContentText}`);
					console.log(regex);

					/* Get the table */
					var [startLine, endLine] = getTableStartEndLine(cm);
					const table = cm.getRange({ line: startLine, ch: 0 }, { line: endLine, ch: 0 });
					/* Inserting the new column */
					var newTableText = "";
					var a = table.split(/[\r\n]/), i;
					for (i = 0; i < a.length; i++) {
						newTableText += a[i].replace(regex, "$1") + "\n";
					}
					/* Format the table */
					const formatted = ezFormatTable(newTableText);
					/* Update the table */
					cm.replaceRange(formatted, { line: startLine, ch: 0 }, { line: endLine, ch: 0 });
					cm.setCursor(cursor);
				}
			});

			/**
			 * Define the on event function
			 */
			CodeMirror.defineOption('eztable', false, function(cm, value) {
				if (!value) return;
				
				cm.on('cursorActivity', async function (cm1) {
					var intable = cursorInTable(cm);
					const cursor = cm.getCursor();
					console.log(intable);
					/* the cursor is in the table */
					if (intable) {
						cm.setOption("extraKeys", {
							/* Insert <br> instead of normal newline */
							Enter: function (cm) {
								var line = cm.getLine(cursor.line);
								var substr = line.substring(cursor.ch + 2, line.length - 1);
								console.log(line, cursor.ch, line.length, substr);
								console.log("substr", substr);
								/* check if the cursor located outside table */
								if (substr.includes("|") && cursor.ch != (line.length)){
									cm.replaceSelection('<br>');	/* inside table */
								}else{
									cm.replaceSelection('\n');	/* outside table */
								}
							},
							/* Set cursor at next column of same row */
							Tab: function (cm) {
								var lineText = cm.getLine(cursor.line);
								const regex = /\|/g;
								var m;
								/* Looking for the next column */
								while (m = regex.exec(lineText)){
									if (m.index > cursor.ch){
										/* break when the next | from cursor is found */
										break;
									}
								}
								if(m){
									/* set the cursor after | */
									cm.setCursor({line: cursor.line, ch: m.index + 1});
								}
							}
						});
					} else {
						/* Disable the extraKeys when the cursor is not in the table */
						cm.setOption("extraKeys", false);
					}
				});
			});
		}

		return {
			plugin: plugin,
			codeMirrorOptions: {
    			'eztable': true,
			}
        }
    }
}