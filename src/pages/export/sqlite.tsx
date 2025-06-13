import { Component, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { db, StoredMediaMetadata, StoredMessage, StoredUser } from "../../db/database";
import { Conversation } from "../../types/message";
import Layout from "../../components/Layout";
import { requireDataLoaded } from "../../utils";
import initSqlJs from "sql.js";
import sqliteWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { Media } from "../../types/message";

// TODO: allow for more granular control over what data is exported.
// TODO: repl to allow user to inspect data without downloading it
// TODO: add error handling
// TODO: allow embedding of media files as blobs? might run into memory limits.
// TODO: allow for customizing the output file name
const SqliteExport: Component = () => {
	const navigate = useNavigate();
	const [exportProgress, setExportProgress] = createSignal(0);
	const [exportStatus, setExportStatus] = createSignal("");
	const [isExporting, setIsExporting] = createSignal(false);
	const [isComplete, setIsComplete] = createSignal(false);
	const [downloadUrl, setDownloadUrl] = createSignal<string>("");

	onMount(() => {
		if (!requireDataLoaded()) {
			navigate("/", { replace: true });
		}
	});

	const exportToSqlite = async () => {
		setIsExporting(true);
		setIsComplete(false);
		setExportProgress(0);
		setExportStatus("Loading SQL.js...");

		try {
			const SQL = await initSqlJs({
				locateFile: () => sqliteWasmUrl
			});
			setExportProgress(10);

			setExportStatus("Creating database...");
			const sqliteDb = new SQL.Database();
			setExportProgress(15);

			setExportStatus("Creating tables...");
			sqliteDb.run(`
				CREATE TABLE users (
					username TEXT PRIMARY KEY,
					is_blocked BOOLEAN,
					blocked_timestamp TIMESTAMP,
					is_close_friend BOOLEAN,
					close_friend_timestamp TIMESTAMP,
					requested_to_follow_you BOOLEAN,
					requested_to_follow_you_timestamp TIMESTAMP,
					is_follower BOOLEAN,
					follower_timestamp TIMESTAMP,
					is_following BOOLEAN,
					following_timestamp TIMESTAMP,
					hidden_story_from BOOLEAN,
					hidden_story_from_timestamp TIMESTAMP,
					pending_follow_request BOOLEAN,
					pending_follow_request_timestamp TIMESTAMP,
					recently_unfollowed BOOLEAN,
					recently_unfollowed_timestamp TIMESTAMP,
					stories_liked INTEGER
				);
			`);

			sqliteDb.run(`
				CREATE TABLE messages (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					conversation_title TEXT,
					sender_name TEXT,
					timestamp TIMESTAMP,
					content TEXT,
					is_system_message BOOLEAN,
					media_files TEXT,
					reactions TEXT,
					share_link TEXT,
					share_text TEXT
				);
			`);

			sqliteDb.run(`
				CREATE TABLE conversations (
					title TEXT PRIMARY KEY,
					participants TEXT,
					is_group BOOLEAN
				);
			`);
			setExportProgress(20);

			setExportStatus("Fetching data from local database...");
			const allUsers: StoredUser[] = await db.users.toArray();
			const allMessages: StoredMessage[] = await db.messages.toArray();
			const allMediaMetadata: StoredMediaMetadata[] = await db.media_metadata.toArray();
			const allConversations: Conversation[] = await db.conversations.toArray();

			const mediaMetadataMap = new Map<string, StoredMediaMetadata>();
			for (const meta of allMediaMetadata) {
				mediaMetadataMap.set(meta.uri, meta);
			}
			setExportProgress(30);

			// Wait for the next tick to ensure the UI updates
			await new Promise(resolve => setTimeout(resolve, 0));

			setExportStatus("Exporting users...");
			const userInsert = sqliteDb.prepare(`
				INSERT INTO users (
					username, is_blocked, blocked_timestamp, is_close_friend, close_friend_timestamp,
					requested_to_follow_you, requested_to_follow_you_timestamp, is_follower, follower_timestamp,
					is_following, following_timestamp, hidden_story_from, hidden_story_from_timestamp,
					pending_follow_request, pending_follow_request_timestamp, recently_unfollowed, recently_unfollowed_timestamp,
					stories_liked
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (let i = 0; i < allUsers.length; i++) {
				const user = allUsers[i];
				userInsert.run([
					user.username,
					user.blocked?.value ? 1 : 0,
					user.blocked?.timestamp?.toISOString() || null,
					user.close_friends?.value ? 1 : 0,
					user.close_friends?.timestamp?.toISOString() || null,
					user.requested_to_follow_you?.value ? 1 : 0,
					user.requested_to_follow_you?.timestamp?.toISOString() || null,
					user.follower?.value ? 1 : 0,
					user.follower?.timestamp?.toISOString() || null,
					user.following?.value ? 1 : 0,
					user.following?.timestamp?.toISOString() || null,
					user.hidden_story_from?.value ? 1 : 0,
					user.hidden_story_from?.timestamp?.toISOString() || null,
					user.pending_follow_request?.value ? 1 : 0,
					user.pending_follow_request?.timestamp?.toISOString() || null,
					user.recently_unfollowed?.value ? 1 : 0,
					user.recently_unfollowed?.timestamp?.toISOString() || null,
					user.stories_liked || 0
				]);
				if (i % 50 === 0 || i === allUsers.length - 1) {
					setExportProgress(30 + Math.round(((i + 1) / allUsers.length) * 30));
					await new Promise(resolve => setTimeout(resolve, 0));
				}
			}
			userInsert.free();
			setExportProgress(50);

			setExportStatus("Exporting conversations...");
			const conversationInsert = sqliteDb.prepare(`
				INSERT INTO conversations (title, participants, is_group)
				VALUES (?, ?, ?)
			`);

			for (let i = 0; i < allConversations.length; i++) {
				const conversation = allConversations[i];
				conversationInsert.run([
					conversation.title,
					JSON.stringify(conversation.participants),
					conversation.is_group ? 1 : 0
				]);
				if (i % 25 === 0 || i === allConversations.length - 1) {
					const progress = 50 + Math.round(((i + 1) / allConversations.length) * 10);
					setExportProgress(progress);
					await new Promise(resolve => setTimeout(resolve, 0));
				}
			}
			conversationInsert.free();
			setExportProgress(60);

			setExportStatus("Exporting messages...");
			const messageInsert = sqliteDb.prepare(`
				INSERT INTO messages (
					conversation_title, sender_name, timestamp, content, is_system_message,
					media_files, reactions, share_link, share_text
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (let i = 0; i < allMessages.length; i++) {
				const message = allMessages[i];
				const mediaFileNames: string[] = [];

				const processMediaArray = (mediaArray?: Media[]) => {
					if (mediaArray) {
						for (const mediaItem of mediaArray) {
							const metadata = mediaMetadataMap.get(mediaItem.uri);
							if (metadata?.fileName) {
								mediaFileNames.push(metadata.fileName);
							} else {
								const uriParts = mediaItem.uri.split('/');
								mediaFileNames.push(uriParts[uriParts.length - 1]);
							}
						}
					}
				};

				processMediaArray(message.photos);
				processMediaArray(message.videos);
				processMediaArray(message.audio);

				messageInsert.run([
					message.conversation,
					message.sender_name,
					message.timestamp.toISOString(),
					message.content || null,
					message.isSystemMessage ? 1 : 0,
					mediaFileNames.length > 0 ? JSON.stringify(mediaFileNames) : null,
					message.reactions ? JSON.stringify(message.reactions) : null,
					message.share?.link || null,
				]);
				if (i % 1000 === 0 || i === allMessages.length - 1) {
					setExportProgress(60 + Math.round(((i + 1) / allMessages.length) * 30));
					await new Promise(resolve => setTimeout(resolve, 0));
				}
			}
			messageInsert.free();
			setExportProgress(90);

			setExportStatus("Serializing database...");
			const binaryArray = sqliteDb.export();
			sqliteDb.close();
			setExportProgress(95);

			const blob = new Blob([binaryArray], { type: "application/x-sqlite3" });
			setDownloadUrl(URL.createObjectURL(blob));

			setExportProgress(100);
			setExportStatus("Database ready for download!");
			setIsComplete(true);

		} catch (error) {
			console.error("Export error:", error);
			setExportStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
			setIsComplete(false);
		} finally {
			setIsExporting(false);
		}
	};

	const downloadDatabase = () => {
		if (!downloadUrl()) return;

		const a = document.createElement("a");
		a.href = downloadUrl();
		a.download = "instagram-data.sqlite";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<Layout>
			<div class="container mx-auto p-4">
				<div class="mb-6">
					<button
						class="text-gray-400 hover:text-white mb-4 flex items-center"
						onClick={() => navigate("/export")}
					>
						← Back to Export Options
					</button>
					<h1 class="text-4xl font-bold mb-4 text-white">SQLite Database Export</h1>
					<p class="text-gray-300">
						Export your data to a portable SQL file that you can import into any SQLite database.
					</p>
				</div>

				<Show when={!isComplete() && !isExporting()}>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
						<h3 class="text-xl font-semibold text-white mb-4">Generate SQL Database</h3>
						<p class="text-gray-300 mb-6">
							This will create a complete SQL dump of your imported Instagram data.
						</p>
						<button
							class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-colors"
							onClick={exportToSqlite}
						>
							Generate Database
						</button>
					</div>
				</Show>

				<Show when={isExporting()}>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
						<h3 class="text-xl font-semibold text-white mb-4">Generating Database...</h3>
						<div class="mb-4">
							<div class="bg-gray-700 rounded-full h-4 mb-2">
								<div
									class="bg-blue-600 h-4 rounded-full transition-all duration-300"
									style={`width: ${exportProgress()}%`}
								></div>
							</div>
							<p class="text-gray-300 text-sm">{exportProgress()}% - {exportStatus()}</p>
						</div>
					</div>
				</Show>

				<Show when={isComplete() && downloadUrl()}>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
						<div class="text-center">
							<h3 class="text-2xl font-semibold text-white mb-4">Download Ready!</h3>
							<p class="text-gray-300 mb-6">
								Your SQL database has been generated. Click the button below to download it.
							</p>
							<button
								class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition-colors text-lg"
								onClick={downloadDatabase}
							>
								Download SQL Database
							</button>
						</div>
					</div>
				</Show>
			</div>
		</Layout>
	);
};

export default SqliteExport;
