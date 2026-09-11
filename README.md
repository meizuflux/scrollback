<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src/assets/logo.svg">
    <img src="src/assets/logo.svg" width="220" alt="Scrollback Logo">
  </picture>
</p>

<h1 align="center"><a href="https://scrollback.meizuflux.com">Scrollback</a></h1>

<p align="center">
    Analyze your Instagram data export. </br>
    All processing happens in the browser.
</p>

## Features

- Try the app with demo data before importing your own archive
- Import the original Instagram ZIP archive or select files from an extracted archive
- Explore highlights from your posts, stories, messages, likes, comments, and connections
- Search and filter people by relationship
- Search conversations and filter them by type or message count
- Review profile information and profile changes contained in the archive
- Export selected datasets as a portable SQLite database for further analysis

## Privacy

Your Instagram archive is processed locally and **does not leave your browser**. Structured data is stored in IndexedDB. Media is stored in the browser's Origin Private File System (OPFS) when available, with a mock filesystem in IndexedDB used as a fallback.

Your imported data remains available in that browser so you can return to it after refreshing the page. Use **Clear data** in the app to remove the imported database, cached analysis, import metadata, and stored media. Clearing the site's browser data will also remove it.

## How to Download Your Instagram Data

- Go to the [Instagram Account Center](https://accountscenter.instagram.com/info_and_permissions/)
- Click "Download your information"
- Select "All available information"
- Choose your preferred date range
- Select "Low" media quality for smaller file size and performance
- **IMPORTANT**: Make sure the format is set to JSON (not HTML)
- You'll be sent an email when your data package is ready for download

### Known Limitations

- Instagram frequently changes their data format
- Processing large datasets can be slow and memory/power-intensive
- Instagram's data export can be incomplete or contain inconsistencies
- Some features may not work on older browsers or mobile devices

## How it works

Scrollback accepts either the original ZIP or an extracted archive. ZIP files are unpacked in the browser.

The import is split into sections, like loading user data, messages, and media, all running in parallel.

Each importer finds it's associated files, normalizes the messy Instagram data into something usable, and records some first-pass analytics.

Structured records are written in batches to IndexedDB, and media is stored in OPFS when the browser supports it, with a mock filesystem in IndexedDB as a fallback. Once every importer finishes, the analysis pages can then load the prepared data package directly after a refresh.

Essentially, it turns the archive into a more usable data structure stored in the browser, which can then be easily analyzed.

## Development

### Run locally

```sh
bun install
bun run dev
```

Create a production build with `bun run build` and view with `bun run preview`.

### Demo fixture
To regenerate the demo data after changing the fixture generator, run:

```sh
bun run build:demo-data
bun run build
```

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
