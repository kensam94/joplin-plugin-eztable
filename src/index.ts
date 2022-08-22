import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function () {
		joplin.contentScripts.register(ContentScriptType.CodeMirrorPlugin, "EzTable", "./eztable.js");

		joplin.commands.register({
			name: 'ezFormatTable',
			label: 'Ez Format Table',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', { name: 'ezFormatTable', });
			}
		});
		
		joplin.commands.register({
			name: 'ezInsertTable',
			label: 'Ez Insert Table',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', { name: 'ezInsertTable', });
			}
		});
		
		joplin.commands.register({
			name: 'ezInsertNewRow',
			label: 'Ez Insert New Row',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', { name: 'ezInsertNewRow', });
			}
		});
		
		joplin.commands.register({
			name: 'ezInsertNewCol',
			label: 'Ez Insert New Column',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', { name: 'ezInsertNewCol', });
			}
		});
		
		joplin.commands.register({
			name: 'ezDeleteCol',
			label: 'Ez Delete Column',
			execute: async () => {
				await joplin.commands.execute('editor.execCommand', { name: 'ezDeleteCol', });
			}
		});

		joplin.views.menus.create(
			"EzTableMenu",
			"EzTable",
			[
				{ commandName: "ezInsertTable", accelerator: 'CmdOrCtrl+Shift+I' },
				{ commandName: "ezFormatTable", accelerator: 'CmdOrCtrl++Shift+F' },
				{ commandName: "ezInsertNewRow", accelerator: 'CmdOrCtrl+Enter' },
				{ commandName: "ezInsertNewCol", accelerator: 'CmdOrCtrl+Tab' },
				{ commandName: "ezDeleteCol" },
			],
			MenuItemLocation.Tools);
		joplin.views.menuItems.create("Ez Format Table Context", "ezFormatTable", MenuItemLocation.EditorContextMenu);
		joplin.views.menuItems.create("Ez Delete Column Context", "ezDeleteCol", MenuItemLocation.EditorContextMenu);
	},
});
