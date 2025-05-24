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

export interface TimestampedValue<T = boolean> {
	value: T;
	timestamp?: Date;
}

// TODO: adjust for timezone
export interface StoredUser {
	username: string;
	blocked?: TimestampedValue; // you blocked them
	close_friends?: TimestampedValue; // on close friends list
	requested_to_follow_you?: TimestampedValue; // they requested to follow you
	follower?: TimestampedValue; // they follow you
	following?: TimestampedValue; // you follow them
	hidden_story_from?: TimestampedValue; // you hide them from seeing your story
	pending_follow_request?: TimestampedValue; // ie, you requested to follow them and they haven't yet accepted
	recently_unfollowed?: TimestampedValue; // you recently unfollowed them
	stories_liked?: number; // number of stories you liked from this user
}

export interface ProfileChange {
	changed: string;
	previousValue: string;
	newValue: string;
	timestamp: Date;
}




