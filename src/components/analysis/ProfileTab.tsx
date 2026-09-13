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
					class={`flex shrink-0 items-center justify-center rounded-full border border-[#4A4A4A] bg-[#303030] font-semibold text-[#F2F2F2] ${sizeClass()}`}
				>
					{initialsFor(props.user)}
				</div>
			}
		>
			<img
				src={photoUrl()!}
				alt="Profile"
				class={`shrink-0 rounded-full border border-[#303030] object-cover ${sizeClass()}`}
			/>
		</Show>
	);
};

const ProfileTab: Component<ProfileTabProps> = (props) => (
	<section class="space-y-5">
		<div>
			<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
				Your account
			</p>
			<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">Profile</h1>
			<p class="mt-2 text-[#A3A3A3]">Identity and connection counts from this data package.</p>
		</div>

		<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
			<div class="px-6 py-7 sm:px-9">
				<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
						<ProfileAvatar user={props.user} />
						<div>
							<h2 class="text-2xl font-semibold text-[#F2F2F2]">{props.user?.name || "Unavailable"}</h2>
							<p class="mt-1 text-[#A3A3A3]">
								{props.user?.username ? `@${props.user.username}` : "Username unavailable"}
							</p>
							<p class="mt-3 max-w-xl whitespace-pre-wrap text-sm leading-6 text-[#D4D4D4]">
								{props.user?.bio || "Bio unavailable"}
							</p>
						</div>
					</div>
				</div>

				<div class="mt-8 grid gap-3 sm:grid-cols-2">
					<button
						type="button"
						class="w-full rounded-lg border border-[#303030] bg-[#181818] p-4 text-left transition-colors hover:border-[#7873F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
						onClick={() => props.onOpenPeopleFilter("followers")}
					>
						<span class="block text-2xl font-semibold text-[#F2F2F2]">
							{mutedValue(props.analysis.followers)}
						</span>
						<span class="mt-1 block text-sm text-[#A3A3A3]">
							Followers{" "}
							<InfoTooltip
								label="Followers"
								description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
							/>{" "}
							<span class="text-[#7873F5]">→</span>
						</span>
					</button>
					<button
						type="button"
						class="w-full rounded-lg border border-[#303030] bg-[#181818] p-4 text-left transition-colors hover:border-[#7873F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
						onClick={() => props.onOpenPeopleFilter("following")}
					>
						<span class="block text-2xl font-semibold text-[#F2F2F2]">
							{mutedValue(props.analysis.following)}
						</span>
						<span class="mt-1 block text-sm text-[#A3A3A3]">
							Following{" "}
							<InfoTooltip
								label="Following"
								description="This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
							/>{" "}
							<span class="text-[#7873F5]">→</span>
						</span>
					</button>
				</div>
			</div>
		</div>
	</section>
);

export default ProfileTab;
