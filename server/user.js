const Helper = require('./helpServer.js')
const { v4: uuidv4 } = require('uuid');


async function create_user(req, res, db_adm_conn) {
    var user_username = req.body['name']
    var user_passcode = req.body['password']
    var guid = uuidv4();

    if (Helper.test_undefined([user_username, user_passcode]) === false) {
        res.status(400).send("Error: Bad request")
        return
    }
    var existing = await db_adm_conn.query(`
    SELECT * FROM user_data WHERE username = '${Helper.escape(user_username)} '`)
    if (existing.rows.length > 0) {
        res.status(401).send("username already existing")
        return
    }
    var ret = await db_adm_conn.query(`
    INSERT INTO user_data
        (guid, username, passcode)
    VALUES
        ('` + Helper.escape(guid) + `', '` + Helper.escape(user_username) + `', '` + Helper.escape(user_passcode) + `') RETURNING guid;`)
    var guid_ret = await Helper.give_access(ret.rows[0].guid, db_adm_conn)
    if (guid_ret.status === 500)
        res.status(guid_ret.status).send(guid_ret.message)
    else
        res.send({ access_token: guid_ret.message })
}

async function get_basic_user(req, res, db_adm_conn) {
    await db_adm_conn.query(`
    SELECT username
    FROM user_data`, (err, result) => {
        if (err)
            res.status(400).send("Error:" + err)
        else {
            res.status(200).send({ users: result.rows })
        }
    })
}

async function get_advanced_user(req, res, db_adm_conn) {
    var user_username = req.query['name']
    var user_passcode = req.query['password']
    var token = req.headers.authorization
    if (Helper.test_undefined([token, user_username, user_passcode]) === false) {
        res.status(400).send("Error: Bad request")
        return
    }
    var values = await Helper.check_adm(token, user_username, user_passcode, db_adm_conn)
    if (values.status != 200) {
        res.status(values.status).send(values.message)
        return
    }
    await db_adm_conn.query(`
    SELECT UD.guid AS user_id, UD.username, UD.passcode,
    TS.access_token AS spotify_access, TS.refresh_token AS spotify_refresh,
    TG.access_token AS github_access, TG.refresh_token AS github_refresh,
    TR.access_token AS reddit_access, TR.refresh_token AS reddit_refresh,
    TD.access_token AS discord_access, TD.refresh_token AS discord_refresh,
    TW.access_token AS twitch_access, TW.refresh_token AS twitch_refresh,
    TT.access_token AS teams_access, TT.refresh_token AS teams_refresh,
    AT.guid AS access_token
    FROM user_data UD
    Left JOIN access_tokens AT
        ON AT.user_id = UD.guid
    LEFT JOIN tokens TS
        ON TS.id = UD.spotify_tokens
    LEFT JOIN tokens TW
        ON TW.id = UD.twitch_tokens
    LEFT JOIN tokens TD
        ON TD.id = UD.discord_tokens
    LEFT JOIN tokens TG
        ON TG.id = UD.github_tokens
    LEFT JOIN tokens TT
        ON TT.id = UD.teams_tokens
    LEFT JOIN tokens TR
        ON TR.id = UD.reddit_tokens`, (err, result) => {
        if (err)
            res.status(400).send("Error:" + err)
        else {
            res.status(200).send({ users: result.rows })
        }
    })
}

async function get_login(req, res, db_adm_conn) {
    var username = req.query["name"]
    var password = req.query["password"]

    if (Helper.test_undefined([username, password]) === false) {
        res.status(400).send("Bad request!")
        return
    }
    const query = {
        text: "SELECT guid FROM user_data WHERE username = $1::text AND passcode = $2::text",
        values: [Helper.escape(username), Helper.escape(password)]
    }
    try {
        var result = await db_adm_conn.query(query)
        var rows = result.rows
        if (rows.length === 1) {
            var values = await Helper.get_access(username, db_adm_conn)
            res.status(values.status).send(values.message)
        } else {
            res.send({ message: "Wrong username or password!" })
        }
    } catch (err) {
        res.status(400).send("Error:" + err)
    }
}

async function delete_user(req, res, db_adm_conn) {
    var user_username = req.body['name']
    var user_id = req.body['user_id']
    var token = req.headers.authorization
    if (Helper.test_undefined([user_username, user_id, token]) === false) {
        res.status(400).send("Bad request!")
        return
    }
    values = await Helper.check_token(token, db_adm_conn)
    result = await db_adm_conn.query("SELECT username FROM user_data WHERE guid='" + Helper.escape(user_id) + "';")
    if (values.ret_value === false || values.line_value.rows[0].user_id != user_id
        || user_username === "admin" || result.rows[0].username != user_username) {
        console.log(values.ret_value)
        console.log(values.line_value)

        res.status(403).send("Error permission denied")
        return
    }
    await db_adm_conn.query("DELETE FROM user_data WHERE guid='" + Helper.escape(user_id) + "';")
    res.status(200).send("User deleted")
}

async function get_widgets(req, res, db_adm_conn) {
    var access_token = req.headers.authorization || null

    if (access_token === null) {
        res.status(403).send("no access_token")
        return
    }
    var user_id_check = await Helper.check_token(access_token, db_adm_conn)
    if (user_id_check.ret_value === false) {
        res.status(403).send("invalid access_token")
        return
    }
    var user_id = user_id_check.line_value.rows[0].user_id

    var subreddits = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CS.id, CS.subreddit, SO.sorting_name
    FROM config_subreddit CS
    JOIN base_config BC ON BC.id = CS.base_config_id
    JOIN sorting SO ON SO.id = CS.sort_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    var feeds = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CF.id, SO.sorting_name
    FROM config_feed CF
    JOIN base_config BC ON BC.id = CF.base_config_id
    JOIN sorting SO ON SO.id = CF.sort_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    var actions = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CA.id, CA.owner, CA.repo
    FROM config_actions CA
    JOIN base_config BC ON BC.id = CA.base_config_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    var messages = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CM.id, CM.sorting_new
    FROM config_messages CM
    JOIN base_config BC ON BC.id = CM.base_config_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    var channels = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CC.id, CC.sorting_type
    FROM config_channels CC
    JOIN base_config BC ON BC.id = CC.base_config_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    var server = await db_adm_conn.query(`
    SELECT BC.timer_seconds, SE.servicename, CD.id, CD.sorting_type, CD.admin_only
    FROM config_server CD
    JOIN base_config BC ON BC.id = CD.base_config_id
    JOIN services SE ON SE.id = BC.service_id
    WHERE BC.user_id = '${user_id}'`)
    res.send({
        user: user_id,
        subreddits: subreddits.rows,
        feeds: feeds.rows,
        actions: actions.rows,
        messages: messages.rows,
        channels: channels.rows,
        server: server.rows
    })
}

module.exports = { create_user, get_basic_user, get_advanced_user, get_login, delete_user, get_widgets }