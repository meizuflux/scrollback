import './style.css'
import { importUsers, importMessages } from './import/import.ts';
import { showAnalysis } from './analysis.ts';

//indexedDB.deleteDatabase("ConnectionsDB"); // TODO: remove once done

const setup = localStorage.getItem("setup");

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
    <div class="container mx-auto p-4">
        <h1 class="text-3xl font-bold mb-4">Folder Upload</h1>
        
        ${setup ? `
            <div>
                <button id="clearData" class="bg-red-500 text-white px-4 py-2 rounded">Clear Data</button>
            </div>
        ` : `
            <div class="upload-zone border-2 border-dashed border-gray-300 p-8 text-center rounded-lg mb-4">
                <input type="file" webkitdirectory directory multiple id="folderPicker" class="hidden" />
                <label for="folderPicker" class="cursor-pointer">
                    Click to select folder
                </label>
            </div>
        `}

        <label for="status" class="text-lg font-semibold" id="status">Status: Waiting for upload</label><br />
        <button id="viewAnalysis" class="bg-blue-500 text-white px-4 py-2 rounded mt-4 ${setup ? "hover:bg-blue-600 cursor-pointer" : "cursor-not-allowed opacity-50"}" ${setup ? "" : "disabled"}>Run and View Analysis</button>

        
        <div id="fileList" class="mt-4"></div>
    </div>
`;

// Handle folder selection
const folderPicker = document.getElementById('folderPicker') as HTMLInputElement
const fileList = document.getElementById('fileList')! as HTMLDivElement
const statusLabel = document.getElementById('status')! as HTMLLabelElement
const viewAnalysis = document.getElementById('viewAnalysis')! as HTMLButtonElement
viewAnalysis.addEventListener("click", showAnalysis)

// Process files
function handleFiles(files: FileList) {
    statusLabel.textContent = 'Status: Processing files...';

    fileList.innerHTML = '<h2 class="text-xl font-semibold mb-2">Selected Files:</h2>';
    const fileTree = document.createElement('ul');
    fileTree.className = 'pl-4';

    const request = indexedDB.open('db', 1);

    request.onupgradeneeded = (_event) => {
        const db = request.result;
        db.createObjectStore('users', { keyPath: 'username' });
        db.createObjectStore('messages', { keyPath: 'id' });
    };


    importMessages(files, statusLabel);
    importUsers(files, statusLabel);

    Array.from(files).forEach(file => {
        const item = document.createElement('li');
        item.className = 'mb-1';
        item.textContent = file.webkitRelativePath;
        fileTree.appendChild(item);
    });

    // Find and read personal information file
    const personalInfoFile = Array.from(files).find(file => 
        file.webkitRelativePath.endsWith('/personal_information/personal_information.json')
    );
    console.log(personalInfoFile)
    interface StringMapData {
        Username?: { value: string };
        Name?: { value: string };
        Email?: { value: string };
        Bio?: { value: string };
        Gender?: { value: string };
        //'Date of birth'?: { value: string };
        'Private Account'?: { value: string };
    }
    //personal_info_data = JSON.parse(e.target?.result as string).profile_user[0].string_map_data;
    let personal_info_data: StringMapData = {};
    
    if (personalInfoFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = JSON.parse(e.target?.result as string);
            console.log(result)
            personal_info_data = result.profile_user[0].string_map_data;
        };
        reader.readAsText(personalInfoFile);
    }

    console.log(personal_info_data)

    const user = {
        username: personal_info_data.Username?.value,
        name: personal_info_data.Name?.value,
        email: personal_info_data.Email?.value,
        bio: personal_info_data.Bio?.value,
        gender: personal_info_data.Gender?.value,
        //date_of_birth: new Date(personal_info_data['Date of birth']!.value),
        private_account: new Boolean(personal_info_data['Private Account']?.value),
    }
    console.log(user)
    localStorage.setItem('user', JSON.stringify(user));



    
    fileList.appendChild(fileTree);
    viewAnalysis.disabled = false;
    viewAnalysis.classList.remove('opacity-50', "cursor-not-allowed");
    viewAnalysis.classList.add("cursor-pointer", "hover:bg-blue-600");

    localStorage.setItem("setup", "true");
}

// Event listeners
folderPicker?.addEventListener('change', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.files) {
        handleFiles(e.target.files);
    }
});

document.getElementById('clearData')?.addEventListener('click', () => {
    indexedDB.deleteDatabase("db");
    localStorage.removeItem("setup");
    location.reload();
});

