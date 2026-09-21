import { Show, createEffect, createSignal, onCleanup, type Component } from "solid-js";
import { db } from "@/db/database";
import { createMediaURL } from "@/utils/media";
import type { CachedAnalysis } from "@/types/analysis";
import type { User } from "@/types/user";
import { PageHeading, Panel } from "@/components/ui";
import { ActionPanel } from "@/components/analysis/Metrics";

interface ProfileTabProps {
	user: User | null;
	analysis: CachedAnalysis;
}

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

	const sizeClass = () => (props.size === "small" ? "h-12 w-12 text-base" : "h-24 w-24 text-3xl sm:h-28 sm:w-28");

	return (
		<Show
			when={photoUrl()}
			fallback={
				<div
					class={`flex shrink-0 items-center justify-center rounded-full border border-purple-line bg-raised font-semibold text-gray-100 ${sizeClass()}`}
				>
					{initialsFor(props.user)}
				</div>
			}
		>
			<img
				src={photoUrl()!}
				alt="Profile"
				class={`shrink-0 rounded-full border border-purple-line object-cover ${sizeClass()}`}
			/>
		</Show>
	);
};

const ProfileTab: Component<ProfileTabProps> = (props) => {
	const relationshipTooltip =
		"This may be different than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data.";

	return (
		<section class="space-y-5">
			<PageHeading title="Profile" description="Identity and connection counts from this data package." />

			<Panel variant="raised" class="p-6 sm:p-8">
				<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<ProfileAvatar user={props.user} />
						<div class="min-w-0">
							<h2 class="font-sans text-2xl font-semibold tracking-tight text-gray-100">
								{props.user?.name || "Unavailable"}
							</h2>
							<p class="mt-1 text-gray-400">
								{props.user?.username ? `@${props.user.username}` : "Username unavailable"}
							</p>
							<Show when={props.user?.bio}>
								<p class="mt-3 max-w-xl whitespace-pre-wrap font-space-grotesk text-sm leading-6 text-gray-300">
									{props.user?.bio}
								</p>
							</Show>
						</div>
					</div>
				</div>

				<div class="mt-7 mb-6 h-px w-full border-0 bg-edge" aria-hidden="true" />

				<div class="grid gap-4 sm:grid-cols-2">
					<ActionPanel
						label="Followers"
						value={props.analysis.followers}
						description={relationshipTooltip}
						accent="blue"
						actionLabel="View people"
						href="/analysis/people?relationship=followers"
					/>
					<ActionPanel
						label="Following"
						value={props.analysis.following}
						description={relationshipTooltip}
						accent="pink"
						actionLabel="View people"
						href="/analysis/people?relationship=following"
					/>
				</div>
			</Panel>
		</section>
	);
};

export default ProfileTab;
