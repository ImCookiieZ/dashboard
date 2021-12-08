const { Client } = require('pg');
const Vigenere = require('./vigenere/vigenere.js')
const { v4: uuidv4 } = require('uuid');

function connect() {
    let db_adm_conn;
    db_adm_conn = new Client({
        connectionString: 'postgres://' + process.env.DB_USER + ':' + process.env.DB_PASSWORD + '@db/postgres'
    });
    db_adm_conn.on('error', error => {
        connect();
    });
    db_adm_conn.connect().catch(() => { connect() });
    return db_adm_conn
}

async function get_about(req, res, db_adm_conn) {
    res.send(
        {
            client: {
                host: req.socket.remoteAddress.substring(req.socket.remoteAddress.lastIndexOf(':') + 1)
            },
            server: {
                current_time: Math.round((new Date()).getTime() / 1000),
                services: [{
                    name: "discord",
                    widgets: [{
                        name: "serverlist",
                        description: "show current server and if you are the owner",
                        params: [{
                            name: "admin_only",
                            type: "string"
                        }, {
                            name: "sorting_type",
                            type: "string"
                        }]
                    }]
                }, {
                    name: "github",
                    widgets: [{
                        name: "workflow-actions",
                        description: "shows running github actions and their results",
                        params: [{
                            name: "owner",
                            type: "string"
                        }, {
                            name: "repo",
                            type: "string"
                        }]
                    }]
                }, {
                    name: "reddit",
                    widgets: [{
                        name: "subreddit-page",
                        description: "shows you post from given subreddit",
                        params: [{
                            name: "subreddit",
                            type: "string"
                        }, {
                            name: "sorting_type",
                            type: "string"
                        }]
                    }, {
                        name: "feed",
                        description: "shows you post from your feed",
                        params: [{
                            name: "sorting_type",
                            type: "string"
                        }]
                    }]
                }, {
                    name: "spority",
                    widgets: []
                }, {
                    name: "teams",
                    widgets: [{
                        name: "private messages",
                        description: "see your last private messages",
                        params: [{
                            name: "sorting_type",
                            type: "string"
                        }]
                    }]
                }, {
                    name: "twitch",
                    widgets: [{
                        name: "online channels",
                        description: "see online channels which you follow",
                        params: [{
                            name: "sorting_type",
                            type: "string"
                        }]
                    }]
                }]
            }
        }
    )
}

async function check_token_for_id(token, id, table, db_adm_conn) {
    res = await db_adm_conn.query(`
    SELECT *
    FROM user_data UD
    JOIN access_tokens T ON T.user_id = UD.guid
    JOIN base_config B ON B.user_id = UD.guid
    JOIN ${table} V ON V.base_config_id = B.id
    WHERE V.id = ${id} 
    AND T.guid = '${escape(token)}'`)
    return res.rows.length
}


function escape(argument) {
    argument = argument.replace("'", "''")
    return argument
}


function test_undefined(args) {
    for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === "undefined") {
            console.log("arg nr. " + i + " is undefined")
            return false
        }
    }
    return true
}

async function give_access(user_id, db_adm_conn) {
    if (test_undefined([user_id]) === false) {
        return { status: 400, message: "Error: Bad request" }
    }
    try {
        var guid = uuidv4();
        await db_adm_conn.query(`
    INSERT INTO access_tokens
    (guid, user_id) VALUES ('` + escape(guid) + `', '` + escape(user_id) + `');
    `)
        return { status: 200, message: guid }
    } catch (err) {
        console.log(err.stack)
        return { status: 500, message: "Error: " + err }
    }
}

async function get_access(username, db_adm_conn) {
    if (test_undefined([username]) === false) {
        return { status: 400, message: "Error: Bad request" }
    }
    try {
        var ret = await db_adm_conn.query(`
    SELECT AT.guid
    FROM access_tokens AT 
    JOIN user_data UD
    ON AT.user_id = UD.guid
    WHERE UD.username = '` + escape(username) + `';`)
        return { status: 200, message: ret.rows[0].guid }
    } catch (err) {
        console.log(err.stack)
        return { status: 500, message: "Error: " + err }
    }
}

async function check_token(access_token, db_adm_conn) {
    var line
    var ret
    try {
        line = await db_adm_conn.query("SELECT user_id FROM access_tokens WHERE guid='" + escape(access_token) + "';")
        if (line.rows.length === 1)
            ret = true
        else {
            ret = false
            line = "user not found"
        }
    }
    catch (err) {
        console.log(err.stack)
        line = err.stack
        ret = false
    }
    return { ret_value: ret, line_value: line };
}

async function get_sort_id(sort_name, db_adm_conn) {
    var ret
    var line
    try {
        line = await db_adm_conn.query(`
        SELECT id
        FROM sorting
        WHERE sorting_name = '` + escape(sort_name) + `';`)
        ret = true
    }
    catch (err) {
        ret = false
        line = err.stack
    }
    return { ret_value: ret, line_value: line };
}

async function create_base_config(user_id, service_name, timer_seconds, db_adm_conn) {
    var ret
    var line
    try {
        var service_rows = await db_adm_conn.query(`SELECT id FROM services WHERE servicename='` + escape(service_name) + `';`)
        var service_id = service_rows.rows[0].id
        line = await db_adm_conn.query(`
    INSERT INTO base_config (user_id, service_id, timer_seconds)
    VALUES ('` + escape(user_id) + "', '" + service_id + "', " + timer_seconds + ") RETURNING id;")
        ret = true
    }
    catch (err) {
        ret = false
        line = err.stack
    }
    return { ret_value: ret, line_value: line };
}

async function check_adm(token, user_name, adm_passcode, db_adm_conn) {
    var re = await db_adm_conn.query(`
    SELECT U.username
    FROM user_data U
    JOIN access_tokens T ON T.user_id = U.guid
    WHERE U.username = '${escape(user_name)}' AND U.passcode = '${escape(adm_passcode)}' AND T.guid = '${escape(token)}'`)
    if (re.rows.length !== 1 || re.rows[0].username !== user_name || user_name !== "admin") {
        return { status: 403, message: "Error permission denied" }
    }
    // res = await db_adm_conn.query("SELECT passcode FROM user_data WHERE guid='pg_administrator';")
    // passcode = res.rows[0].passcode
    // var check = Vigenere.decode(adm_passcode, passcode)
    // const now_check = new Date(Date.now())
    // if (now_check.toISOString.substring(0, 10) != check.substring(0, 10)) {
    //     return {status: 403, message: "Error permission denied"}
    // }
    return { status: 200, message: "Authenticated" }
}

async function update_tokens(access_token, spotify_token, discord_token, reddit_token) {
    var values = await check_token(access_token)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value

    await db_adm_conn.query(`UPDATE user set'` + escape(service_name) + `';`)

}


// const date1 = new Date(Date.now());
// console.log(date1.toISOString().substring(0, 18))
// const date2 = new Date("2021-11-23T15:22:35.324Z")
// console.log(date2.toISOString().substring(0, 18))

module.exports = { connect, escape, get_access, test_undefined, check_token, get_sort_id, create_base_config, give_access, check_adm, get_about, check_token_for_id }
