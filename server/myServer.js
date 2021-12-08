
//creating all global variables
const express = require('express')
const app = express()
app.use(express.json())
const port = 80
const Helper = require('./helpServer.js')
const querystring = require('querystring');
var server = require('http').Server(app),
    io = require('socket.io')(server);
const User = require('./user.js')
const WidgetCreation = require("./widgetCreation.js")
const SpotifyHelper = require("./apis/spotify.js")
const RedditHelper = require("./apis/reddit.js")
const DiscordHelper = require("./apis/discord.js")
const GithubHelper = require("./apis/github.js")
const TeamsHelper = require("./apis/teams.js")
const TwitchHelper = require("./apis/twitch.js")



// "Request" library
//connect server to database
//rerunn recursively until database starts
let db_adm_conn = Helper.connect();

//server start prompt

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin, Authorization, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    /*res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );*/
    next();
});

app.get('/about.json', async (req, res) => {
    try {
        await Helper.get_about(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

async function check_expired(req, res, db_adm_conn) {
    var access_token = req.headers.authorization || null
    if (access_token == null)
        return { ret_value: false, line_value: "missing access token" }
    var values = await Helper.check_token(access_token, db_adm_conn)
    if (values.ret_value === false)
        return values
    var user_id = values.line_value.rows[0].user_id
    var tokens = await db_adm_conn.query(`
    SELECT TS.expires_at as spotify, TW.expires_at as twitch, TD.expires_at as discord, TG.expires_at as github, TT.expires_at as teams, TR.expires_at as reddit
    FROM user_data UD
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
        ON TR.id = UD.reddit_tokens
    WHERE UD.guid = '${Helper.escape(user_id)}';`)
    var jetzt = Math.round(((new Date()).getTime() - 2) / 1000)

    if (jetzt > tokens.rows[0].spotify)
        await SpotifyHelper.refresh_access_token(user_id, db_adm_conn)
    if (jetzt > tokens.rows[0].twitch)
        await TwitchHelper.refresh_access_token(user_id, db_adm_conn)
    if (jetzt > tokens.rows[0].discord)
        await DiscordHelper.refresh_access_token(user_id, db_adm_conn)
    if (jetzt > tokens.rows[0].teams)
        await TeamsHelper.refresh_access_token(user_id, db_adm_conn)
    if (jetzt > tokens.rows[0].reddit)
        await RedditHelper.refresh_access_token(user_id, db_adm_conn)
    return { ret_value: true, ret_value: "" }
}


//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/authenticate', async (req, res) => {
    var access_token = req.query['access_token'] || null;
    if (access_token === null) {
        res.status(400).send("Missing access_token")
        return
    }
    res.redirect('http://127.0.0.1:8080/discord/login?' +
        querystring.stringify({
            access_token: access_token
        }))
})

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.post('/user', async (req, res) => {
    try {
        await User.create_user(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }

})


// app.post('/user/access', async (req, res) => {
//     try {
//         User.give_access(req, res, db_adm_conn)
//     } catch (err) {
//         console.log(err.stack)
//         res.status(500).send("Internal Server Error")
//     }
// })

// app.post('/user/subreddit', async (req, res) => {
//     try {
//         WidgetCreation.create_subreddit(req, res, db_adm_conn)
//     } catch (err) {
//         console.log(err.stack)
//         res.status(500).send("Internal Server Error")
//     }
// })

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/user/adm', async (req, res) => {
    try {
        await User.get_advanced_user(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/user', async (req, res) => {
    try {
        await User.get_basic_user(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/user/widgets', async (req, res) => {
    try {
        await User.get_widgets(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/login', async (req, res) => {
    try {
        // console.log(req)
        await User.get_login(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/', async (req, res) => {
    res.status(300).send("api makes no sence like that")
})

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.delete('/user', async (req, res) => {

    try {
        await User.delete_user(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/teams/login', (req, res) => {


    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'Channel.ReadBasic.All Chat.Read ChatMessage.Read Mail.Read User.Read openid offline_access';
    res.redirect('https://login.microsoftonline.com/901cb4ca-b862-4029-9306-e5cd0f6d9f86/oauth2/v2.0/authorize?' +
        querystring.stringify({
            client_id: '45d1c53d-2175-4c44-b3da-9c1e08e8a937',
            response_type: 'code',
            redirect_uri: 'http://localhost:8080/teams/callback',
            response_mode: 'query',
            scope: scope,
            state: state,
            prompt: 'consent'
        }))
})

app.get('/teams/refresh', async (req, res) => {
    try {
        await TeamsHelper.refresh_access_token("f0643a12-88e2-4fc7-9ad9-ba7e13bd7a36", db_adm_conn)
        res.send("nice")
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/teams/callback', async (req, res) => {
    try {
        await TeamsHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/teams/widgets/messages/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await TeamsHelper.get_messages(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.post('/teams/widgets/messages', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await TeamsHelper.create_message_widgets(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.put('/teams/widgets/messages/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await TeamsHelper.update_messages(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/teams/widgets/messages/:id', async (req, res) => {
    try {
        await TeamsHelper.delete_messages(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});


//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/github/login', (req, res) => {

    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'repo admin:public_key notifications user delete_repo workflow';
    res.redirect('https://github.com/login/oauth/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: 'dadc9341510fc3d05467',
            scope: scope,
            redirect_uri: 'http://127.0.0.1:8080/github/callback',
            state: state
        }))
})

app.get('/github/callback', async (req, res) => {
    try {
        await GithubHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.post('/github/widgets/action', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await GithubHelper.create_workflow_actions(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/github/widgets/action/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await GithubHelper.get_workflow_actions(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.put('/github/widgets/action/:id', async (req, res) => {
    try {
        await GithubHelper.update_action(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/github/widgets/action/:id', async (req, res) => {
    try {
        await GithubHelper.delete_action(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/discord/login', (req, res) => {

    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'email guilds identify connections messages.read' //' rpc';
    res.redirect('https://discord.com/api/oauth2/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: '913921745835159622',
            scope: scope,
            redirect_uri: 'http://127.0.0.1:8080/discord/callback',
            state: state,
            prompt: "consent"
        }))
})


app.get('/discord/callback', async (req, res) => {
    try {
        await DiscordHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/discord/refresh', async (req, res) => {
    try {
        await DiscordHelper.refresh_access_token("f0643a12-88e2-4fc7-9ad9-ba7e13bd7a36", db_adm_conn)
        res.send("nice")
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/discord/widgets/server/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await DiscordHelper.get_server(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.post('/discord/widgets/server/', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await DiscordHelper.create_server(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.put('/discord/widgets/server/:id', async (req, res) => {
    try {
        await DiscordHelper.update_server(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/discord/widgets/server/:id', async (req, res) => {
    try {
        await DiscordHelper.delete_server(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});


//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/spotify/login', (req, res) => {


    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'user-read-private user-read-email';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: '15628e786638415eb6c9701f2574826b',
            scope: scope,
            redirect_uri: 'http://127.0.0.1:8080/spotify/callback',
            state: state
        }))
})


app.get('/spotify/callback', async (req, res) => {
    try {
        await SpotifyHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/spotify/refresh', async (req, res) => {
    try {
        await SpotifyHelper.refresh_access_token("f0643a12-88e2-4fc7-9ad9-ba7e13bd7a36", db_adm_conn)
        res.send("nice")
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/reddit/login', (req, res) => {

    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'creddits modcontributors modmail modconfig subscribe structuredstyles vote wikiedit mysubreddits submit modlog modposts modflair save modothers read privatemessages report identity livemanage account modtraffic wikiread edit modwiki modself history flair'

    res.redirect('https://www.reddit.com/api/v1/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: 'k5ndHm7BU7tnwYMQYp1gCg',
            scope: scope,
            redirect_uri: 'http://127.0.0.1:8080/reddit/callback',
            state: state,
            duration: "permanent"
        }))
})

app.get('/reddit/callback', async (req, res) => {
    try {
        await RedditHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/reddit/refresh', async (req, res) => {
    try {
        await RedditHelper.refresh_access_token("f0643a12-88e2-4fc7-9ad9-ba7e13bd7a36", db_adm_conn)
        res.send("nice")
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.post('/reddit/widgets/subreddit', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await RedditHelper.create_subreddit(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/reddit/widgets/subreddit/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await RedditHelper.get_subreddit(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.put('/reddit/widgets/subreddit/:id', async (req, res) => {
    try {
        await RedditHelper.update_subreddit(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/reddit/widgets/subreddit/:id', async (req, res) => {
    try {
        await RedditHelper.delete_subreddit(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.post('/reddit/widgets/feed/', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await RedditHelper.create_feed(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.get('/reddit/widgets/feed/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await RedditHelper.get_feed(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
})

app.put('/reddit/widgets/feed/:id', async (req, res) => {
    try {
        await RedditHelper.update_feed(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/reddit/widgets/feed/:id', async (req, res) => {
    try {
        await RedditHelper.delete_feed(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------

app.get('/twitch/login', (req, res) => {

    var state = req.query['access_token'] || null;
    if (state === null) {
        res.status(400).send("Missing access_token")
    }
    var scope = 'user_read user:read:follows'
    res.redirect('https://id.twitch.tv/oauth2/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: '30o6vog6b7nigqnnxyo6iajz70cvnu',
            scope: scope,
            redirect_uri: 'http://localhost:8080/twitch/callback',
            state: state
        }))
})

app.get('/twitch/callback', async (req, res) => {
    try {
        await TwitchHelper.get_access_token(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.get('/twitch/widgets/channels/:id', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await TwitchHelper.get_live_channels(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.post('/twitch/widgets/channels', async (req, res) => {
    try {
        var values = await check_expired(req, res, db_adm_conn)
        if (values.ret_value === false)
            res.status(400).send(values.line_value)
        else
            await TwitchHelper.create_message_widgets(req, res, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.put('/twitch/widgets/channels/:id', async (req, res) => {
    try {
        await TwitchHelper.update_channels(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

app.delete('/twitch/widgets/channels/:id', async (req, res) => {
    try {
        await TwitchHelper.delete_channels(req, res, req.params.id, db_adm_conn)
    } catch (err) {
        console.log(err.stack)
        res.status(500).send("Internal Server Error")
    }
});

//sockets

io.set('transports', ['polling']);
io.sockets.on('connection', function (socket) {
    print("conncected")

    socket.emit('message', { text: 'Welcome!' });

    socket.on('subscribe', function (data) {
        socket.join(data.channel);
    });
});