import { InstagramDatabase } from "../db/database";
import { User } from "../types/user";
import { findFile, loadFile } from "../utils";

export default async (files: File[], database: InstagramDatabase) => {
    const userFileData = await loadFile<any>(files, "/personal_information/personal_information.json");
    
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
        const pfp = findFile(files, pfpPath)!;

        const blob = new Blob([await pfp.arrayBuffer()], { type: 'image/jpeg' });
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
            reader.onloadend = () => {
                localStorage.setItem("pfp", reader.result as string);
                resolve();
            }
            reader.readAsDataURL(blob);
        });
    }
}