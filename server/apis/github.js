const request = require('request');


const client_id = 'dadc9341510fc3d05467';
const client_secret = "8a28a862a28b166472c69381c7057d7318464628"
const redirect_uri = 'http://127.0.0.1:8080/github/callback';
const Helper = require('../helpServer.js')
const querystring = require('querystring');

async function update_action(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization
    var owner = req.body['owner']
    var timer = req.body['timer']
    var repo = req.body['repo']

    if (Helper.test_undefined([access_token, owner, timer, repo]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_actions", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`
    UPDATE config_actions SET (owner, repo) = ('${owner}', '${repo}')
    WHERE id = ${id}
    RETURNING base_config_id`)
    var re2 = await db_adm_conn.query(`
    UPDATE base_config SET timer_seconds = ${timer}
    WHERE id = ${re.rows[0].base_config_id}
    RETURNING id`)
    res.send({ result: "done" })
}

async function delete_action(req, res, id, db_adm_conn) {
    var access_token = req.headers.authorization

    if (Helper.test_undefined([access_token]) === false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await Helper.check_token_for_id(access_token, id, "config_actions", db_adm_conn)
    if (values !== 1) {
        res.status(403).send("Invalid Token")
        return
    }
    var re = await db_adm_conn.query(`DELETE FROM config_actions WHERE id = ${id}`)
    res.send({ result: "done" })
}

async function get_github_token(access_token, db_adm_conn) {

    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        return values
    }
    var ret = await db_adm_conn.query(`
    SELECT T.access_token
    FROM user_data UD
    LEFT JOIN tokens T ON T.id = UD.github_tokens
    WHERE UD.guid = '${Helper.escape(values.line_value.rows[0].user_id)}'`)
    return { ret_value: true, line_value: ret.rows[0].access_token }
}

function build_res(runs, owner, repo, timer) {
    {
        var ar = []
        for (var i = 0; i < runs.length; i++) {
            var tmp = {
                name: runs[i]['name'],
                event: runs[i]['event'],
                conclusion: runs[i]['conclusion'],
                commit: runs[i]['head_commit'],
                time: runs[i]['run_started_at']
            }
            ar.push(tmp)
        }
        var ob = {
            owner: owner,
            repo: repo,
            timer: timer,
            actions: ar
        }
        return ob

    }
}

async function create_action_config(access_token, owner, repo, timer, db_adm_conn) {
    var value = await Helper.check_token(access_token, db_adm_conn)
    if (value.ret_value === false) {
        return { ret_value: 403, line_value: value.line_value }
    }
    var user_id = value.line_value.rows[0].user_id
    var values = await Helper.create_base_config(user_id, "github", timer, db_adm_conn)
    if (values.ret_value === false)
        return { ret_value: 500, line_value: values.line_value }
    var re = await db_adm_conn.query(`
    INSERT INTO config_actions (owner, repo, base_config_id)
    VALUES ('${Helper.escape(owner)}', '${Helper.escape(repo)}', ${values.line_value.rows[0].id})
    RETURNING id`)
    return { ret_value: 200, line_value: re.rows[0].id }
}

async function create_workflow_actions(req, res, db_adm_conn) {
    let access_token = req.headers.authorization
    let owner = req.body['owner']
    let repo = req.body['repo']
    let timer = req.body['timer']

    if (Helper.test_undefined([access_token, owner, repo, timer]) === false || Number.isInteger(timer) == false) {
        res.status(400).send("Bad Request")
        return
    }
    var values = await get_github_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send(values.line_value)
        return
    }
    var access_token_github = values.line_value
    console.log(values)
    var reqBuild = {
        url: `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
        headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${access_token_github}`,
            'User-Agent': 'CookiieZ dashboard Api usage'
        },
        json: true
    };
    request.get(reqBuild, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            var t = await create_action_config(access_token, owner, repo, timer, db_adm_conn)
            res.status(t.ret_value).send({ config_id: t.line_value })
        } else {
            if (typeof err != "undefined")
                console.log(err.stack)
            res.status(403).send(response.body)
        }
    })
}

async function get_workflow_actions(req, res, id, db_adm_conn) {
    let access_token = req.headers.authorization

    if (Helper.test_undefined([access_token, id]) === false) {
        res.status(400).send("Bad Request")
        return
    }

    if (await Helper.check_token_for_id(access_token, id, "config_actions", db_adm_conn) !== 1) {
        res.status(403).send("Invalid Access token")
        return
    }
    var values = await get_github_token(access_token, db_adm_conn)
    if (values.ret_value === false) {
        res.status(403).send(values.line_value)
        return
    }

    var db_res = await db_adm_conn.query(`
    SELECT *
    FROM base_config BC
    JOIN config_actions AC ON AC.base_config_id = BC.id
    WHERE AC.id = ${id}`)

    var owner = db_res.rows[0].owner
    var repo = db_res.rows[0].repo
    var timer = db_res.rows[0].timer_seconds

    var access_token_github = values.line_value
    var reqBuild = {
        url: `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
        headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${access_token_github}`,
            'User-Agent': 'CookiieZ dashboard Api usage'
        },
        json: true
    };
    request.get(reqBuild, async (error, response, body) => {
        if (!error && response.statusCode === 200) {
            res.status(200).send(build_res(response.body.workflow_runs, owner, repo, timer))
        } else {
            if (typeof err != "undefined")
                console.log(err.stack)
            res.status(403).send(response.body)
        }
    })
}

async function add_github_tokens(access_token, github_access_token, github_refresh_token, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) * 2

    try {
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at) 
    VALUES ('${Helper.escape(github_access_token)}', '${Helper.escape(github_refresh_token)}', '${expires_at}') 
    RETURNING id; `)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET github_tokens = ${ret.rows[0].id} 
    WHERE guid = '${Helper.escape(user_id)}'; `);
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
            url: 'https://github.com/login/oauth/access_token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                client_id: client_id,
                client_secret: client_secret
            },
            json: true
        };

        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token,
                    refresh_token = body.access_token;
                var ret = await add_github_tokens(state, access_token, refresh_token, db_adm_conn)
                if (ret.ret_value === true) {
                    var access_token = req.query['state'] || null;
                    if (access_token === null) {
                        res.status(400).send("Missing access_token")
                        return
                    }
                    res.redirect('http://127.0.0.1:8080/reddit/login?' +
                        querystring.stringify({
                            access_token: access_token
                        }))
                } else {
                    console.log(re.line_value)
                    res.status(500).send(ret.line_value)
                }
            } else {
                if (typeof err != "undefined")
                    console.log(err.stack)
                res.status(403).send(response.statusMessage)
            }
        });
    }
}

module.exports = { get_access_token, create_workflow_actions, get_workflow_actions, update_action, delete_action }