import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { findFile, loadFile } from '../utils';
import { User } from '../types/user';
import { importData } from '../import/import';

const Home: Component = () => {
    // TODO: move this out of this file
    const loadUser = async (fileList: File[]) => {
        const userFileData = await loadFile<any>(fileList, '/personal_information/personal_information.json');

        const user: User = {
            username: userFileData.profile_user[0].string_map_data.Username?.value,
            name: userFileData.profile_user[0].string_map_data.Name?.value,
            email: userFileData.profile_user[0].string_map_data.Email?.value,
            bio: userFileData.profile_user[0].string_map_data.Bio?.value,
            gender: userFileData.profile_user[0].string_map_data.Gender?.value,
            privateAccount: new Boolean(userFileData.profile_user[0].string_map_data['Private Account']?.value),
            dateOfBirth: new Date(userFileData.profile_user[0].string_map_data['Date of birth']?.value)
        }

        localStorage.setItem('user', JSON.stringify(user));
        
        // TODO: figure out if this could technically be skipped if the rest of the data is imported too fast
        const pfpPath = userFileData.profile_user[0].media_map_data["Profile Photo"]?.uri;
        if (pfpPath) {
            const pfp = findFile(fileList, pfpPath)!;

            const reader = new FileReader();
            reader.onloadend = function () {
                const dataUrl = reader.result as string;
                localStorage.setItem('pfp', dataUrl);
            };

            reader.readAsDataURL(pfp);
        }

    }


    const handleFiles = async (files: FileList) => {
        const fileArray = Array.from(files)
        
        await loadUser(fileArray)
        await importData(fileArray)

        localStorage.setItem("loaded", "true")

        window.location.reload()
    }


    return (
        <>
            <div class="container mx-auto p-4">
                <h1 class="text-3xl font-bold mb-4">Folder Upload</h1>
                    <div class="upload-zone border-2 border-dashed border-gray-300 p-8 text-center rounded-lg mb-4">
                        <input type="file" 
                        /* @ts-expect-error */ // webkitdirectory isn't supported in JSX :shrug:
                        webkitdirectory directory multiple id="folderPicker" class="hidden" onChange={(e) => handleFiles(e.currentTarget.files)}/>
                        <label for="folderPicker" class="cursor-pointer">
                            Click to select folder
                        </label>
                    </div>
            </div>
        </>
    )
}

export default Home;