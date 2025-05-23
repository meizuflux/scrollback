import { createSignal, Show, type Component } from "solid-js";
import { createStore } from "solid-js/store";
import { findFile, loadFile, extractZipToFiles } from "../utils";
import { User } from "../types/user";
import { importData } from "../import/import";

const Home: Component = () => {
	const [isImporting, setIsImporting] = createSignal(false);
	const [importProgress, setImportProgress] = createSignal(0);
	const [currentStep, setCurrentStep] = createSignal("");

	const loadUser = async (fileList: File[]) => {
		const userFileData = await loadFile<any>(fileList, "/personal_information/personal_information.json");

		const user: User = {
			username: userFileData.profile_user[0].string_map_data.Username?.value,
			name: userFileData.profile_user[0].string_map_data.Name?.value,
			email: userFileData.profile_user[0].string_map_data.Email?.value,
			bio: userFileData.profile_user[0].string_map_data.Bio?.value,
			gender: userFileData.profile_user[0].string_map_data.Gender?.value,
			privateAccount: new Boolean(userFileData.profile_user[0].string_map_data["Private Account"]?.value),
			dateOfBirth: new Date(userFileData.profile_user[0].string_map_data["Date of birth"]?.value),
		};

		localStorage.setItem("user", JSON.stringify(user));

		// TODO: figure out if this could technically be skipped if the rest of the data is imported too fast
		const pfpPath = userFileData.profile_user[0].media_map_data["Profile Photo"]?.uri;
		if (pfpPath) {
			const pfp = findFile(fileList, pfpPath)!;

			const reader = new FileReader();
			reader.onloadend = function () {
				const dataUrl = reader.result as string;
				localStorage.setItem("pfp", dataUrl);
			};

			reader.readAsDataURL(pfp);
		}
	};

	const handleFiles = async (files: FileList) => {
		const fileArray = Array.from(files);
		
		setIsImporting(true);
		setImportProgress(0);
		
		try {
			let processedFiles: File[];
			
			// Check if it's a zip file
			if (fileArray.length === 1 && fileArray[0].name.endsWith('.zip')) {
				setCurrentStep("Extracting zip file...");
				setImportProgress(5);
				processedFiles = await extractZipToFiles(fileArray[0]);
			} else {
				processedFiles = fileArray;
			}
			
			setCurrentStep("Loading user data...");
			setImportProgress(10);
			await loadUser(processedFiles);
			
			setCurrentStep("Importing data...");
			setImportProgress(20);
			await importData(processedFiles, (progress, step) => {
				setImportProgress(20 + (progress * 0.8)); // Scale to 20-100%
				setCurrentStep(step);
			});

			localStorage.setItem("loaded", "true");
			setImportProgress(100);
			setCurrentStep("Complete!");
			
			window.location.reload();
		} catch (error) {
			console.error("Import failed:", error);
			setIsImporting(false);
		}
	};

	return (
		<>
			<div class="container mx-auto p-4">
				<h1 class="text-3xl font-bold mb-4">Data Upload</h1>
				
				<Show when={isImporting()}>
					<div class="mb-6 p-4 bg-blue-50 rounded-lg">
						<div class="mb-2 text-sm font-medium text-blue-700">{currentStep()}</div>
						<div class="w-full bg-blue-200 rounded-full h-2.5">
							<div 
								class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
								style={`width: ${importProgress()}%`}
							></div>
						</div>
						<div class="mt-1 text-xs text-blue-600">{Math.round(importProgress())}%</div>
					</div>
				</Show>
				
				<div class="space-y-4">
					{/* Folder Upload */}
					<div class="upload-zone border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
						<input
							type="file"
							/* @ts-expect-error */ // webkitdirectory isn't supported in JSX :shrug:
							webkitdirectory
							directory
							multiple
							id="folderPicker"
							class="hidden"
							disabled={isImporting()}
							onChange={(e) => handleFiles(e.currentTarget.files!)}
						/>
						<label for="folderPicker" class={`cursor-pointer block ${isImporting() ? 'opacity-50 cursor-not-allowed' : ''}`}>
							<div class="text-lg font-medium mb-2">📁 Upload Folder</div>
							<div class="text-sm text-gray-600">
								{isImporting() ? 'Importing...' : 'Click to select your Instagram data folder'}
							</div>
						</label>
					</div>

					<div class="text-center text-gray-500 font-medium">OR</div>

					{/* Zip File Upload */}
					<div class="upload-zone border-2 border-dashed border-gray-300 p-8 text-center rounded-lg">
						<input
							type="file"
							accept=".zip"
							id="zipPicker"
							class="hidden"
							disabled={isImporting()}
							onChange={(e) => handleFiles(e.currentTarget.files!)}
						/>
						<label for="zipPicker" class={`cursor-pointer block ${isImporting() ? 'opacity-50 cursor-not-allowed' : ''}`}>
							<div class="text-lg font-medium mb-2">📦 Upload Zip File</div>
							<div class="text-sm text-gray-600">
								{isImporting() ? 'Importing...' : 'Click to select your Instagram data zip file'}
							</div>
						</label>
					</div>
				</div>
			</div>
		</>
	);
};

export default Home;
