import type { Component } from "solid-js";
import { useAnalysisData } from "@/components/analysis/analysisData";
import ProfileTab from "@/components/analysis/ProfileTab";

const ProfilePage: Component = () => {
	const { analysis, user } = useAnalysisData();
	return <ProfileTab user={user()} analysis={analysis} />;
};

export default ProfilePage;
