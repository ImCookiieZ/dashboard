CREATE TABLE IF NOT EXISTS tokens
(
    id SERIAL PRIMARY KEY,
    access_token VARCHAR(4096) NOT NULL,
    refresh_token VARCHAR(4096) NOT NULL,
    expires_at VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_data
(
  guid VARCHAR(40) PRIMARY KEY,
  username VARCHAR(16) NOT NULL UNIQUE,
  passcode VARCHAR(16) NOT NULL,
  reddit_tokens integer,
  spotify_tokens integer,
  discord_tokens integer,
  github_tokens integer,
  twitch_tokens integer,
  teams_tokens integer,
  CONSTRAINT fk_reddit
    FOREIGN KEY(reddit_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_spotify
    FOREIGN KEY(spotify_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_discord
    FOREIGN KEY(discord_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_github
    FOREIGN KEY(github_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_twitch
    FOREIGN KEY(twitch_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_teams
    FOREIGN KEY(teams_tokens)
        REFERENCES tokens(id)
        ON DELETE CASCADE
);

INSERT INTO user_data (guid, username, passcode) VALUES ('pg_administrator', 'admin', 'nfd90/fawe8=f#a-');

CREATE TABLE IF NOT EXISTS access_tokens
(
  guid VARCHAR(40) PRIMARY KEY,
  user_id VARCHAR(40) NOT NULL,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
        REFERENCES user_data(guid)
        ON DELETE CASCADE
);

INSERT INTO access_tokens (guid, user_id) VALUES ('f0643a12-88e2-4fc7-9ad9-ba7e13bd7a36', 'pg_administrator');

CREATE TABLE IF NOT EXISTS services
(
  id SERIAL PRIMARY KEY,
  servicename VARCHAR(25) NOT NULL
);

INSERT INTO services (servicename) VALUES ('reddit'), ('spotify'), ('discord'), ('github'), ('teams'), ('twitch');

CREATE TABLE IF NOT EXISTS sorting
(
    id SERIAL PRIMARY KEY,
    sorting_name VARCHAR(10) NOT NULL
);

INSERT INTO sorting (sorting_name) VALUES ('new'), ('best'), ('hot'), ('rising'), ('top');

CREATE TABLE IF NOT EXISTS base_config
(
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(40) NOT NULL,
  service_id INT NOT NULL,
  timer_seconds INT NOT NULL,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
        REFERENCES user_data(guid)
        ON DELETE CASCADE,
  CONSTRAINT fk_service
    FOREIGN KEY(service_id)
        REFERENCES services(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_subreddit
(
  id SERIAL PRIMARY KEY,
  subreddit VARCHAR(100) NOT NULL,
  sort_id INT NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_sorting
    FOREIGN KEY(sort_id)
        REFERENCES sorting(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_feed
(
  id SERIAL PRIMARY KEY,
  sort_id INT NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE,
  CONSTRAINT fk_sorting
    FOREIGN KEY(sort_id)
        REFERENCES sorting(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_actions
(
  id SERIAL PRIMARY KEY,
  owner VARCHAR(40) NOT NULL,
  repo VARCHAR(40) NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_messages
(
  id SERIAL PRIMARY KEY,
  sorting_new BOOLEAN NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_channels
(
  id SERIAL PRIMARY KEY,
  sorting_type VARCHAR(15) NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config_server
(
  id SERIAL PRIMARY KEY,
  sorting_type VARCHAR(15) NOT NULL,
  admin_only BOOLEAN NOT NULL,
  base_config_id INT NOT NULL,
  CONSTRAINT fk_base_config
    FOREIGN KEY(base_config_id)
        REFERENCES base_config(id)
        ON DELETE CASCADE
);

-- CREATE TABLE IF NOT EXISTS config_play
-- (
--   id SERIAL PRIMARY KEY,
--   sort INT NOT NULL,
--   volume INT NOT NULL,
--   last_title VARCHAR(100) NOT NULL,
--   last_performer VARCHAR(100) NOT NULL,
--   base_config_id INT NOT NULL,
--   CONSTRAINT fk_base_config
--     FOREIGN KEY(base_config_id)
--         REFERENCES base_config(id)
--         ON DELETE CASCADE
-- );
