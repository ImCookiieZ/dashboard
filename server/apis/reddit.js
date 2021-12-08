const request = require('request');
const Axios = require('axios')
const client_id = 'k5ndHm7BU7tnwYMQYp1gCg';
const client_secret = "K7wrHIqazLhnoBj3KIv5DmF49DQhkg"
const redirect_uri = 'http://127.0.0.1:8080/reddit/callback';
const Helper = require('../helpServer.js');
const querystring = require('querystring');


async function update_subreddit(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var subreddit = req.body['subreddit']
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_subreddit", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var sort_id = await Helper.get_sort_id(sorting, db_adm_conn)
    if (sort_id.ret_value == false) {
        res.status(400).send("Invalid Sorting")
    }
    var re = await db_adm_conn.query(`
    UPDATE config_subreddit SET (sort_id, subreddit) = (${sort_id.line_value.rows[0].id}, '${subreddit}')
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_subreddit(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_subreddit", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_subreddit WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function update_feed(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var sorting = req.body['sorting_type']
    var timer = req.body['timer']

    if (Helper.test_undefined([access_token, sorting, timer]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_feed", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var sort_id = await Helper.get_sort_id(sorting, db_adm_conn)
    var sort_id = await Helper.get_sort_id(sorting, db_adm_conn)
    if (sort_id.ret_value == false) {
        res.status(400).send("Invalid Sorting")
    }
    var re = await db_adm_conn.query(`
    UPDATE config_feed SET sort_id = ${sort_id.line_value.rows[0].id}
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_feed(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_feed", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_feed WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function get_reddit_token(access_token, db_adm_conn) {

    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        return values
    }
    var ret = await db_adm_conn.query(`
    SELECT T.access_token
    FROM user_data UD
    LEFT JOIN tokens T ON T.id = UD.reddit_tokens
    WHERE UD.guid = '${Helper.escape(values.line_value.rows[0].user_id)}'`)
    return { ret_value: true, line_value: ret.rows[0].access_token }
}

async function create_subreddit(req, res, db_adm_conn) {
    var subreddit = req.body['subreddit']
    var sort = req.body['sorting_type']
    var timer = req.body['timer']
    var token = req.headers.authorization
    if (Helper.test_undefined([token, subreddit, sort, timer]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Error: Bad request")
        return
    }

    var values = await Helper.check_token(token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(401).send("Invalid Token")
        return
    }

    var base = await Helper.create_base_config(values.line_value.rows[0].user_id, "reddit", timer, db_adm_conn)
    var sort_id = await Helper.get_sort_id(sort, db_adm_conn)
    if (base.ret_value === false || sort_id.ret_value === false) {
        if (base.ret_value === false)
            console.log(base.line_value)
        if (sort_id.ret_value === false)
            console.log(sort_id.line_value)
        res.status(500).send("Internal Server Error")
        return
    }

    let base_id = base.line_value.rows[0].id
    try {
        var sub_id = await db_adm_conn.query(`
    INSERT INTO config_subreddit
    (subreddit, sort_id, base_config_id)
    VALUES
    ('${Helper.escape(subreddit)}', ${sort_id.line_value.rows[0].id}, ${base_id}) RETURNING id;`)
        res.send({ config_id: sub_id.rows[0].id })
    }
    catch (err) {
        res.status(500).send("Internal Server Error:" + err.stack)
    }
}

function build_res(data, max, sorting_name, timer) {
    values = []
    for (var i = 0; i < max; i++) {
        var tmp = {
            name: data[i]['data']['name'],
            subreddit: data[i]['data']['subreddit_name_prefixed'],
            title: data[i]['data']['title'],
            text: data[i]['data']['selftext'],
            votes: data[i]['data']['ups'],
            author: data[i]['data']['author']
        }
        if (tmp.text != null && tmp.text.length != 0)
            values.push(tmp)
    }
    ret = {
        timer: timer,
        sorting_type: sorting_name,
        values: values
    }
    return ret
}

async function get_subreddit(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token, id]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await get_reddit_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send(values.line_value)
        return
    }
    if (await Helper.check_token_for_id(access_token, id, "config_subreddit", db_adm_conn) !== 1) {
        res.status(403).send("Invalid Access token")
        return
    }

    var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_subreddit CS ON CS.base_config_id = BC.id
    JOIN sorting S ON S.id = CS.sort_id
    WHERE CS.id = ${id}`)

    var subreddit = db_res.rows[0].subreddit
    var sorting_name = db_res.rows[0].sorting_name
    var timer = db_res.rows[0].timer_seconds
    var reqBuild = {
        url: `https://oauth.reddit.com/r/${subreddit}/${sorting_name}/.json`,
        headers: {
            'Authorization': 'Bearer ' + values.line_value,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'epitech dashboard project'
        }
    }
    request.get(reqBuild, (err, response, body) => {
        if (!err && response.statusCode === 200) {
            var bod = JSON.parse(body)
            res.send(build_res(bod['data']['children'], bod['data']['dist'], sorting_name, timer))
        } else {
            if (typeof err !== "undefined" && err != null) {
                console.log(err.stack)
            } else {
                console.log(response.statusCode)
                console.log(response.statusMessage)
                console.log("Invalid Token")
                res.status(401).send("Invalid Token")
            }
        }
    })
}

async function create_feed(req, res, db_adm_conn) {
    var sort = req.body['sorting_type']
    var timer = req.body['timer']
    var token = req.headers.authorization

    if (Helper.test_undefined([token, sort, timer]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Error: Bad request")
        return
    }

    var values = await Helper.check_token(token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(401).send("Invalid Token")
        return
    }

    var base = await Helper.create_base_config(values.line_value.rows[0].user_id, "reddit", timer, db_adm_conn)
    var sort_id = await Helper.get_sort_id(sort, db_adm_conn)
    if (base.ret_value === false || sort_id.ret_value === false) {
        if (base.ret_value === false)
            console.log(base.line_value)
        if (sort_id.ret_value === false)
            console.log(sort_id.line_value)
        res.status(500).send("Internal Server Error")
        return
    }

    let base_id = base.line_value.rows[0].id
    try {
        var sub_id = await db_adm_conn.query(`
    INSERT INTO config_feed
    (sort_id, base_config_id)
    VALUES
    (${sort_id.line_value.rows[0].id}, ${base_id}) RETURNING id;`)
        res.send({ config_id: sub_id.rows[0].id })
    }
    catch (err) {
        res.status(500).send("Internal Server Error:" + err.stack)
    }
}

async function get_feed(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token, id]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await get_reddit_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send(values.line_value)
        return
    }
    if (await Helper.check_token_for_id(access_token, id, "config_feed", db_adm_conn) !== 1) {
        res.status(403).send("Invalid Access token")
        return
    }
    var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_feed CS ON CS.base_config_id = BC.id
    JOIN sorting S ON S.id = CS.sort_id
    WHERE CS.id = ${id}`)

    var sorting_name = db_res.rows[0].sorting_name
    var timer = db_res.rows[0].timer_seconds
    var reqBuild = {
        url: `https://oauth.reddit.com/${sorting_name}/.json`,
        headers: {
            'Authorization': 'Bearer ' + values.line_value,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'epitech dashboard project'
        }
    }
    request.get(reqBuild, (err, response, body) => {
        if (!err && response.statusCode === 200) {
            var bod = JSON.parse(body)
            res.send(build_res(bod['data']['children'], bod['data']['dist'], sorting_name, timer))
        } else {
            if (typeof err !== "undefined" && err != null) {
                console.log(err.stack)
            } else {
                console.log(response.statusCode)
                console.log(response.statusMessage)
                console.log("Invalid Token")
                res.status(401).send("Invalid Token")
            }
        }
    })
}

//not working!!!!! if nessassary look at get access_token
async function refresh_access_token(user_id, db_adm_conn) {
    var lines = await db_adm_conn.query(`
    SELECT T.refresh_token, T.id
    FROM user_data UD
    JOIN access_tokens AT ON AT.user_id = UD.guid
    LEFT JOIN tokens T ON T.id = UD.reddit_tokens
    WHERE UD.guid = '` + Helper.escape(user_id) + `';`)

    var refresh_token = lines.rows[0].refresh_token
    var id = lines.rows[0].id
    var authOptions = {
        url: 'https://www.reddit.com/api/v1/access_token',
        form: {
            refresh_token: refresh_token,
            grant_type: 'refresh_token'
        },
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };
    request.post(authOptions, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var access_token_reddit = body.access_token;
            var refresh_token_redit = body.refresh_token;
            var expires_at = Math.round(((new Date()).getTime()) / 1000) + body.expires_in - 2
            var rets = await db_adm_conn.query(`
            UPDATE tokens
            SET (access_token, expires_at) = ('${Helper.escape(access_token_reddit)}', ${expires_at})
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

async function add_reddit_tokens(access_token, reddit_access_token, reddit_refresh_token, expires_in, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in

    try {
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at)
    VALUES ('${Helper.escape(reddit_access_token)}', '${Helper.escape(reddit_refresh_token)}', '${expires_at}')
    RETURNING id;`)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET reddit_tokens = ` + ret.rows[0].id + `
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
            url: 'https://www.reddit.com/api/v1/access_token',
            form: {
                'code': code,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            },
            headers: {
                'Authorization': 'basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'epitech dashboard project'
            }
        };

        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var bod = JSON.parse(response.body)
                var access_token = bod.access_token,
                    refresh_token = bod.refresh_token,
                    expires_in = bod.expires_in;
                var ret = await add_reddit_tokens(state, access_token, refresh_token, expires_in, db_adm_conn)
                if (ret.ret_value === true) {
                    var access_token = req.query['state'] || null;
                    if (access_token === null) {
                        res.status(400).send("Missing access_token")
                        return
                    }
                    res.redirect('http://127.0.0.1:8080/spotify/login?' +
                        querystring.stringify({
                            access_token: access_token
                        }))
                } else {
                    console.log(re.line_value)
                    res.status(500).send(ret.line_value)
                }
            } else {
                if (!(!response.body))
                    console.log(response.body)
                console.log(response.statusCode)
                res.status(403).send("Invalid Token")
            }
        });
    }
}

module.exports = { get_access_token, refresh_access_token, create_subreddit, get_subreddit, create_feed, get_feed, update_subreddit, delete_subreddit, update_feed, delete_feed }