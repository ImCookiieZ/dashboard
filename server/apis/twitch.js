const client_secret = "ds8golzt022vtpz70o8erlxthdei0b"
const client_id = "30o6vog6b7nigqnnxyo6iajz70cvnu"
const redirect_uri = "http://localhost:8080/twitch/callback"
const Helper = require('../helpServer.js')
const request = require('request');
const querystring = require('querystring');

async function update_channels(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false
        || (sorting !== "viewer_small" && sorting !== "name" && sorting !== "viewer_high")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_channels", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`
    UPDATE config_channels SET sorting_type = '${sorting}'
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_channels(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_channels", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_channels WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function create_message_widgets(req, res, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false ||
        (sorting !== "viewer_small" && sorting !== "name" && sorting !== "viewer_high")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send("Invalid Token")
        return
    }
    var base_id_vals = await Helper.create_base_config(values.line_value.rows[0].user_id, "twitch", timer, db_adm_conn)
    if (base_id_vals.ret_value === false) {
        res.status(500).send(base_id_vals.line_value)
    }
    var re = await db_adm_conn.query(`
    INSERT INTO config_channels (sorting_type, base_config_id)
    VALUES ('${sorting}', ${base_id_vals.line_value.rows[0].id})
    RETURNING id`)
    res.send({ config_id: re.rows[0].id })
}

async function get_twitch_token(access_token, db_adm_conn) {

    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        return { status: 403, message: "Invalid Token" }
    }
    var ret = await db_adm_conn.query(`
    SELECT T.access_token
    FROM user_data UD
    LEFT JOIN tokens T ON T.id = UD.twitch_tokens
    WHERE UD.guid = '${Helper.escape(values.line_value.rows[0].user_id)}'`)
    var token = ret.rows[0].access_token
    if (token === null)
        return { status: 401, message: "Not connected to Teams" }
    return { status: 200, message: ret.rows[0].access_token }
}
function get_res(data, timer, sorting_type) {
    var res = []
    for (var i = 0; i < data.length; i++) {
        var tmp = {
            username: data[i]['user_name'],
            game: data[i]['game_name'],
            title: data[i]['title'],
            viewer: data[i]['viewer_count']
        }
        res.push(tmp)
    }
    if (sorting_type === "viewer_small")
        res.sort(function (a, b) {
            return a.viewer - b.viewer
        });
    if (sorting_type === "name")
        res.sort(function (a, b) {
            return a.username.toLowerCase() - b.username.toLowerCase()
        });
    return ({ timer: timer, sorting_type: sorting_type, data: res })
}

async function get_live_channels(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_channels", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var twitch_token_values = await get_twitch_token(access_token, db_adm_conn)
    if (twitch_token_values.status !== 200) {
        res.status(twitch_token_values.status).send(twitch_token_values.message)
        return twitch_token_values
    }
    var twitch_token = twitch_token_values.message

    var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_channels CM ON CM.base_config_id = BC.id
    WHERE CM.id = ${id}`)

    var sorting_type = db_res.rows[0].sorting_type
    var timer = db_res.rows[0].timer_seconds
    var authOptions = {
        // url: 'https://api.twitch.tv/helix/streams/followed/?user_id=101807347',
        url: 'https://api.twitch.tv/helix/users',
        headers: {
            'Authorization': `Bearer ${twitch_token}`,
            'Client-ID': client_id
            // 'Accept': 'application/vnd.twitchtv.v5+json'
        },
        json: true
    };
    request.get(authOptions, (err, response, body) => {
        if (!err && response.statusCode === 200) {
            var user_id = body['data'][0]['id']
            var authOptions2 = {
                url: 'https://api.twitch.tv/helix/streams/followed/?user_id=' + user_id,
                // url: 'https://api.twitch.tv/helix/users',
                headers: {
                    'Authorization': `Bearer ${twitch_token}`,
                    'Client-ID': client_id
                    // 'Accept': 'application/vnd.twitchtv.v5+json'
                },
                json: true
            };
            // res.send(body)
            request.get(authOptions2, (err2, response2, body2) => {
                if (!err2 && response2.statusCode === 200) {
                    res.send(get_res(body2['data'], timer, sorting_type))
                } else {
                    console.log("inner")
                    console.log(body2)
                    res.status(response2.statusCode).send(body2)
                }
            })
        } else {
            console.log(body)
            res.status(response.statusCode).send(body)
        }
    })
}

async function add_twitch_tokens(access_token, twitch_access_token, twitch_refresh_token, expires_in, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in

    try {
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at) 
    VALUES ('${Helper.escape(twitch_access_token)}', '${Helper.escape(twitch_refresh_token)}', '${expires_at}')
    RETURNING id;`)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET twitch_tokens = ` + ret.rows[0].id + ` 
    WHERE guid = '` + Helper.escape(user_id) + `';`);
        return { ret_value: true, line_value: ret.rows[0].id }
    } catch (err) {
        console.log(err.stack)
        return { ret_value: false, line_value: err.stack }
    }
}

async function get_access_token(req, res, db_adm_conn) {
    var code = req.query.code || null;
    var state = req.query.state || null;

    if (state === null || code === null) {
        console.log("state and/or code is null")
        res.status(400).send("Bad request")
    } else {
        var authOptions = {
            url: 'https://id.twitch.tv/oauth2/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
                client_id: client_id,
                client_secret: client_secret
            },
            headers: {
            },
            json: true
        };

        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token,
                    refresh_token = body.refresh_token,
                    expires_in = body.expires_in;
                var ret = await add_twitch_tokens(state, access_token, refresh_token, expires_in, db_adm_conn)
                if (ret.ret_value === true) {
                    res.redirect('http://localhost:3000/login')
                    // res.send({ access_token: access_token, refresh_token: refresh_token })
                } else {
                    console.log(re.line_value)
                    res.status(500).send(ret.line_value)
                }
            } else {
                res.status(403).send("Invalid Token")
            }
        });
    }
}

async function refresh_access_token(user_id, db_adm_conn) {
    var lines = await db_adm_conn.query(`
    SELECT T.refresh_token, T.id
    FROM user_data UD
    JOIN access_tokens AT ON AT.user_id = UD.guid
    LEFT JOIN tokens T ON T.id = UD.twitch_tokens
    WHERE UD.guid = '` + user_id + `';`)

    var refresh_token = lines.rows[0].refresh_token
    var id = lines.rows[0].id
    var authOptions = {
        url: 'https://id.twitch.tv/oauth2/token',
        form: {
            grant_type: 'refresh_token',
            client_id: client_id,
            client_secret: client_secret,
            refresh_token: refresh_token
        },
        headers: {
        },
        json: true
    };
    request.post(authOptions, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var access_token_twitch = body.access_token;
            var expires_at = Math.round(((new Date()).getTime()) / 1000) + body.expires_in - 2
            var rets = await db_adm_conn.query(`
            UPDATE tokens
            SET (access_token, expires_at) = ('${Helper.escape(access_token_twitch)}', ${expires_at})
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

module.exports = { get_access_token, get_live_channels, create_message_widgets, update_channels, delete_channels, refresh_access_token }
