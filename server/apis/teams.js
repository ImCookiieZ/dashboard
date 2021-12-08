const request = require('request');


const client_id = '45d1c53d-2175-4c44-b3da-9c1e08e8a937';
const client_secret = "dWL7Q~CjopE7bCdgaJg5Dko5kJsUME0ItQAzs"//"7ee7b41d-21bb-431d-b933-6d25020e02fe"
const redirect_uri = 'http://localhost:8080/teams/callback';
const Helper = require('../helpServer.js');
const querystring = require('querystring');

async function update_messages(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false ||
        (sorting !== "old" && sorting !== "new")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_messages", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`
    UPDATE config_messages SET sorting_new = ${sorting == "new"}
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_messages(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_messages", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_messages WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function create_message_widgets(req, res, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false ||
        (sorting !== "old" && sorting !== "new")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send("Invalid Token")
        return
    }
    var base_id_vals = await Helper.create_base_config(values.line_value.rows[0].user_id, "teams", timer, db_adm_conn)
    if (base_id_vals.ret_value === false) {
        res.status(500).send(base_id_vals.line_value)
    }
    var re = await db_adm_conn.query(`
    INSERT INTO config_messages (sorting_new, base_config_id)
    VALUES (${sorting == "new"}, ${base_id_vals.line_value.rows[0].id})
    RETURNING id`)
    res.send({ config_id: re.rows[0].id })
}

async function get_teams_token(access_token, db_adm_conn) {

    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        return { status: 403, message: "Invalid Token" }
    }
    var ret = await db_adm_conn.query(`
    SELECT T.access_token
    FROM user_data UD
    LEFT JOIN tokens T ON T.id = UD.teams_tokens
    WHERE UD.guid = '${Helper.escape(values.line_value.rows[0].user_id)}'`)
    var token = ret.rows[0].access_token
    if (token === null)
        return { status: 401, message: "Not connected to Teams" }
    return { status: 200, message: ret.rows[0].access_token }
}

async function get_messages_from_chat(res, access_token, ids, messages, sorting_new, timer) {
    var reqBuild = {
        url: `https://graph.microsoft.com/v1.0/me/chats/${ids.shift()}/messages`,
        headers: {
            'Authorization': `Bearer ${access_token}`
        },
        json: true
    };
    request.get(reqBuild, (err, response, body) => {
        for (var i = 0; i < response.body.value.length; i++) {
            var cur = response.body.value[i]
            var mes = { type: cur.body.contentType, text: cur.body.content, name: cur.from.user.displayName, time: cur.createdDateTime }
            // if (mes.type !== "text")
            //     mes.text = "Embeded Source"
            messages.push(mes)
        }
        if (ids.length > 0)
            get_messages_from_chat(res, access_token, ids, messages, sorting_new, timer)
        else {
            messages.sort(function (a, b) {
                var dateA = new Date(a.time), dateB = new Date(b.time)
                if (sorting_new)
                    return dateB - dateA
                return dateA - dateB
            });
            res.send({ timer: timer, sorting_type: sorting_new, messages: messages })
        }
    })
}

async function get_messages(req, res, id, db_adm_conn) {
    try {
        var access_token = req.headers.authorization
        if (Helper.test_undefined([access_token]) === false) {
            res.status(400).send("Bad Request")
            return
        }
        if (await Helper.check_token_for_id(access_token, id, "config_messages", db_adm_conn) !== 1) {
            res.status(403).send("Invalid Access token")
            return
        }
        var values = await get_teams_token(access_token, db_adm_conn)
        if (values.status !== 200) {
            res.send(values.status).send(values.message)
            return values
        }
        var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_messages CM ON CM.base_config_id = BC.id
    WHERE CM.id = ${id}`)

        var sorting_new = db_res.rows[0].sorting_new
        var timer = db_res.rows[0].timer_seconds

        var authOptions = {
            url: 'https://graph.microsoft.com/v1.0/me/chats/',
            headers: {
                'Authorization': `Bearer ${values.message}`
            },
            json: true
        };
        request.get(authOptions, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                var ids = []
                for (var i = 0; i < response.body.value.length; i++) {
                    if (response.body.value[i].chatType == "oneOnOne") {
                        ids.push(response.body.value[i].id)
                    }
                }
                get_messages_from_chat(res, values.message, ids, [], sorting_new, timer)
            } else {
                if (!err) {
                    console.log(response.statusCode)
                    if (!(!response.body))
                        console.log(response.body)
                    res.status(401).send("invalid teams token")
                }
                else {
                    res.status(500).send("internal server error")
                }
            }
        })
    } catch (err) {
        console.log(err.stack)
    }
}

async function refresh_access_token(user_id, db_adm_conn) {
    var lines = await db_adm_conn.query(`
    SELECT T.refresh_token, T.id
    FROM user_data UD
    JOIN access_tokens AT ON AT.user_id = UD.guid
    LEFT JOIN tokens T ON T.id = UD.teams_tokens
    WHERE UD.guid = '` + user_id + `';`)

    var refresh_token = lines.rows[0].refresh_token
    var id = lines.rows[0].id
    var authOptions = {
        url: 'https://login.microsoftonline.com/901cb4ca-b862-4029-9306-e5cd0f6d9f86/oauth2/v2.0/token',
        form: {
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
            client_id: client_id,
            client_secret: client_secret
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        json: true
    };
    request.post(authOptions, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var access_token_teams = body.access_token;
            var refresh_token_dc = body.refresh_token;
            var expires_at = Math.round(((new Date()).getTime()) / 1000) + body.expires_in - 2
            var rets = await db_adm_conn.query(`
            UPDATE tokens
            SET (access_token, expires_at) = ('${Helper.escape(access_token_teams)}', ${expires_at})
            WHERE id = ` + id + ` RETURNING access_token;`)
            console.log(rets.rows[0].access_token)
        } else {
            if (typeof err !== "undefined") {
                console.log(err.stack)
            } else {
                console.log(response.statusCode)
                console.log(response.statusMessage)
                console.log("Invalid Token")
            }
        }
    })

}

async function add_teams_tokens(access_token, teams_access_token, teams_refresh_token, expires_in, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in

    try {
        var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at) 
    VALUES ('${Helper.escape(teams_access_token)}', '${Helper.escape(teams_refresh_token)}', '${expires_at}')
    RETURNING id;`)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET teams_tokens = ` + ret.rows[0].id + ` 
    WHERE guid = '` + user_id + `';`);
        return { ret_value: true, line_value: ret.rows[0].id }
    } catch (err) {
        console.log(err.stack)
        return { ret_value: false, line_value: err.stack }
    }
}

async function get_access_token(req, res, db_adm_conn) {
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null) {
        console.log("state is null")
        res.status(400).send("Bad request")
    } else {
        var authOptions = {
            url: 'https://login.microsoftonline.com/901cb4ca-b862-4029-9306-e5cd0f6d9f86/oauth2/v2.0/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
                client_id: client_id,
                client_secret: client_secret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            json: true
        };
        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token,
                    refresh_token = body.refresh_token,
                    expires_in = body.expires_in;
                var ret = await add_teams_tokens(state, access_token, refresh_token, expires_in, db_adm_conn)
                if (ret.ret_value === true) {
                    var access_token = req.query['state'] || null;
                    if (access_token === null) {
                        res.status(400).send("Missing access_token")
                        return
                    }
                    res.redirect('http://127.0.0.1:8080/twitch/login?' +
                        querystring.stringify({
                            access_token: access_token
                        }))
                } else {
                    console.log(re.line_value)
                    res.status(500).send(ret.line_value)
                }
            } else {
                if (typeof error != "undefined") {
                    console.log(error.stack)
                    res.status(500)
                } else {
                    console.log(response.statusCode)
                    if (typeof response.body != "undefined")
                        console.log(response.body)
                    res.status(403).send("Invalid Token")
                }
            }
        });
    }
}

module.exports = { get_access_token, refresh_access_token, get_messages, create_message_widgets, update_messages, delete_messages }