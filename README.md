# Scrollback

Scrollback is a web app that lets you analyze and view your Instagram data export.

All processing happens in the browser. Parsed data is stored locally in IndexedDB and OPFS.

## Run locally

```sh
bun install
bun run dev
```

Create a production build with `bun run build`.

## How it works

Scrollback accepts either the original ZIP or an extracted archive. ZIP files are unpacked in the browser.

The import is split into sections, like loading user data, messages, and media, all running in parallel.

Each importer finds it's associated files, normalizes the messy Instagram data into something usable, and records some first-pass analytics.

Structured records are written in batches to IndexedDB through Dexie. Media is stored in OPFS when the browser supports it, with a mock filesystem in IndexedDB as a fallback. Once every importer finishes, the analysis pages can then load the prepared snapshot directly after a refresh.

Essentially, it turns the archive into a more usable data structure stored in the browser, which can then be easily analyzed.

## Instagram archive structure

TODO: add some automated scripting to inspect my own data package, provide annotations, and create docs for the normal format since right now there isn't any


```py
instagram-package
├───media
    ├───stories
        ├─── #contains list of folders, same for below
    ├───recently_deleted
    ├───posts
    ├───archived_posts
    ├───other
├───your_instagram_activity
    ├───subscriptions
    ├───story_interactions
        ├───story_likes.json
        ├───polls.json
        ├───emoji_sliders.json
    ├───saved
        ├───saved_posts.json
    ├───other_activity
        ├───your_information_download_requests.json
    ├───monetization
        ├───eligibility.json
    ├───messages
        ├───inbox
            ├───contains list of conversations
        ├───photos # can probably use these to reference?
    ├───media # can probably cross reference with the other media folder
        ├───stories.json
        ├───recently_deleted_content.json
        ├───profile_photos.json
        ├───posts_1.json
        ├───archived_posts.json
    ├───likes
        ├───liked_posts.json
    ├───comments
        ├───post_comments_1.json
├───security_and_login_information
    ├───login_and_profile_creation
        ├───signup_details.json
        ├───profile_status_changes.json
        ├───profile_privacy_changes.json
        ├───login_activity.json
        ├───last_known_location.json
├───preferences
├───personal_information
    ├───information_about_you
        ├───profile_based_in.json
        ├───locations_of_interest.json
├───logged_information
    ├───recent_searches
        ├───profile_searches.json
├───connections
    ├───followers_and_following
        ├───removed_suggestions.json
        ├───recently_unfollowed_profiles.json
        ├───recent_follow_requests.json
        ├───pending_follow_requests.json
        ├───hide_story_from.json
        ├───following.json
        ├───followers_1.json
        ├───follow_requests_you_ve_received.json
        ├───close_friends.json
        ├───blocked_profiles.json
    ├───contacts
        ├───synced_contacts.json
├───apps_and_websites_off_of_instagram
├───ads_information
    ├───ads_and_topics
        ├───videos_watched.json
        ├───profiles_you_re_not_interested_in.json
        ├───posts_you_re_not_interested_in.json
        ├───posts_viewed.json
        ├───ads_viewed.json
```
