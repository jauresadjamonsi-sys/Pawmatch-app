-- ============================================================
-- Notification Triggers for PawBand
-- Automatic notifications via PostgreSQL triggers
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. NEW MATCH TRIGGER
--    When a match row is updated to status = 'accepted',
--    notify both the sender and receiver users.
--    (The codebase uses status 'accepted' for mutual matches.)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN

    -- Notification for the receiver
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.receiver_user_id,
      'match',
      'Nouveau match!',
      'Tu as un nouveau match. Va le découvrir!',
      '/matches'
    );

    -- Notification for the sender
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.sender_user_id,
      'match',
      'Nouveau match!',
      'Tu as un nouveau match. Va le découvrir!',
      '/matches'
    );

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_mutual_match ON matches;
CREATE TRIGGER trg_notify_mutual_match
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mutual_match();


-- ────────────────────────────────────────────────────────────
-- 2. NEW MESSAGE TRIGGER
--    When a message is inserted, notify the conversation
--    partner (the other user in the match, not the sender).
--    The body contains the first 50 characters of the message.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_user_id uuid;
  v_receiver_user_id uuid;
  v_body text;
BEGIN
  -- Look up the match to find both users
  SELECT sender_user_id, receiver_user_id
    INTO v_sender_user_id, v_receiver_user_id
    FROM matches
   WHERE id = NEW.match_id;

  -- If the match is not found, skip silently
  IF v_sender_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine the recipient: the user who is NOT the message sender
  IF NEW.sender_id = v_sender_user_id THEN
    v_recipient_id := v_receiver_user_id;
  ELSIF NEW.sender_id = v_receiver_user_id THEN
    v_recipient_id := v_sender_user_id;
  ELSE
    -- sender_id does not match either user in the match; skip
    RETURN NEW;
  END IF;

  -- Skip if sender = recipient (self-match edge case)
  IF NEW.sender_id = v_recipient_id THEN
    RETURN NEW;
  END IF;

  -- Truncate message content to 50 characters for the notification body
  v_body := left(NEW.content, 50);

  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_recipient_id,
    'message',
    'Nouveau message',
    v_body,
    '/matches/' || NEW.match_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();


-- ────────────────────────────────────────────────────────────
-- 3. WELCOME NOTIFICATION
--    When a new profile is created, send a welcome
--    notification to the new user.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_new_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id,
    'system',
    'Bienvenue sur PawBand!',
    'Ajoute ton premier animal et commence à flairer!',
    '/profile/animals/new'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_welcome ON profiles;
CREATE TRIGGER trg_notify_welcome
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_profile();
