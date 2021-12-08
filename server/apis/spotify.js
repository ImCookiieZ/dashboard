const request = require('request');


const client_id = '15628e786638415eb6c9701f2574826b';
const client_secret = "2d85240a25f2487395ef8a8f0987d2c1"
const redirect_uri = 'http://127.0.0.1:8080/spotify/callback';
const Helper = require('../helpServer.js')
const querystring = require('querystring');


async function refresh_access_token(user_id, db_adm_conn) {
    var lines = await db_adm_conn.query(`
    SELECT T.refresh_token, T.id
    FROM user_data UD
    JOIN access_tokens AT ON AT.user_id = UD.guid
    LEFT JOIN tokens T ON T.id = UD.spotify_tokens
    WHERE UD.guid = '` + user_id + `';`)

    var refresh_token = lines.rows[0].refresh_token
    var id = lines.rows[0].id
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
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
            var access_token_spotify = body.access_token;
            var expires_at = Math.round(((new Date()).getTime()) / 1000) + body.expires_in - 2
            var rets = await db_adm_conn.query(`
            UPDATE tokens
            SET (access_token, expires_at) = ('${Helper.escape(access_token_spotify)}', ${expires_at})
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

async function add_spotify_tokens(access_token, spotify_access_token, spotify_refresh_token, expires_in, db_adm_conn) {
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var expires_at = Math.round(((new Date()).getTime() - 2) / 1000) + expires_in

    try {
        var ret = await db_adm_conn.query(`INSERT INTO tokens (access_token, refresh_token, expires_at) 
    VALUES ('${Helper.escape(spotify_access_token)}', '${Helper.escape(spotify_refresh_token)}', '${expires_at}')
    RETURNING id;`)
        var ret2 = await db_adm_conn.query(`
    UPDATE user_data
    SET spotify_tokens = ` + ret.rows[0].id + ` 
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
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, async (error, response, body) => {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token,
                    refresh_token = body.refresh_token,
                    expires_in = body.expires_in;
                var ret = await add_spotify_tokens(state, access_token, refresh_token, expires_in, db_adm_conn)
                if (ret.ret_value === true) {
                    var access_token = req.query['state'] || null;
                    if (access_token === null) {
                        res.status(400).send("Missing access_token")
                        return
                    }
                    res.redirect('http://127.0.0.1:8080/teams/login?' +
                        querystring.stringify({
                            access_token: access_token
                        }))
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

module.exports = { get_access_token, refresh_access_token }