import { Show, createEffect, createSignal, onCleanup, type Component } from "solid-js";
import { db } from "@/db/database";
import { createMediaURL } from "@/utils/media";
import type { CachedAnalysis } from "@/types/analysis";
import type { User } from "@/types/user";
import type { PeopleFilter } from "@/components/analysis/analysisTypes";
import { InfoTooltip } from "@/components/analysis/AnalysisShared";

interface ProfileTabProps {
	user: User | null;
	analysis: CachedAnalysis;
	onOpenPeopleFilter: (filter: PeopleFilter) => void;
}

const mutedValue = (value: number | undefined) => (value === undefined ? "Unavailable" : value.toLocaleString());

const initialsFor = (user: User | null) => {
	const value = user?.name || user?.username || "S";
	return value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
};

const ProfileAvatar: Component<{ user: User | null; size?: "large" | "small" }> = (props) => {
	const [photoUrl, setPhotoUrl] = createSignal<string | null>(null);

	createEffect(() => {
		let active = true;
		let objectUrl: string | null = null;
		const photoUri = props.user?.profilePhotoUri;

		if (!photoUri) {
			setPhotoUrl(null);
			onCleanup(() => {
				active = false;
			});
			return;
		}

		void (async () => {
			const metadata = await db.media_metadata.get(photoUri);
			if (!metadata) return;
			objectUrl = await createMediaURL(metadata);
			if (active) {
				setPhotoUrl(objectUrl);
			} else if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		})();

		onCleanup(() => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		});
	});

	const sizeClass = () => (props.size === "small" ? "h-12 w-12 text-base" : "h-28 w-28 text-3xl");

	return (
		<Show
			when={photoUrl()}
			fallback={
				<div
					class={`flex shrink-0 items-center justify-center rounded-full border border-purple/60 bg-[linear-gradient(145deg,rgba(255,110,196,0.22),rgba(120,115,245,0.2))] font-semibold text-gray-100 ${sizeClass()}`}
				>
					{initialsFor(props.user)}
				</div>
			}
		>
			<img
				src={photoUrl()!}
				alt="Profile"
				class={`shrink-0 rounded-full border border-purple/60 object-cover ${sizeClass()}`}
			/>
		</Show>
	);
};

const ProfileTab: Component<ProfileTabProps> = (props) => (
	<section class="space-y-5">
		<div>
			<h1 class="font-sans text-3xl font-semibold tracking-tight text-white">Profile</h1>
			<p class="mt-2 text-gray-400">Identity and connection counts from this data package.</p>
		</div>

		<div class="overflow-hidden rounded-lg border border-purple/40 bg-[radial-gradient(circle_at_100%_0%,rgba(120,115,245,0.1),transparent_12rem),rgba(24,24,24,0.92)]">
			<div class="px-6 py-7 sm:px-9">
				<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
						<ProfileAvatar user={props.user} />
						<div>
							<h2 class="font-sans text-2xl font-semibold text-white">{props.user?.name || "Unavailable"}</h2>
							<p class="mt-1 text-gray-400">
								{props.user?.username ? `@${props.user.username}` : "Username unavailable"}
							</p>
							<p class="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-6 text-gray-300">
								{props.user?.bio || "Bio unavailable"}
							</p>
						</div>
					</div>
				</div>

				<div class="mt-8 grid gap-3 sm:grid-cols-2">
					<button
						type="button"
						class="w-full cursor-pointer rounded-lg border border-purple/55 border-t-[3px] bg-gray-900/90 p-4 text-left transition-colors hover:border-purple hover:bg-purple/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
						onClick={() => props.onOpenPeopleFilter("followers")}
					>
						<span class="block text-2xl font-semibold text-gray-100">
							{mutedValue(props.analysis.followers)}
						</span>
						<span class="mt-1 block text-sm text-gray-400">
							Followers{" "}
							<InfoTooltip
								label="Followers"
								description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
							/>{" "}
							<span class="text-purple">→</span>
						</span>
					</button>
					<button
						type="button"
						class="w-full cursor-pointer rounded-lg border border-pink/55 border-t-[3px] bg-gray-900/90 p-4 text-left transition-colors hover:border-pink hover:bg-pink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
						onClick={() => props.onOpenPeopleFilter("following")}
					>
						<span class="block text-2xl font-semibold text-gray-100">
							{mutedValue(props.analysis.following)}
						</span>
						<span class="mt-1 block text-sm text-gray-400">
							Following{" "}
							<InfoTooltip
								label="Following"
								description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
							/>{" "}
							<span class="text-purple">→</span>
						</span>
					</button>
				</div>
			</div>
		</div>
	</section>
);

export default ProfileTab;
