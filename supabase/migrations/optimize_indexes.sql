-- ============================================================
-- OPTIMIZE INDEXES: Fix missing indexes causing high Disk IO
-- Generated from full codebase query analysis
-- ============================================================
--
-- EXISTING INDEXES (already created in prior migrations):
--   notifications:       idx_notifications_user (user_id, read, created_at DESC)
--   stories:             idx_stories_user (user_id), idx_stories_expires (expires_at), idx_stories_created (created_at DESC)
--   story_views:         idx_story_views_story (story_id), idx_story_views_viewer (viewer_id)
--   story_reactions:     idx_story_reactions_story (story_id), idx_story_reactions_user (user_id)
--   feedback:            idx_feedback_status (status), idx_feedback_type (type), idx_feedback_created (created_at DESC)
--   profiles:            idx_profiles_verification (verification_status)
--   matches (partial):   idx_matches_accepted_sender (sender_user_id, status) WHERE status='accepted'
--   matches (partial):   idx_matches_accepted_receiver (receiver_user_id, status) WHERE status='accepted'
--   mascot_spotlights:   idx_mascot_spotlights_expires (expires_at DESC)
--   typing_indicators:   PRIMARY KEY (match_id, user_id) -- covers lookups
--   user_presence:        PRIMARY KEY (user_id) -- covers lookups
--

-- ════════════════════════════════════════════════════════════
-- TABLE: animals
-- The most queried table in the app. Queried on almost every page.
-- ════════════════════════════════════════════════════════════

-- animals.created_by: used in 20+ queries across profile, feed, flairer,
-- assistant, limits, export, admin, animals/[id], onboarding-reminder, etc.
-- Pattern: .eq("created_by", userId) -- always combined with user lookup
CREATE INDEX IF NOT EXISTS idx_animals_created_by
  ON animals(created_by);

-- animals.created_by + created_at DESC: the most common composite pattern.
-- Used on profile, feed, flairer, stories/create, admin -- every time user's
-- animals are loaded they are ordered by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_animals_created_by_created_at
  ON animals(created_by, created_at DESC);

-- animals.species: used for filtering on /animals, /carte, /flairer, admin
-- Pattern: .eq("species", species)
CREATE INDEX IF NOT EXISTS idx_animals_species
  ON animals(species);

-- animals.canton: used for feed (nearby animals), animaux/[canton], carte, digest email
-- Pattern: .eq("canton", myCanton)
CREATE INDEX IF NOT EXISTS idx_animals_canton
  ON animals(canton);

-- animals.status: used in digest email, listAnimals service
-- Pattern: .eq("status", "disponible")
CREATE INDEX IF NOT EXISTS idx_animals_status
  ON animals(status);

-- animals.created_at DESC: used for ordering in /animals, /feed, PromoSection, admin
-- Pattern: .order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_animals_created_at_desc
  ON animals(created_at DESC);

-- animals.next_vaccine_date: used in vaccine reminder cron job and daily notifications
-- Pattern: .gte("next_vaccine_date", now).lte("next_vaccine_date", sevenDaysFromNow)
-- Pattern: .eq("next_vaccine_date", weekStr)
CREATE INDEX IF NOT EXISTS idx_animals_next_vaccine_date
  ON animals(next_vaccine_date);

-- animals.last_vet_visit: used in daily notifications for overdue vet visits
-- Pattern: .not("last_vet_visit", "is", null).lt("last_vet_visit", sixStr)
CREATE INDEX IF NOT EXISTS idx_animals_last_vet_visit
  ON animals(last_vet_visit)
  WHERE last_vet_visit IS NOT NULL;

-- animals.canton + created_at: used in animaux/[canton] and feed for geo-filtered lists
-- Pattern: .eq("canton", X).order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_animals_canton_created_at
  ON animals(canton, created_at DESC);

-- animals.photo_url IS NOT NULL: used in PromoSection and promo page to find animals with photos
-- Pattern: .not("photo_url", "is", null).order("created_at", { ascending: false }).limit(20)
CREATE INDEX IF NOT EXISTS idx_animals_has_photo
  ON animals(created_at DESC)
  WHERE photo_url IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- TABLE: profiles
-- Second most queried table. Queried on every authenticated page load.
-- ════════════════════════════════════════════════════════════

-- profiles.id is the PRIMARY KEY so no extra index needed for .eq("id", userId)

-- profiles.email: used in auth actions, admin reports, handle_new_user
-- Pattern: .eq("email", email)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);

-- profiles.stripe_customer_id: used in webhook handler for payment events
-- Pattern: .eq("stripe_customer_id", customerId) -- 4+ queries in webhook route
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- profiles.subscription: used in admin stats for counting premium/pro users
-- Pattern: .eq("subscription", "premium"), .eq("subscription", "pro")
CREATE INDEX IF NOT EXISTS idx_profiles_subscription
  ON profiles(subscription);

-- profiles.created_at: used in admin stats for daily/weekly/monthly signups
-- Pattern: .gte("created_at", todayStart), .gte("created_at", weekStart)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON profiles(created_at);

-- profiles.role: used in admin checks across multiple routes
-- Pattern: .select("role, email").eq("id", user.id) -- covered by PK but role is checked
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role)
  WHERE role = 'admin';

-- profiles.onboarding_reminder_sent + created_at: used in onboarding reminder cron
-- Pattern: .eq("onboarding_reminder_sent", false).lt("created_at", cutoff)
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_reminder
  ON profiles(created_at)
  WHERE onboarding_reminder_sent = false;

-- profiles.referred_by: used in referral/share pages
-- Pattern: .eq("referred_by", referral_code)
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON profiles(referred_by)
  WHERE referred_by IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- TABLE: matches
-- Heavy query load: checked on every flairer swipe, match page, feed, stats
-- ════════════════════════════════════════════════════════════

-- matches.sender_animal_id + receiver_animal_id: used to check if a match
-- already exists before creating a new one (sendMatch service)
-- Pattern: .eq("sender_animal_id", X).eq("receiver_animal_id", Y)
CREATE INDEX IF NOT EXISTS idx_matches_animal_pair
  ON matches(sender_animal_id, receiver_animal_id);

-- matches.sender_user_id: used for getting user's matches, counting daily matches
-- Pattern: .eq("sender_user_id", userId)
CREATE INDEX IF NOT EXISTS idx_matches_sender_user_id
  ON matches(sender_user_id);

-- matches.receiver_user_id: used for getting user's matches
-- Pattern: .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
CREATE INDEX IF NOT EXISTS idx_matches_receiver_user_id
  ON matches(receiver_user_id);

-- matches.sender_user_id + created_at: used for daily match limit checks
-- Pattern: .eq("sender_user_id", userId).gte("created_at", today)
CREATE INDEX IF NOT EXISTS idx_matches_sender_created_at
  ON matches(sender_user_id, created_at);

-- matches.created_at: used for ordering matches, admin stats, feed recent matches
-- Pattern: .order("created_at", { ascending: false })
-- Pattern: .gte("created_at", todayStart) in admin stats
CREATE INDEX IF NOT EXISTS idx_matches_created_at
  ON matches(created_at);

-- matches.status: used for filtering pending/accepted matches in multiple places
-- Pattern: .eq("status", "pending"), .eq("status", "accepted")
CREATE INDEX IF NOT EXISTS idx_matches_status
  ON matches(status);

-- matches: reverse lookup for mutual match detection
-- Pattern: .eq("sender_animal_id", receiverAnimalId).eq("receiver_animal_id", senderAnimalId).eq("status", "pending")
CREATE INDEX IF NOT EXISTS idx_matches_reverse_pending
  ON matches(sender_animal_id, receiver_animal_id, status)
  WHERE status = 'pending';


-- ════════════════════════════════════════════════════════════
-- TABLE: messages
-- Queried on every chat page load and for unread count badges
-- ════════════════════════════════════════════════════════════

-- messages.match_id: the primary lookup key for loading conversation messages
-- Pattern: .eq("match_id", matchId).order("created_at", { ascending: true })
CREATE INDEX IF NOT EXISTS idx_messages_match_id
  ON messages(match_id, created_at);

-- messages.sender_id: used for counting user's messages, daily limit check
-- Pattern: .eq("sender_id", userId)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON messages(sender_id);

-- messages.sender_id + created_at: used for daily message limit checks
-- Pattern: .eq("sender_id", userId).gte("created_at", today)
CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
  ON messages(sender_id, created_at);

-- messages.read_at IS NULL: used for marking messages as read and counting unread
-- Pattern: .eq("match_id", matchId).neq("sender_id", userId).is("read_at", null)
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(match_id, sender_id)
  WHERE read_at IS NULL;


-- ════════════════════════════════════════════════════════════
-- TABLE: blocks
-- Queried on flairer page and animals page for every page load
-- ════════════════════════════════════════════════════════════

-- blocks.blocker_id: used to get who I blocked
-- Pattern: .eq("blocker_id", user.id)
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id
  ON blocks(blocker_id);

-- blocks.blocked_id: used to get who blocked me
-- Pattern: .eq("blocked_id", user.id)
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id
  ON blocks(blocked_id);

-- blocks: composite for checking specific block relationships
-- Pattern: .eq("blocker_id", user.id).eq("blocked_id", blocked_user_id)
CREATE INDEX IF NOT EXISTS idx_blocks_pair
  ON blocks(blocker_id, blocked_id);


-- ════════════════════════════════════════════════════════════
-- TABLE: events + event_participants
-- ════════════════════════════════════════════════════════════

-- events.event_date: used to filter upcoming events on every events page load
-- Pattern: .gte("event_date", new Date().toISOString()).order("event_date", { ascending: true })
CREATE INDEX IF NOT EXISTS idx_events_event_date
  ON events(event_date);

-- events.canton: used for filtering events by location
-- Pattern: .eq("canton", filterCanton)
CREATE INDEX IF NOT EXISTS idx_events_canton
  ON events(canton);

-- events.created_by: foreign key for event organizer joins
CREATE INDEX IF NOT EXISTS idx_events_created_by
  ON events(created_by);

-- event_participants.event_id: used for counting participants per event (N+1 pattern!)
-- Pattern: .eq("event_id", event.id)
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id
  ON event_participants(event_id);

-- event_participants.user_id: used for checking if user joined an event
-- Pattern: .eq("user_id", userId)
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id
  ON event_participants(user_id);

-- event_participants: composite for checking specific participation
-- Pattern: .eq("event_id", eventId).eq("user_id", profile.id)
CREATE INDEX IF NOT EXISTS idx_event_participants_event_user
  ON event_participants(event_id, user_id);


-- ════════════════════════════════════════════════════════════
-- TABLE: mood_entries
-- Queried on every animal detail/care page for mood tracking
-- ════════════════════════════════════════════════════════════

-- mood_entries.animal_id: the primary lookup key for mood entries
-- Pattern: .eq("animal_id", animalId).order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_mood_entries_animal_id
  ON mood_entries(animal_id, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- TABLE: push_subscriptions
-- Queried for sending push notifications
-- ════════════════════════════════════════════════════════════

-- push_subscriptions.user_id: used to find user's push subscriptions
-- Pattern: .eq("user_id", userId)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- push_subscriptions.endpoint: used for cleanup of expired subscriptions
-- Pattern: .eq("endpoint", sub.endpoint)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint
  ON push_subscriptions(endpoint);


-- ════════════════════════════════════════════════════════════
-- TABLE: reports
-- Queried in admin dashboard
-- ════════════════════════════════════════════════════════════

-- reports.status: used in admin to filter pending reports
-- Pattern: .eq("status", "pending").order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports(status, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- TABLE: mascot_spotlights (supplement existing index)
-- ════════════════════════════════════════════════════════════

-- mascot_spotlights.user_id + created_at: used for cooldown check
-- Pattern: .eq("user_id", user.id).gt("created_at", oneDayAgo)
CREATE INDEX IF NOT EXISTS idx_mascot_spotlights_user_created
  ON mascot_spotlights(user_id, created_at DESC);


-- ════════════════════════════════════════════════════════════
-- ANALYZE: Update statistics for the query planner after creating indexes
-- ════════════════════════════════════════════════════════════
ANALYZE animals;
ANALYZE profiles;
ANALYZE matches;
ANALYZE messages;
ANALYZE blocks;
ANALYZE events;
ANALYZE event_participants;
ANALYZE mood_entries;
ANALYZE push_subscriptions;
ANALYZE reports;
ANALYZE mascot_spotlights;
