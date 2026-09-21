/** Labeled "Profile based in" fields from the export. */
export interface ProfileBasedIn {
	city?: string;
	region?: string;
	country?: string;
}

export interface User {
	username: string;
	name: string;
	/** URI from the Instagram export that identifies the stored profile photo. */
	profilePhotoUri?: string;
	email: string;
	bio: string;
	gender: string;
	privateAccount: boolean;
	dateOfBirth: Date;
	basedIn: ProfileBasedIn | null;
	locationsOfInterest: string[];
	/** Activity counts are undefined when the export file was absent. */
	videosWatched?: number;
	notInterestedProfiles?: number;
	notInterestedPosts?: number;
	postsViewed?: number;
	adsViewed?: number;
}

export interface ProfileChange {
	changed: string;
	previousValue: string;
	newValue: string;
	timestamp: Date;
}
