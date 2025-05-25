export interface User {
	username: string;
	name: string;
	email: string;
	bio: string;
	gender: string;
	privateAccount: Boolean;
	dateOfBirth: Date;
	basedIn: string;
	locationsOfInterest: string[];
	videosWatched: number;
	notInterestedProfiles: number;
	notInterestedPosts: number;
	postsViewed: number;
	adsViewed: number
}

export interface ProfileChange {
	changed: string;
	previousValue: string;
	newValue: string;
	timestamp: Date;
}




