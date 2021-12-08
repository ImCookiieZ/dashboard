const request = require('request');
const Axios = require("axios");


const client_id = '913921745835159622';
const client_secret = "nPmHla0Ne1E-Hwfk6Pr8gF1XwMcijoG3"
const redirect_uri = 'http://127.0.0.1:8080/discord/callback';
const Helper = require('../helpServer.js')
const querystring = require('querystring');

async function update_server(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting_type = req.body['sorting_type']
    var timer = req.body['timer']
    var admin_only = req.body['admin_only']

    if (Helper.test_undefined([access_token, sorting_type, timer, admin_only]) === false || Number.isInteger(timer) == false
        || (admin_only !== "true" && admin_only !== "false") ||
        (sorting_type !== "name_small" && sorting_type !== "name_high" && sorting_type !== "none")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_server", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`
    UPDATE config_server SET (sorting_type, admin_only) = ('${sorting_type}', ${admin_only === "true"})
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_server(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_server", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_server WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function get_discord_token(access_token, db_adm_conn) {

    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        return values
    }
    var ret = await db_adm_conn.query(`
    SELECT T.access_token
    FROM user_data UD
    LEFT JOIN tokens T ON T.id = UD.discord_tokens
    WHERE UD.guid = '${Helper.escape(values.line_value.rows[0].user_id)}'`)
    return { ret_value: true, line_value: ret.rows[0].access_token }
}

function build_res(data, sorting_type, admin_only, timer) {
    {
        var ar = []
        for (var i = 0; i < data.length; i++) {
            var tmp = {
                name: data[i]['name'],
                owner: data[i]['owner']
            }
            if (!admin_only || tmp.owner)
                ar.push(tmp)
        }
        if (sorting_type === "name_small") {
            ar.sort(function (a, b) {
                return a.name - b.name
            });
        }
        else if (sorting_type === "name_high") {
            ar.sort(function (a, b) {
                return b.name - a.name
            });
        }
        var ob = {
            server_number: ar.length,
            timer: timer,
            server_names: ar
        }
        return ob

    }
}

async function create_server_config(access_token, sorting_type, admin_only, timer, db_adm_conn) {
    var value = await Helper.check_token(access_token, db_adm_conn)
    if (value.ret_value === false) {
        return { ret_value: 403, line_value: value.line_value }
    }
    var user_id = value.line_value.rows[0].user_id
    var values = await Helper.create_base_config(user_id, "discord", timer, db_adm_conn)
    if (values.ret_value === false)
        return { ret_value: 500, line_value: values.line_value }
    var re = await db_adm_conn.query(`
    INSERT INTO config_server (sorting_type, admin_only, base_config_id)
    VALUES ('${Helper.escape(sorting_type)}', ${admin_only}, ${values.line_value.rows[0].id})
    RETURNING id`)
    return { ret_value: 200, line_value: re.rows[0].id }
}

async function create_server(req, res, db_adm_conn) {
    let access_token = req.headers.authorization
    let sorting_type = req.body['sorting_type']
    let admin_only = req.body['admin_only']
    let timer = req.body['timer']

    if (Helper.test_undefined([access_token, admin_only, sorting_type, timer]) === false
        || Number.isInteger(timer) == false || (admin_only !== "true" && admin_only !== "false") ||
        (sorting_type !== "name_small" && sorting_type !== "name_high" && sorting_type !== "none")) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await get_discord_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send(values.line_value)
        return
    }
    var access_token_dc = values.line_value
    var reqBuild = {
        url: 'https://discord.com/api/v8/users/@me/guilds', form: null,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + access_token_dc
        },
        json: true
    };
    request.get(reqBuild, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var t = await create_server_config(access_token, sorting_type, admin_only === "true", timer, db_adm_conn)
            res.status(t.ret_value).send({ config_id: t.line_value })
        } else {
            if (typeof err != "undefined")
                console.log(err.stack)
            // if (!response.body.retry_after) {
            res.status(403).send(response.body)
            // }
        }
    })
}

async function get_server(req, res, id, db_adm_conn) {
    let access_token = req.headers.authorization

    if (Helper.test_undefined([access_token, id]) === false) {
        res.status(400).send("Bad Request")
        return
    }

    if (await Helper.check_token_for_id(access_token, id, "config_server", db_adm_conn) !== 1) {
        res.status(401).send("Invalid Access token")
        return
    }
    var values = await get_discord_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(401).send(values.line_value)
        return
    }

    var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_server CS ON CS.base_config_id = BC.id
    WHERE CS.id = ${id}`)

    var admin_only = db_res.rows[0].admin_only
    var sorting_type = db_res.rows[0].sorting_type
    var timer = db_res.rows[0].timer_seconds

    var access_token_dc = values.line_value
    var reqBuild = {
        url: 'https://discord.com/api/v8/users/@me/guilds', form: null,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + "pdkykEjIVcvgzdzoc7anS9di68os6W"//access_token_dc
        },
        json: true
    };
    request.get(reqBuild, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            res.status(200).send(build_res(body, sorting_type, admin_only, timer))
        } else {
            if (typeof err != "undefined")
                console.log(err.stack)
            // if (!response.body.retry_after)
            res.status(403).send(response.body)
        }
    })
}


async function refresh_access_token(user_id, db_adm_conn) {
    var lines = await db_adm_conn.query(`
    SELECT T.refresh_token, T.id
    FROM user_data UD
    JOIN access_tokens AT ON AT.user_id = UD.guid
    LEFT JOIN tokens T ON T.id = UD.discord_tokens
    WHERE UD.guid = '` + user_id + `';`)

    var refresh_token = lines.rows[0].refresh_token
    var id = lines.rows[0].id
    var authOptions = {
        url: 'https://discord.com/api/v8/oauth2/token',
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
            var access_token_dc = body.access_token;
            var refresh_token_dc = body.refresh_token;
            var expires_at = Math.round(((new Date()).getTime()) / 1000) + body.expires_in - 2
            var rets = await db_adm_conn.query(`
            UPDATE tokens
            SET (access_token, expires_at) = ('${Helper.escape(access_token_dc)}', ${expires_at})
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

async function add_discord_tokens(access_token, discord_access_token, discord_refresh_token, expires_in, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in
    try {
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at) 
    VALUES ('${Helper.escape(discord_access_token)}', '${Helper.escape(discord_refresh_token)}', '${expires_at}')
    RETURNING id;`)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET discord_tokens = ` + ret.rows[0].id + ` 
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
            url: 'https://discord.com/api/v8/oauth2/token',
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
                var ret = await add_discord_tokens(state, access_token, refresh_token, expires_in, db_adm_conn)
                if (ret.ret_value === true) {
                    var access_token = req.query['state'] || null;
                    if (access_token === null) {
                        res.status(400).send("Missing access_token")
                        return
                    }
                    res.redirect('http://127.0.0.1:8080/github/login?' +
                        querystring.stringify({
                            access_token: access_token
                        }))
                } else {
                    res.status(500).send(ret.line_value)
                }
            } else {
                if (typeof err != "undefined") {
                    console.log(err.stack)
                    res.status(500)
                } else {
                    console.log(response.statusCode)
                    res.status(403).send("Invalid Token")
                }
            }
        });
    }
}

module.exports = { get_access_token, refresh_access_token, create_server, get_server, update_server, delete_server }