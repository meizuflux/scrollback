import type { Component } from "solid-js";
import { useAnalysisData } from "@/components/analysis/analysisData";
import ProfileTab from "@/components/analysis/ProfileTab";

const ProfilePage: Component = () => {
	const { user, people, profileChanges, posts, contentCounts, engagementCounts } = useAnalysisData();
	return (
		<ProfileTab
			user={user()}
			people={people}
			profileChanges={profileChanges}
			posts={posts}
			contentCounts={contentCounts}
			engagementCounts={engagementCounts}
		/>
	);
};

export default ProfilePage;
