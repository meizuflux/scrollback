# data package explorer


essentially, here's how this should work
- user uploads files
- files are analyzed and data is stored in memory
- after that, data can optionally be persisted in the indexeddb
- from there, data is loaded from the indexeddb when page is refreshed

folder structure:
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
